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
import { WEBSITE_STATUSES } from '@/lib/constants';
import type { DashboardStats } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WebsiteStatusChartProps {
  byWebsiteStatus: DashboardStats['byWebsiteStatus'];
}

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

export function WebsiteStatusChart({ byWebsiteStatus }: WebsiteStatusChartProps) {
  // Build chart data in the canonical order from WEBSITE_STATUSES
  const data = WEBSITE_STATUSES.map((ws) => ({
    key: ws.value,
    label: ws.label,
    value: byWebsiteStatus[ws.value] ?? 0,
    fill: ws.color,
  })).filter((d) => d.value > 0);

  // Sort descending by count so largest bar is at top
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <Card title="Website Quality">
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 4, right: 48, bottom: 4, left: 0 }}
          >
            <XAxis
              type="number"
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={90}
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {sorted.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.85} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                style={{ fill: '#71717a', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
