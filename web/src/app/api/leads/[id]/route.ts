/**
 * GET  /api/leads/[id]  - Fetch a single lead with its call log.
 * PATCH /api/leads/[id] - Update outreach_status and/or notes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_OUTREACH_STATUSES = new Set([
  'new',
  'contacted',
  'replied',
  'meeting_set',
  'closed_won',
  'closed_lost',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type RouteContext = { params: { id: string } };

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return isNaN(id) || id <= 0 ? null : id;
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

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

    const lead = db
      .prepare('SELECT * FROM businesses WHERE id = ?')
      .get(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const callLog = db
      .prepare(
        'SELECT * FROM call_log WHERE business_id = ? ORDER BY called_at DESC',
      )
      .all(id);

    return NextResponse.json({ lead, callLog });
  } catch (err) {
    console.error('[GET /api/leads/[id]]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext,
) {
  const id = parseId(params.id);
  if (id === null) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { outreach_status, notes } = body;

  // Validate outreach_status if provided.
  if (outreach_status !== undefined) {
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
  }

  // At least one field must be present.
  if (outreach_status === undefined && notes === undefined) {
    return NextResponse.json(
      { error: 'Provide at least one of outreach_status or notes' },
      { status: 422 },
    );
  }

  try {
    const db = getDb();

    const existing = db
      .prepare('SELECT id FROM businesses WHERE id = ?')
      .get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Build SET clause dynamically so we only touch provided fields.
    const setClauses: string[] = ["updated_at = datetime('now')"];
    const values: (string | number | null)[] = [];

    if (outreach_status !== undefined) {
      setClauses.push('outreach_status = ?');
      values.push(outreach_status as string);
    }
    if (notes !== undefined) {
      setClauses.push('notes = ?');
      values.push(notes === null ? null : String(notes));
    }

    values.push(id);

    db.prepare(
      `UPDATE businesses SET ${setClauses.join(', ')} WHERE id = ?`,
    ).run(...values);

    const updated = db
      .prepare('SELECT * FROM businesses WHERE id = ?')
      .get(id);

    return NextResponse.json({ lead: updated });
  } catch (err) {
    console.error('[PATCH /api/leads/[id]]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
