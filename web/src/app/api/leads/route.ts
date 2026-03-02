/**
 * GET /api/leads
 *
 * Paginated, filterable list of leads from the businesses table.
 *
 * Query params:
 *   page            number  (default 1)
 *   limit           number  (default 25, max 200)
 *   sort            string  column name from SORT_WHITELIST (default lead_score)
 *   order           asc|desc (default desc)
 *   tier            comma-separated lead_tier values
 *   trade           substring match on trades column
 *   city            exact match on city column
 *   website_status  comma-separated website_status values
 *   outreach_status comma-separated outreach_status values
 *   search          LIKE match on name, phone, address
 *   min_score       integer minimum lead_score
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Columns that callers are permitted to sort by. */
const SORT_WHITELIST = new Set([
  'lead_score',
  'name',
  'city',
  'website_status',
  'outreach_status',
  'lead_tier',
  'google_rating',
  'google_review_count',
  'created_at',
  'updated_at',
  'first_seen',
  'last_enriched',
]);

const DEFAULT_SORT = 'lead_score';
const DEFAULT_ORDER = 'desc';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // -- Pagination ----------------------------------------------------------
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || DEFAULT_PAGE);
    const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;
    const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);
    const offset = (page - 1) * limit;

    // -- Sorting -------------------------------------------------------------
    const rawSort = searchParams.get('sort') ?? DEFAULT_SORT;
    const sort = SORT_WHITELIST.has(rawSort) ? rawSort : DEFAULT_SORT;
    const rawOrder = (searchParams.get('order') ?? DEFAULT_ORDER).toLowerCase();
    const order = rawOrder === 'asc' ? 'ASC' : 'DESC';

    // -- Filters -------------------------------------------------------------
    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    // Support both repeated params (tier=hot&tier=warm) and comma-separated (tier=hot,warm)
    const tierAll = searchParams.getAll('tier');
    const tiers = tierAll.flatMap((t) => t.split(',').map((s) => s.trim())).filter(Boolean);
    if (tiers.length > 0) {
      const placeholders = tiers.map(() => '?').join(', ');
      whereClauses.push(`lead_tier IN (${placeholders})`);
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

    const websiteStatusAll = searchParams.getAll('website_status');
    const wsStatuses = websiteStatusAll.flatMap((s) => s.split(',').map((v) => v.trim())).filter(Boolean);
    if (wsStatuses.length > 0) {
      const placeholders = wsStatuses.map(() => '?').join(', ');
      whereClauses.push(`website_status IN (${placeholders})`);
      params.push(...wsStatuses);
    }

    const outreachStatusAll = searchParams.getAll('outreach_status');
    const osStatuses = outreachStatusAll.flatMap((s) => s.split(',').map((v) => v.trim())).filter(Boolean);
    if (osStatuses.length > 0) {
      const placeholders = osStatuses.map(() => '?').join(', ');
      whereClauses.push(`outreach_status IN (${placeholders})`);
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

    // -- Queries -------------------------------------------------------------
    const db = getDb();

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM businesses ${whereSQL}`)
      .get(...params) as { total: number };

    const total = countRow.total;
    const totalPages = Math.ceil(total / limit);

    const data = db
      .prepare(
        `SELECT * FROM businesses ${whereSQL} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    console.error('[GET /api/leads]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
