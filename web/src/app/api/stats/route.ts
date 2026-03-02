/**
 * GET /api/stats
 *
 * Aggregated dashboard statistics drawn entirely from the SQLite database.
 * Returns counts broken down by tier, website_status, outreach_status, and
 * the 10 most-recent scan records. Also returns top cities and trades.
 *
 * No query parameters accepted — this is a single-shape snapshot endpoint.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { DashboardStats, Scan } from '@/lib/types';

export async function GET() {
  try {
    const db = getDb();

    // -----------------------------------------------------------------------
    // Total lead count
    // -----------------------------------------------------------------------
    const { total: totalLeads } = db
      .prepare('SELECT COUNT(*) AS total FROM businesses')
      .get() as { total: number };

    // -----------------------------------------------------------------------
    // By tier
    // -----------------------------------------------------------------------
    const tierRows = db
      .prepare(
        `SELECT lead_tier AS tier, COUNT(*) AS cnt
         FROM businesses
         GROUP BY lead_tier`
      )
      .all() as { tier: string; cnt: number }[];

    const byTier: DashboardStats['byTier'] = {
      hot: 0,
      warm: 0,
      cold: 0,
      skip: 0,
    };
    for (const row of tierRows) {
      const key = row.tier as keyof typeof byTier;
      if (key in byTier) byTier[key] = row.cnt;
    }

    // -----------------------------------------------------------------------
    // By website status
    // -----------------------------------------------------------------------
    const websiteRows = db
      .prepare(
        `SELECT COALESCE(website_status, 'unknown') AS status, COUNT(*) AS cnt
         FROM businesses
         GROUP BY website_status`
      )
      .all() as { status: string; cnt: number }[];

    const byWebsiteStatus: Record<string, number> = {};
    for (const row of websiteRows) {
      byWebsiteStatus[row.status] = row.cnt;
    }

    // -----------------------------------------------------------------------
    // By outreach status
    // -----------------------------------------------------------------------
    const outreachRows = db
      .prepare(
        `SELECT COALESCE(outreach_status, 'new') AS status, COUNT(*) AS cnt
         FROM businesses
         GROUP BY outreach_status`
      )
      .all() as { status: string; cnt: number }[];

    const byOutreachStatus: Record<string, number> = {};
    for (const row of outreachRows) {
      byOutreachStatus[row.status] = row.cnt;
    }

    // -----------------------------------------------------------------------
    // Recent scans (latest 10, newest first)
    // -----------------------------------------------------------------------
    const recentScans = db
      .prepare(
        `SELECT * FROM scans
         ORDER BY created_at DESC
         LIMIT 10`
      )
      .all() as Scan[];

    // -----------------------------------------------------------------------
    // Top cities by lead count
    // -----------------------------------------------------------------------
    const cityRows = db
      .prepare(
        `SELECT COALESCE(city, 'Unknown') AS city, COUNT(*) AS count
         FROM businesses
         GROUP BY city
         ORDER BY count DESC
         LIMIT 15`
      )
      .all() as { city: string; count: number }[];

    // -----------------------------------------------------------------------
    // Top trades by lead count
    // -----------------------------------------------------------------------
    const tradeRows = db
      .prepare(
        `SELECT COALESCE(trades, 'Unknown') AS trade, COUNT(*) AS count
         FROM businesses
         GROUP BY trades
         ORDER BY count DESC
         LIMIT 15`
      )
      .all() as { trade: string; count: number }[];

    const stats: DashboardStats = {
      totalLeads,
      byTier,
      byWebsiteStatus,
      byOutreachStatus,
      recentScans,
      byCity: cityRows,
      byTrade: tradeRows,
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error('[GET /api/stats]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
