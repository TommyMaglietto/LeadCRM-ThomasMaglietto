/**
 * POST /api/leads/[id]/calls
 *
 * Append a call log entry for a lead.
 *
 * Request body:
 *   outcome          string  (required)
 *   duration_seconds number  (optional)
 *   notes            string  (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

type RouteContext = { params: { id: string } };

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return isNaN(id) || id <= 0 ? null : id;
}

export async function POST(
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

  const { outcome, duration_seconds, notes } = body;

  if (!outcome || typeof outcome !== 'string' || outcome.trim() === '') {
    return NextResponse.json(
      { error: 'outcome is required and must be a non-empty string' },
      { status: 422 },
    );
  }

  const durationVal =
    duration_seconds !== undefined && duration_seconds !== null
      ? Number(duration_seconds)
      : null;

  if (durationVal !== null && (isNaN(durationVal) || durationVal < 0)) {
    return NextResponse.json(
      { error: 'duration_seconds must be a non-negative number' },
      { status: 422 },
    );
  }

  try {
    const db = getDb();

    const lead = db
      .prepare('SELECT id FROM businesses WHERE id = ?')
      .get(id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const result = db
      .prepare(
        `INSERT INTO call_log (business_id, called_at, duration_seconds, outcome, notes)
         VALUES (?, datetime('now'), ?, ?, ?)`,
      )
      .run(id, durationVal, outcome.trim(), notes !== undefined ? String(notes) : null);

    const entry = db
      .prepare('SELECT * FROM call_log WHERE id = ?')
      .get(result.lastInsertRowid);

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/leads/[id]/calls]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
