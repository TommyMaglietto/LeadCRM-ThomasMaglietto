/**
 * GET /api/config
 *
 * Returns static configuration values that mirror config.py in the Python
 * project.  The frontend uses this to populate filter dropdowns, tier badge
 * colours, and the scan-launch form without hard-coding values in components.
 */

import { NextResponse } from 'next/server';

const CONFIG = {
  trades: [
    'plumber',
    'electrician',
    'HVAC',
    'roofer',
    'landscaper',
    'painter',
    'handyman',
    'fence installer',
    'pressure washing',
    'gutter cleaning',
    'concrete contractor',
    'paving contractor',
    'tree service',
    'pest control',
    'garage door repair',
    'locksmith',
    'pool service',
    'septic service',
    'drywall contractor',
    'flooring installer',
  ],

  tiers: ['hot', 'warm', 'cold', 'skip'],

  tierThresholds: {
    hot: 12,
    warm: 8,
    cold: 5,
  },

  outreachStatuses: [
    'new',
    'contacted',
    'replied',
    'meeting_set',
    'closed_won',
    'closed_lost',
  ],

  websiteStatuses: [
    'no_website',
    'dead',
    'parked',
    'facebook_only',
    'placeholder',
    'free_tier',
    'poor',
    'adequate',
  ],

  defaultState: 'NC',
} as const;

export async function GET() {
  return NextResponse.json(CONFIG, {
    headers: {
      // Config rarely changes — allow short-lived caching.
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    },
  });
}
