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

// --- Types ----------------------------------------------------------------

interface TierDistributionProps {
  byTier: DashboardStats['byTier'];
}

// --- Tooltip --------------------------------------------------------------

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
        backgroundColor: '#1A1A18',
        border: '1px solid #1A1A18',
        borderRadius: '8px',
        padding: '8px 12px',
        color: '#EDE9E1',
        fontSize: '13px',
      }}
    >
      <p style={{ color: entry.payload.fill, fontWeight: 600, marginBottom: 2 }}>
        {entry.name}
      </p>
      <p style={{ color: '#9C9389' }}>
        {entry.value.toLocaleString('en-US')} leads
      </p>
    </div>
  );
}

// --- Main component -------------------------------------------------------

export function TierDistribution({ byTier }: TierDistributionProps) {
  const data = LEAD_TIERS.map((tier) => ({
    name: tier.label,
    value: byTier[tier.value as keyof typeof byTier] ?? 0,
    fill: tier.color,
  })).filter((d) => d.value > 0);

  const total = Object.values(byTier).reduce((a, b) => a + b, 0);

  const displayData =
    data.length > 0
      ? data
      : [{ name: 'No data', value: 1, fill: '#D9D4C9' }];

  return (
    <Card title="Lead Tiers">
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
              stroke="#D9D4C9"
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
                color: '#6B6560',
                fontSize: '12px',
                paddingTop: '8px',
              }}
              formatter={(value: string) => (
                <span style={{ color: '#6B6560' }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '43%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '28px',
              fontWeight: 400,
              color: '#1A1A18',
              lineHeight: 1,
              letterSpacing: '0.05em',
            }}
          >
            {total.toLocaleString('en-US')}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#9C9389',
              marginTop: '4px',
              fontFamily: "'DM Sans', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            total
          </div>
        </div>
      </div>
    </Card>
  );
}
