import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------
const cache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = Number(process.env.DASHBOARD_CACHE_TTL_MS ?? 30_000)

function getCached(key: string): any | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: any) {
  cache.set(key, { data, ts: Date.now() })
}

// ---------------------------------------------------------------------------
// Types (minimal)
// ---------------------------------------------------------------------------
interface Project {
  id: string
  name: string
  status: string
  sprint_pct: number
  priority: string
  sprint_name?: string
  [key: string]: any
}

interface Issue {
  id: string
  title: string
  status: string
  qa_returns: number
  project_id?: string
  priority?: string
  [key: string]: any
}

interface KanbanCard {
  id: string
  column_name: string
  title: string
  [key: string]: any
}

interface KpiRow {
  active_projects: number
  avg_sprint_pct: number
  blockers: number
  human_required: number
  ts: string
  [key: string]: any
}

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------
type FilterType = 'human_required' | 'qa_loop' | 'po_review' | 'p0p1' | 'sprint' | ''

function applyFilter(
  projects: Project[],
  issues: Issue[],
  filter: FilterType
): { projects: Project[]; issues: Issue[] } {
  switch (filter) {
    case 'human_required':
      issues = issues.filter((i) => i.status === 'human-required')
      {
        const ids = new Set(issues.map((i) => i.project_id).filter(Boolean))
        projects = projects.filter((p) => ids.has(p.id))
      }
      break

    case 'qa_loop':
      issues = issues.filter((i) => Number(i.qa_returns) > 0)
      {
        const ids = new Set(issues.map((i) => i.project_id).filter(Boolean))
        projects = projects.filter((p) => ids.has(p.id))
      }
      break

    case 'po_review':
      projects = projects.filter((p) => p.status === 'po_review' || p.status === 'po-review')
      {
        const ids = new Set(projects.map((p) => p.id))
        issues = issues.filter((i) => ids.has(i.project_id ?? ''))
      }
      break

    case 'p0p1':
      issues = issues.filter((i) => i.priority === 'p0' || i.priority === 'p1')
      projects = projects.filter(
        (p) => p.priority === 'p0' || p.priority === 'p1'
      )
      break

    case 'sprint':
      projects = projects.filter((p) => p.sprint_name != null && p.sprint_name !== '')
      {
        const ids = new Set(projects.map((p) => p.id))
        issues = issues.filter((i) => ids.has(i.project_id ?? ''))
      }
      break

    default:
      break
  }

  return { projects, issues }
}

// ---------------------------------------------------------------------------
// GET /api/dashboard
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const filter = (searchParams.get('filter') ?? '') as FilterType
  const cacheKey = `dashboard:${filter}`

  // ── Fetch from Supabase ──────────────────────────────────────────────────
  try {
    const [projectsRes, issuesRes, kpisRes, kanbanRes] = await Promise.all([
      supabase.from('dashboard_projects').select('*'),
      supabase.from('dashboard_issues').select('*'),
      supabase
        .from('dashboard_kpis')
        .select('*')
        .order('ts', { ascending: false })
        .limit(1),
      supabase.from('dashboard_kanban').select('*'),
    ])

    // Surface any Supabase errors
    const errs = [projectsRes.error, issuesRes.error, kpisRes.error, kanbanRes.error].filter(
      Boolean
    )
    if (errs.length > 0) {
      throw new Error(errs.map((e) => e!.message).join('; '))
    }

    const rawProjects: Project[] = (projectsRes.data ?? []) as Project[]
    const rawIssues: Issue[]     = (issuesRes.data   ?? []) as Issue[]
    const kpiRow: KpiRow | null  = (kpisRes.data?.[0] ?? null) as KpiRow | null
    const kanbanRows: KanbanCard[] = (kanbanRes.data ?? []) as KanbanCard[]

    // ── Sidebar (computed before filter) ────────────────────────────────────
    const sidebarHumanRequired = rawIssues.filter((i) => i.status === 'human-required')
    const sidebarQaLoop        = rawIssues.filter((i) => Number(i.qa_returns) > 0)

    // ── Apply filter ─────────────────────────────────────────────────────────
    const { projects, issues } = applyFilter(rawProjects, rawIssues, filter)

    // ── Kanban grouping ──────────────────────────────────────────────────────
    const kanban: Record<string, KanbanCard[]> = {
      prd:       [],
      devmaster: [],
      dev:       [],
      qa:        [],
      human:     [],
    }
    for (const card of kanbanRows) {
      const col = card.column_name?.toLowerCase()
      if (col && col in kanban) {
        kanban[col].push(card)
      }
    }

    // ── KPIs (fallback to computed values if no kpi row) ────────────────────
    const activeProjects =
      kpiRow?.active_projects ??
      rawProjects.filter((p) => p.status !== 'done' && p.status !== 'archived').length

    const avgSprintPct =
      kpiRow?.avg_sprint_pct ??
      (rawProjects.length > 0
        ? Math.round(
            rawProjects.reduce((sum, p) => sum + (Number(p.sprint_pct) || 0), 0) /
              rawProjects.length
          )
        : 0)

    const blockers =
      kpiRow?.blockers ??
      rawIssues.filter((i) => i.status === 'blocked' || i.priority === 'p0').length

    const humanRequired =
      kpiRow?.human_required ?? sidebarHumanRequired.length

    const payload = {
      kpis: {
        active_projects: activeProjects,
        avg_sprint_pct:  avgSprintPct,
        blockers:        blockers,
        human_required:  humanRequired,
      },
      projects,
      issues,
      kanban,
      sidebar: {
        human_required: sidebarHumanRequired,
        qa_loop:        sidebarQaLoop,
      },
      last_synced: kpiRow?.ts ?? new Date().toISOString(),
    }

    // Store in cache (always store unfiltered key too for fallback resilience)
    setCache(cacheKey, payload)
    if (filter) setCache('dashboard:', payload)

    return NextResponse.json(payload)
  } catch (err) {
    // ── Supabase error: try cache ────────────────────────────────────────────
    console.error('[dashboard] Supabase error:', err)

    const cached =
      getCached(cacheKey) ??
      (filter ? getCached('dashboard:') : null)

    if (cached) {
      return NextResponse.json({ ...cached, _stale: true })
    }

    return NextResponse.json(
      { error: 'sync pending' },
      { status: 503 }
    )
  }
}
