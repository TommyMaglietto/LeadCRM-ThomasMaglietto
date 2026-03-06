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
import { OUTREACH_STATUSES } from '@/lib/constants';
import type { DashboardStats } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversionChartProps {
  byOutreachStatus: DashboardStats['byOutreachStatus'];
}

// ---------------------------------------------------------------------------
// Dark tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  value: number;
  payload: { fill: string; label: string; from: string; to: string };
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
        backgroundColor: '#1A1A18',
        border: '1px solid #1A1A18',
        borderRadius: '8px',
        padding: '8px 12px',
        color: '#EDE9E1',
        fontSize: '13px',
      }}
    >
      <p style={{ color: entry.payload.fill, fontWeight: 600, marginBottom: 2 }}>
        {entry.payload.label}
      </p>
      <p style={{ color: '#6B6560' }}>
        {entry.value}% conversion rate
      </p>
      <p style={{ color: '#9C9389', fontSize: 11, marginTop: 2 }}>
        {entry.payload.from} → {entry.payload.to}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compute conversion rate between two consecutive pipeline stages
// ---------------------------------------------------------------------------

function conversionRate(from: number, to: number): number {
  if (from === 0) return 0;
  return Math.round((to / from) * 100);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ConversionChart({ byOutreachStatus }: ConversionChartProps) {
  // Pull counts in canonical pipeline order
  const stages = OUTREACH_STATUSES.map((s) => ({
    key: s.value,
    label: s.label,
    count: byOutreachStatus[s.value] ?? 0,
    color: s.color,
  }));

  // Build conversion pairs: New→Contacted, Contacted→Replied, etc.
  // We skip the closed_lost stage as it's a terminal negative state.
  const pairs: Array<{
    label: string;
    from: string;
    to: string;
    rate: number;
    fill: string;
  }> = [];

  const pipeline = stages.filter((s) => s.key !== 'closed_lost');

  for (let i = 0; i < pipeline.length - 1; i++) {
    const current = pipeline[i];
    const next = pipeline[i + 1];
    if (!current || !next) continue;

    pairs.push({
      label: `${current.label} → ${next.label}`,
      from: current.label,
      to: next.label,
      rate: conversionRate(current.count, next.count),
      fill: next.color,
    });
  }

  return (
    <Card title="Conversion Rates">
      <div style={{ height: 260 }}>
        {pairs.every((p) => p.rate === 0) ? (
          <div className="flex items-center justify-center h-full text-sm text-rubble">
            No outreach data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pairs}
              margin={{ top: 20, right: 16, bottom: 40, left: 0 }}
            >
              <XAxis
                dataKey="label"
                tick={{ fill: '#6B6560', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(26,26,24,0.12)' }}
                tickLine={false}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fill: '#9C9389', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={32}
                tickFormatter={(v: number) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(26,26,24,0.04)' }}
              />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {pairs.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    fillOpacity={0.85}
                  />
                ))}
                <LabelList
                  dataKey="rate"
                  position="top"
                  formatter={(v: number) => `${v}%`}
                  style={{
                    fill: '#9C9389',
                    fontSize: 11,
                    fontFamily: "'Bebas Neue', sans-serif",
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
