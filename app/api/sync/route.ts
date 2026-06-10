/**
 * Story #9 — POST /api/sync
 * Triggers GitHub → Supabase sync.
 * Protected by Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncGitHub } from '@/lib/github-sync';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (provided !== cronSecret) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Run sync
  const result = await syncGitHub();

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, synced_at: result.synced_at },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    synced_at: result.synced_at,
    issues_count: result.issues_count,
  });
}
