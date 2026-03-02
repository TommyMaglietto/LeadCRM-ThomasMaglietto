/**
 * GET /api/scans/[id]
 *
 * Poll the status of a scan by its id.
 *
 * Includes stale-scan detection: if a scan has been "running" for more than
 * STALE_THRESHOLD_MS without completing, it is automatically marked as failed.
 * This handles the case where the Node.js process restarts (dev HMR, crash)
 * and loses the in-memory child-process callback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Scan } from '@/lib/types';

type RouteContext = { params: { id: string } };

/** Scans running longer than 15 minutes are considered stale/lost. */
const STALE_THRESHOLD_MS = 15 * 60 * 1000;

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return isNaN(id) || id <= 0 ? null : id;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const id = parseId(params.id);
  if (id === null) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    const db = getDb();

    let scan = db
      .prepare('SELECT * FROM scans WHERE id = ?')
      .get(id) as Scan | undefined;

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Stale scan detection: if running too long, mark as failed
    if (scan.status === 'running' && scan.started_at) {
      const elapsed = Date.now() - new Date(scan.started_at + 'Z').getTime();
      if (elapsed > STALE_THRESHOLD_MS) {
        db.prepare(
          `UPDATE scans
             SET status = 'failed',
                 error_message = 'Scan timed out (process lost or server restarted)',
                 completed_at = datetime('now')
           WHERE id = ? AND status = 'running'`,
        ).run(id);

        scan = db.prepare('SELECT * FROM scans WHERE id = ?').get(id) as Scan;
      }
    }

    return NextResponse.json({ data: scan });
  } catch (err) {
    console.error('[GET /api/scans/[id]]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
