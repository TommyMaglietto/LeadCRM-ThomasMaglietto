/**
 * POST /api/leads/bulk
 *
 * Bulk-update outreach_status for multiple leads in a single transaction.
 *
 * Request body:
 *   ids             number[]  (required, 1-500 elements)
 *   outreach_status string    (required, must be an allowed value)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const ALLOWED_OUTREACH_STATUSES = new Set([
  'new',
  'contacted',
  'replied',
  'meeting_set',
  'closed_won',
  'closed_lost',
]);

const MAX_IDS = 500;

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ids, outreach_status } = body;

  // Validate outreach_status.
  if (
    typeof outreach_status !== 'string' ||
    !ALLOWED_OUTREACH_STATUSES.has(outreach_status)
  ) {
    return NextResponse.json(
      {
        error: `outreach_status must be one of: ${[...ALLOWED_OUTREACH_STATUSES].join(', ')}`,
      },
      { status: 422 },
    );
  }

  // Validate ids array.
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: 'ids must be a non-empty array of integers' },
      { status: 422 },
    );
  }

  if (ids.length > MAX_IDS) {
    return NextResponse.json(
      { error: `Cannot update more than ${MAX_IDS} leads at once` },
      { status: 422 },
    );
  }

  const numericIds = ids.map((id) => Number(id));
  if (numericIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return NextResponse.json(
      { error: 'All ids must be positive integers' },
      { status: 422 },
    );
  }

  try {
    const db = getDb();

    // Use a single parameterized statement inside a transaction.
    // SQLite has a max variable limit of 999; batch if needed.
    const batchSize = 900;

    const bulkUpdate = db.transaction((idBatch: number[], status: string) => {
      let totalChanged = 0;
      for (let i = 0; i < idBatch.length; i += batchSize) {
        const slice = idBatch.slice(i, i + batchSize);
        const placeholders = slice.map(() => '?').join(', ');
        const stmt = db.prepare(
          `UPDATE businesses
             SET outreach_status = ?, updated_at = datetime('now')
           WHERE id IN (${placeholders})`,
        );
        const info = stmt.run(status, ...slice);
        totalChanged += info.changes;
      }
      return totalChanged;
    });

    const changed = bulkUpdate(numericIds, outreach_status);

    return NextResponse.json({ updated: changed });
  } catch (err) {
    console.error('[POST /api/leads/bulk]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
