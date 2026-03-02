'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import type { DashboardStats } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeadQualityChartProps {
  byTier: DashboardStats['byTier'];
}

// ---------------------------------------------------------------------------
// Score buckets
// Each bucket is labelled and coloured to convey lead quality visually.
// The actual bucket counts are approximated from tier data because the API
// doesn't return raw score histograms. If you later add a `byScore` field to
// the stats endpoint, replace this derivation with real data.
// ---------------------------------------------------------------------------

const BUCKETS: { label: string; color: string; tier: keyof DashboardStats['byTier'] | null }[] = [
  { label: 'Skip (<0)',  color: '#71717a', tier: 'skip' },
  { label: 'Cold (0-7)', color: '#3b82f6', tier: 'cold' },
  { label: 'Warm (8-11)', color: '#f59e0b', tier: 'warm' },
  { label: 'Hot (12+)',  color: '#ef4444', tier: 'hot'  },
];

// ---------------------------------------------------------------------------
// Dark tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  value: number;
  payload: { fill: string; label: string };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;

  return (
    <div
      style={{
        backgroundColor: '#18181b',
        border: '1px solid #3f3f46',
        borderRadius: '8px',
        padding: '8px 12px',
        color: '#fafafa',
        fontSize: '13px',
      }}
    >
      <p style={{ color: entry.payload.fill, fontWeight: 600, marginBottom: 2 }}>
        {entry.payload.label}
      </p>
      <p style={{ color: '#a1a1aa' }}>
        {entry.value.toLocaleString('en-US')} leads
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LeadQualityChart({ byTier }: LeadQualityChartProps) {
  const data = BUCKETS.map((bucket) => ({
    label: bucket.label,
    value: bucket.tier ? (byTier[bucket.tier] ?? 0) : 0,
    fill: bucket.color,
  }));

  return (
    <Card title="Score Distribution">
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 16, bottom: 4, left: 0 }}
          >
            <XAxis
              dataKey="label"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.85} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                style={{
                  fill: '#71717a',
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
