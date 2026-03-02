'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { LEAD_TIERS } from '@/lib/constants';
import type { DashboardStats } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TierDistributionProps {
  byTier: DashboardStats['byTier'];
}

// ---------------------------------------------------------------------------
// Recharts dark-theme tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  name: string;
  value: number;
  payload: { fill: string };
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
        {entry.name}
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

export function TierDistribution({ byTier }: TierDistributionProps) {
  const data = LEAD_TIERS.map((tier) => ({
    name: tier.label,
    value: byTier[tier.value as keyof typeof byTier] ?? 0,
    fill: tier.color,
  })).filter((d) => d.value > 0);

  const total = Object.values(byTier).reduce((a, b) => a + b, 0);

  // If there's no data yet, show a placeholder ring
  const displayData =
    data.length > 0
      ? data
      : [{ name: 'No data', value: 1, fill: '#27272a' }];

  return (
    <Card title="Lead Tiers">
      {/* Relative container so we can absolutely-position the center label */}
      <div style={{ height: 260, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="45%"
              innerRadius={68}
              outerRadius={100}
              dataKey="value"
              stroke="#111113"
              strokeWidth={2}
              paddingAngle={data.length > 1 ? 2 : 0}
              labelLine={false}
              isAnimationActive
            >
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                color: '#a1a1aa',
                fontSize: '12px',
                paddingTop: '8px',
              }}
              formatter={(value: string) => (
                <span style={{ color: '#a1a1aa' }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label — absolutely positioned over the donut hole */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '43%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
            // Legend is ~28px tall at bottom; Pie cy is at 45% of 260 ≈ 117px
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '22px',
              fontWeight: 600,
              color: '#fafafa',
              lineHeight: 1,
            }}
          >
            {total.toLocaleString('en-US')}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#71717a',
              marginTop: '4px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            total
          </div>
        </div>
      </div>
    </Card>
  );
}
