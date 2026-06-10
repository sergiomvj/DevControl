/**
 * Story #9 — GitHub → Supabase Sync Job
 * FBR Dev Control Dashboard
 *
 * Authenticates via GitHub App JWT, fetches open issues from configured repos,
 * maps labels to structured fields, and upserts into Supabase tables.
 */

import { SignJWT, importPKCS8 } from 'jose';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GitHubLabel {
  name: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  labels: GitHubLabel[];
  state: string;
}

interface MappedIssue {
  number: number;
  title: string;
  body: string;
  status: string;
  project: string;
  priority: string;
  qa_returns: number;
  role: string;
  next_step: string;
  repo: string;
  color: string;
  synced_at: string;
}

interface KanbanRow {
  column_name: string;
  issue_number: number;
  title: string;
  description: string;
  project: string;
  synced_at: string;
}

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

// ---------------------------------------------------------------------------
// GitHub App authentication
// ---------------------------------------------------------------------------

async function getInstallationToken(): Promise<string> {
  const appId = getEnv('GITHUB_APP_ID');
  const installationId = getEnv('GITHUB_INSTALLATION_ID');
  // The private key may be stored with literal \n or real newlines
  const rawKey = getEnv('GITHUB_APP_PRIVATE_KEY').replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);

  const privateKey = await importPKCS8(rawKey, 'RS256');

  const jwt = await new SignJWT({ iss: appId })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 600)
    .sign(privateKey);

  const tokenRes = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`GitHub installation token failed (${tokenRes.status}): ${err}`);
  }

  const data = (await tokenRes.json()) as { token: string };
  return data.token;
}

// ---------------------------------------------------------------------------
// Issue fetching
// ---------------------------------------------------------------------------

const REPOS = ['sergiomvj/aiox-dev-harness', 'sergiomvj/DevControl'];

async function fetchOpenIssues(token: string, repo: string): Promise<GitHubIssue[]> {
  const issues: GitHubIssue[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/issues?state=open&per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    if (!res.ok) {
      console.warn(`fetchOpenIssues ${repo} page ${page} → ${res.status}`);
      break;
    }

    const batch = (await res.json()) as GitHubIssue[];
    if (batch.length === 0) break;

    // GitHub returns PRs in issues endpoint; filter them out
    issues.push(...batch.filter((i) => !(i as any).pull_request));
    if (batch.length < 100) break;
    page++;
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Label mapping
// ---------------------------------------------------------------------------

function mapLabels(issue: GitHubIssue, repo: string): MappedIssue {
  const labelNames = issue.labels.map((l) => l.name);

  let status = '';
  let priority = '';
  let project = '';
  let qa_returns = 0;
  let role = '';
  let next_step = '';

  for (const label of labelNames) {
    if (label.startsWith('status:')) {
      status = label.replace('status:', '').trim();
    } else if (label === 'priority:p0' || label === 'priority:p1' || label === 'priority:p2') {
      priority = label.replace('priority:', '').trim();
    } else if (label.startsWith('project:')) {
      project = label.replace('project:', '').trim();
    } else if (label === 'qa-returns:1') {
      qa_returns = 1;
    } else if (label === 'qa-returns:2') {
      qa_returns = 2;
    } else if (label.startsWith('role:')) {
      role = label.replace('role:', '').trim();
    } else if (label.startsWith('next-step:')) {
      next_step = label.replace('next-step:', '').trim();
    }
  }

  // Determine color
  let color: string;
  if (status === 'human-required' || status === 'blocked') {
    color = 'blocked';
  } else if (qa_returns > 0) {
    color = 'risk';
  } else {
    color = 'normal';
  }

  return {
    number: issue.number,
    title: issue.title,
    body: issue.body ?? '',
    status,
    project,
    priority,
    qa_returns,
    role,
    next_step,
    repo,
    color,
    synced_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

async function supabaseRequest(
  supabaseUrl: string,
  serviceRoleKey: string,
  path: string,
  method: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...(extraHeaders ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function upsertIssues(
  supabaseUrl: string,
  serviceRoleKey: string,
  issues: MappedIssue[],
): Promise<void> {
  if (issues.length === 0) return;

  // We upsert by deleting existing rows for this repo+number combo then re-inserting.
  // Alternatively use ON CONFLICT — but without a UNIQUE constraint we do DELETE+INSERT.
  for (const issue of issues) {
    // Delete existing row for this repo/number
    await supabaseRequest(
      supabaseUrl,
      serviceRoleKey,
      `dashboard_issues?repo=eq.${encodeURIComponent(issue.repo)}&number=eq.${issue.number}`,
      'DELETE',
    );
  }

  // Bulk insert
  const res = await supabaseRequest(
    supabaseUrl,
    serviceRoleKey,
    'dashboard_issues',
    'POST',
    issues.map(({ color, ...rest }) => rest), // color not a column in dashboard_issues
    { Prefer: 'resolution=merge-duplicates,return=minimal' },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error(`upsertIssues failed (${res.status}): ${err}`);
  }
}

/** Map status → kanban column */
function statusToColumn(status: string): string {
  switch (status) {
    case 'todo':
    case 'backlog':
      return 'To Do';
    case 'in-progress':
    case 'in_progress':
      return 'In Progress';
    case 'blocked':
    case 'human-required':
      return 'Blocked';
    case 'review':
    case 'qa':
      return 'Review / QA';
    case 'done':
    case 'closed':
      return 'Done';
    default:
      return 'To Do';
  }
}

async function upsertKanban(
  supabaseUrl: string,
  serviceRoleKey: string,
  issues: MappedIssue[],
): Promise<void> {
  if (issues.length === 0) return;

  const rows: KanbanRow[] = issues.map((issue) => ({
    column_name: statusToColumn(issue.status),
    issue_number: issue.number,
    title: issue.title,
    description: issue.body.substring(0, 500),
    project: issue.project,
    synced_at: new Date().toISOString(),
  }));

  // Delete existing kanban rows for these issue numbers
  for (const issue of issues) {
    await supabaseRequest(
      supabaseUrl,
      serviceRoleKey,
      `dashboard_kanban?issue_number=eq.${issue.number}`,
      'DELETE',
    );
  }

  const res = await supabaseRequest(
    supabaseUrl,
    serviceRoleKey,
    'dashboard_kanban',
    'POST',
    rows,
    { Prefer: 'resolution=merge-duplicates,return=minimal' },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error(`upsertKanban failed (${res.status}): ${err}`);
  }
}

async function insertKpi(
  supabaseUrl: string,
  serviceRoleKey: string,
  allIssues: MappedIssue[],
): Promise<void> {
  const projects = new Set(allIssues.map((i) => i.project).filter(Boolean));
  const active_projects = projects.size;
  const blockers = allIssues.filter(
    (i) => i.status === 'blocked' || i.status === 'human-required',
  ).length;
  const human_required = allIssues.filter((i) => i.status === 'human-required').length;
  const avg_sprint_pct = 0; // Not derivable from issues alone

  const kpi = {
    ts: new Date().toISOString(),
    active_projects,
    avg_sprint_pct,
    blockers,
    human_required,
  };

  const res = await supabaseRequest(supabaseUrl, serviceRoleKey, 'dashboard_kpis', 'POST', kpi);

  if (!res.ok) {
    const err = await res.text();
    console.error(`insertKpi failed (${res.status}): ${err}`);
  }
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

export async function syncGitHub(): Promise<{
  ok: boolean;
  synced_at: string;
  issues_count: number;
  error?: string;
}> {
  const synced_at = new Date().toISOString();

  try {
    const supabaseUrl = getEnv('SUPABASE_URL');
    const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

    // 1. Get GitHub installation token
    const token = await getInstallationToken();

    // 2. Fetch issues from all repos
    const allMapped: MappedIssue[] = [];

    for (const repo of REPOS) {
      const rawIssues = await fetchOpenIssues(token, repo);
      const mapped = rawIssues.map((issue) => mapLabels(issue, repo));
      allMapped.push(...mapped);
      console.log(`[github-sync] ${repo}: fetched ${rawIssues.length} issues`);
    }

    // 3. Upsert into Supabase
    await upsertIssues(supabaseUrl, serviceRoleKey, allMapped);
    await upsertKanban(supabaseUrl, serviceRoleKey, allMapped);
    await insertKpi(supabaseUrl, serviceRoleKey, allMapped);

    console.log(`[github-sync] done — ${allMapped.length} issues synced at ${synced_at}`);

    return { ok: true, synced_at, issues_count: allMapped.length };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[github-sync] error:', message);
    return { ok: false, synced_at, issues_count: 0, error: message };
  }
}
