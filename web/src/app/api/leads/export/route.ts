/**
 * GET /api/leads/export
 *
 * Returns a CSV file download with the same filter support as GET /api/leads.
 * All rows matching the filters are returned (no pagination).
 *
 * Query params: same as GET /api/leads (tier, trade, city, website_status,
 *               outreach_status, search, min_score, sort, order)
 *
 * Response headers:
 *   Content-Type:        text/csv
 *   Content-Disposition: attachment; filename="leads_export_YYYY-MM-DD.csv"
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  { key: 'name',            header: 'Name' },
  { key: 'phone',           header: 'Phone' },
  { key: 'address',         header: 'Address' },
  { key: 'city',            header: 'City' },
  { key: 'website_url',     header: 'Website URL' },
  { key: 'website_status',  header: 'Website Status' },
  { key: 'google_rating',   header: 'Rating' },
  { key: 'google_review_count', header: 'Review Count' },
  { key: 'lead_score',      header: 'Lead Score' },
  { key: 'lead_tier',       header: 'Lead Tier' },
  { key: 'trades',          header: 'Trades' },
  { key: 'outreach_status', header: 'Outreach Status' },
] as const;

/** Escape a CSV field: wrap in quotes if it contains comma, quote, or newline. */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(rows: Record<string, unknown>[]): string {
  const headerRow = CSV_COLUMNS.map((c) => c.header).join(',');
  const dataRows = rows.map((row) =>
    CSV_COLUMNS.map((c) => csvEscape(row[c.key])).join(','),
  );
  return [headerRow, ...dataRows].join('\r\n');
}

// ---------------------------------------------------------------------------
// Sort whitelist (must match /api/leads/route.ts)
// ---------------------------------------------------------------------------

const SORT_WHITELIST = new Set([
  'lead_score', 'name', 'city', 'website_status', 'outreach_status',
  'lead_tier', 'google_rating', 'google_review_count', 'created_at',
  'updated_at', 'first_seen', 'last_enriched',
]);

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // -- Sorting -------------------------------------------------------------
    const rawSort = searchParams.get('sort') ?? 'lead_score';
    const sort = SORT_WHITELIST.has(rawSort) ? rawSort : 'lead_score';
    const rawOrder = (searchParams.get('order') ?? 'desc').toLowerCase();
    const order = rawOrder === 'asc' ? 'ASC' : 'DESC';

    // -- Filters -------------------------------------------------------------
    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    const tierAll = searchParams.getAll('tier');
    const tiers = tierAll.flatMap((t) => t.split(',').map((s) => s.trim())).filter(Boolean);
    if (tiers.length > 0) {
      whereClauses.push(`lead_tier IN (${tiers.map(() => '?').join(', ')})`);
      params.push(...tiers);
    }

    const trade = searchParams.get('trade');
    if (trade) {
      whereClauses.push(`trades LIKE ?`);
      params.push(`%${trade}%`);
    }

    const city = searchParams.get('city');
    if (city) {
      whereClauses.push(`city = ?`);
      params.push(city);
    }

    const wsAll = searchParams.getAll('website_status');
    const wsStatuses = wsAll.flatMap((s) => s.split(',').map((v) => v.trim())).filter(Boolean);
    if (wsStatuses.length > 0) {
      whereClauses.push(`website_status IN (${wsStatuses.map(() => '?').join(', ')})`);
      params.push(...wsStatuses);
    }

    const osAll = searchParams.getAll('outreach_status');
    const osStatuses = osAll.flatMap((s) => s.split(',').map((v) => v.trim())).filter(Boolean);
    if (osStatuses.length > 0) {
      whereClauses.push(`outreach_status IN (${osStatuses.map(() => '?').join(', ')})`);
      params.push(...osStatuses);
    }

    const search = searchParams.get('search');
    if (search) {
      whereClauses.push(`(name LIKE ? OR phone LIKE ? OR address LIKE ?)`);
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    const minScore = searchParams.get('min_score');
    if (minScore !== null) {
      const score = parseInt(minScore, 10);
      if (!isNaN(score)) {
        whereClauses.push(`lead_score >= ?`);
        params.push(score);
      }
    }

    const whereSQL = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    // -- Query ---------------------------------------------------------------
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT * FROM businesses ${whereSQL} ORDER BY ${sort} ${order}`,
      )
      .all(...params) as Record<string, unknown>[];

    // -- Response ------------------------------------------------------------
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const csv = buildCsv(rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads_export_${today}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[GET /api/leads/export]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
