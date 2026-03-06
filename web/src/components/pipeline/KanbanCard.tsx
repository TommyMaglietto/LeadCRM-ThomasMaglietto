'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/cn';
import { TierBadge } from '@/components/ui/Badge';
import { formatPhone } from '@/lib/formatters';
import type { Lead } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface KanbanCardProps {
  lead: Lead;
  onClick?: (lead: Lead) => void;
}

// ---------------------------------------------------------------------------
// Trade pill helper — shows up to 2 trades, with +N overflow
// ---------------------------------------------------------------------------

function TradePills({ trades }: { trades: string | null }) {
  if (!trades) return null;

  const list = trades
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const visible = list.slice(0, 2);
  const overflow = list.length - visible.length;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visible.map((trade) => (
        <span
          key={trade}
          className="inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium leading-none bg-ink/10 text-stone capitalize"
        >
          {trade}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-rubble font-medium">
          +{overflow}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score dot color
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#9C9389';
}

// ---------------------------------------------------------------------------
// KanbanCard
// ---------------------------------------------------------------------------

export function KanbanCard({ lead, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(lead.id),
    data: { lead },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(lead)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(lead);
        }
      }}
      aria-label={`Lead card for ${lead.name}`}
      className={cn(
        // Base card styles
        'relative w-full rounded-[6px] border border-ink/10 bg-cream-dark p-2.5',
        'flex flex-col gap-1.5 cursor-grab select-none',
        'transition-all duration-150',
        // Hover glow
        'hover:border-ink hover:shadow-card-sm',
        // Active drag
        isDragging && [
          'opacity-50 cursor-grabbing z-50 shadow-card',
          'border-accent',
        ]
      )}
    >
      {/* Row 1: Business name + score */}
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-sm font-semibold text-ink leading-tight truncate flex-1 min-w-0"
          title={lead.name}
        >
          {lead.name}
        </p>
        <span
          className="font-display text-[11px] font-medium shrink-0 tabular-nums"
          style={{ color: scoreColor(lead.lead_score) }}
        >
          {lead.lead_score}
        </span>
      </div>

      {/* Row 2: Trades */}
      <TradePills trades={lead.trades} />

      {/* Row 3: Tier badge + city */}
      <div className="flex items-center justify-between gap-2">
        <TierBadge tier={lead.lead_tier} size="sm" />
        {lead.city && (
          <span className="text-[10px] text-rubble truncate max-w-[80px]" title={lead.city ?? ''}>
            {lead.city}
          </span>
        )}
      </div>

      {/* Row 4: Phone */}
      {lead.phone && (
        <p className="text-[10px] text-rubble font-display leading-none">
          {formatPhone(lead.phone)}
        </p>
      )}
    </div>
  );
}
