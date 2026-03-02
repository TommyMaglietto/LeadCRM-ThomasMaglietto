'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/cn';
import { KanbanCard } from './KanbanCard';
import type { Lead, OutreachStatus } from '@/lib/types';

// ---------------------------------------------------------------------------
// Column header color definitions (design tokens)
// ---------------------------------------------------------------------------

export const COLUMN_COLORS: Record<OutreachStatus, string> = {
  new:          '#71717a',   // zinc-500
  contacted:    '#3b82f6',   // blue-500
  replied:      '#f59e0b',   // amber-500
  meeting_set:  '#8b5cf6',   // purple-500
  closed_won:   '#22c55e',   // green-500
  closed_lost:  '#ef4444',   // red-500 (rendered at 50% opacity in header)
};

export const COLUMN_LABELS: Record<OutreachStatus, string> = {
  new:          'New',
  contacted:    'Contacted',
  replied:      'Replied',
  meeting_set:  'Meeting Set',
  closed_won:   'Closed Won',
  closed_lost:  'Closed Lost',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface KanbanColumnProps {
  stage: OutreachStatus;
  leads: Lead[];
  onLeadClick?: (lead: Lead) => void;
}

// ---------------------------------------------------------------------------
// KanbanColumn
// ---------------------------------------------------------------------------

export function KanbanColumn({ stage, leads, onLeadClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  const color = COLUMN_COLORS[stage];
  const label = COLUMN_LABELS[stage];
  const isClosedLost = stage === 'closed_lost';

  return (
    <div className="flex flex-col shrink-0 w-[220px] rounded-[8px] border border-border-subtle bg-surface-card overflow-hidden">
      {/* Column header bar */}
      <div
        className="px-3 py-2.5 flex items-center justify-between shrink-0"
        style={{
          backgroundColor: isClosedLost
            ? `${color}1A`   // ~10% opacity for closed lost
            : `${color}26`,  // ~15% opacity for others
          borderBottom: `2px solid ${isClosedLost ? `${color}80` : color}`,
        }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wider leading-none"
          style={{ color: isClosedLost ? `${color}CC` : color }}
        >
          {label}
        </span>
        <span
          className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold leading-none"
          style={{
            backgroundColor: isClosedLost ? `${color}26` : `${color}33`,
            color: isClosedLost ? `${color}CC` : color,
          }}
        >
          {leads.length}
        </span>
      </div>

      {/* Droppable card area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto p-2 flex flex-col gap-2 min-h-[120px]',
          'transition-colors duration-150',
          isOver && 'bg-accent/5'
        )}
        style={{ maxHeight: 'calc(100vh - 160px)' }}
        aria-label={`${label} column, ${leads.length} leads`}
      >
        {leads.length === 0 ? (
          <div
            className={cn(
              'flex-1 flex items-center justify-center rounded-[6px] border-2 border-dashed',
              'transition-colors duration-150 min-h-[80px]',
              isOver
                ? 'border-accent/50 bg-accent/5'
                : 'border-border-subtle'
            )}
          >
            <span className="text-xs text-text-muted">Drop here</span>
          </div>
        ) : (
          leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              onClick={onLeadClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
