'use client';

import { Card } from '@/components/ui/Card';
import { OUTREACH_STATUSES } from '@/lib/constants';
import type { DashboardStats } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OutreachFunnelProps {
  byOutreachStatus: DashboardStats['byOutreachStatus'];
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OutreachFunnel({ byOutreachStatus }: OutreachFunnelProps) {
  // Build data in the canonical pipeline order
  const stages = OUTREACH_STATUSES.map((s) => ({
    key: s.value,
    label: s.label,
    value: byOutreachStatus[s.value] ?? 0,
    color: s.color,
    textColor: s.textColor,
    bgColor: s.bgColor,
  }));

  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  return (
    <Card title="Outreach Pipeline">
      <div className="flex flex-col gap-3 py-1">
        {stages.map((stage, index) => {
          const pct = Math.round((stage.value / maxValue) * 100);
          // Funnel taper: each stage bar narrows relative to the previous
          // We base the max-width on percentage of the maximum bar (new stage)
          // but also apply a visual taper by constraining max-width steps.
          const funnelMaxPct = Math.max(pct, 8); // minimum 8% so bar is always visible

          return (
            <div key={stage.key} className="flex items-center gap-3">
              {/* Stage index indicator */}
              <div
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-medium"
                style={{
                  backgroundColor: stage.bgColor,
                  color: stage.textColor,
                }}
              >
                {index + 1}
              </div>

              {/* Bar + label */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-text-secondary">
                    {stage.label}
                  </span>
                  <span
                    className="text-xs font-mono font-semibold tabular-nums"
                    style={{ color: stage.textColor }}
                  >
                    {stage.value.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-active overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${funnelMaxPct}%`,
                      backgroundColor: stage.color,
                      opacity: 0.85,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
