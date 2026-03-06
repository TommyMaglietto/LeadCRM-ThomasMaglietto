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

// --- Types ----------------------------------------------------------------

interface WebsiteStatusChartProps {
  byWebsiteStatus: DashboardStats['byWebsiteStatus'];
}

// --- Tooltip --------------------------------------------------------------

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
      <p style={{ color: '#9C9389' }}>
        {entry.value.toLocaleString('en-US')} leads
      </p>
    </div>
  );
}

// --- Main component -------------------------------------------------------

export function WebsiteStatusChart({ byWebsiteStatus }: WebsiteStatusChartProps) {
  const data = WEBSITE_STATUSES.map((ws) => ({
    key: ws.value,
    label: ws.label,
    value: byWebsiteStatus[ws.value] ?? 0,
    fill: ws.color,
  })).filter((d) => d.value > 0);

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
              tick={{ fill: '#9C9389', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(26, 26, 24, 0.12)' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={90}
              tick={{ fill: '#6B6560', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(26, 26, 24, 0.04)' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {sorted.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.85} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                style={{ fill: '#9C9389', fontSize: 11, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
