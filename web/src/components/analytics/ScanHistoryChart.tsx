'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/formatters';
import type { Scan } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanHistoryChartProps {
  scans: Scan[];
}

// ---------------------------------------------------------------------------
// Dark tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  value: number;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const found = payload.find((p) => p.dataKey === 'total_found');
  const hot   = payload.find((p) => p.dataKey === 'hot_count');

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
      <p style={{ color: '#a1a1aa', marginBottom: 6, fontSize: 11 }}>{label}</p>
      {found && (
        <p style={{ color: '#6366f1', fontWeight: 600, marginBottom: 2 }}>
          {found.value.toLocaleString('en-US')} leads found
        </p>
      )}
      {hot && (
        <p style={{ color: '#ef4444' }}>
          {hot.value} hot
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ScanHistoryChart({ scans }: ScanHistoryChartProps) {
  // Recharts needs data oldest → newest on X-axis
  const completed = scans
    .filter((s) => s.status === 'completed' && s.completed_at)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    .map((s) => ({
      date: formatDate(s.created_at),
      total_found: s.total_found,
      hot_count: s.hot_count,
      scanId: s.id,
    }));

  return (
    <Card title="Scan History">
      <div style={{ height: 260 }}>
        {completed.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-text-muted">
            No completed scans yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={completed}
              margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
            >
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradHot" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272a"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={{ stroke: '#27272a' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total_found"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#gradTotal)"
                dot={false}
                activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="hot_count"
                stroke="#ef4444"
                strokeWidth={1.5}
                fill="url(#gradHot)"
                dot={false}
                activeDot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }}
                strokeDasharray="4 2"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 px-1">
        <div className="flex items-center gap-1.5">
          <div
            className="h-0.5 w-5 rounded-full"
            style={{ backgroundColor: '#6366f1' }}
          />
          <span className="text-xs text-text-muted">Total found</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-0.5 w-5 rounded-full"
            style={{
              backgroundColor: '#ef4444',
              backgroundImage:
                'repeating-linear-gradient(90deg, #ef4444 0 4px, transparent 4px 6px)',
            }}
          />
          <span className="text-xs text-text-muted">Hot leads</span>
        </div>
      </div>
    </Card>
  );
}
