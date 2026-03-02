'use client';

import { useCallback, useState } from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { cn } from '@/lib/cn';
import { Spinner } from '@/components/ui/Spinner';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import type { Lead, OutreachStatus } from '@/lib/types';
import useSWR from 'swr';
import type { PaginatedResponse } from '@/lib/types';

// ---------------------------------------------------------------------------
// Column order
// ---------------------------------------------------------------------------

const STAGE_ORDER: OutreachStatus[] = [
  'new',
  'contacted',
  'replied',
  'meeting_set',
  'closed_won',
  'closed_lost',
];

// ---------------------------------------------------------------------------
// Fetcher — loads ALL non-skip leads for the pipeline
// ---------------------------------------------------------------------------

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<PaginatedResponse<Lead>>;
  });

const PIPELINE_URL =
  '/api/leads?tier=hot&tier=warm&tier=cold&sort=lead_score&order=desc&limit=200';

// ---------------------------------------------------------------------------
// Group leads by outreach_status
// ---------------------------------------------------------------------------

function groupByStage(leads: Lead[]): Record<OutreachStatus, Lead[]> {
  const initial: Record<OutreachStatus, Lead[]> = {
    new: [],
    contacted: [],
    replied: [],
    meeting_set: [],
    closed_won: [],
    closed_lost: [],
  };

  return leads.reduce((acc, lead) => {
    const status = lead.outreach_status ?? 'new';
    if (status in acc) {
      acc[status as OutreachStatus].push(lead);
    }
    return acc;
  }, initial);
}

// ---------------------------------------------------------------------------
// PATCH outreach status
// ---------------------------------------------------------------------------

async function patchLeadStatus(id: number, outreach_status: OutreachStatus) {
  const res = await fetch(`/api/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outreach_status }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ data: Lead }>;
}

// ---------------------------------------------------------------------------
// KanbanBoard
// ---------------------------------------------------------------------------

export function KanbanBoard() {
  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Lead>>(
    PIPELINE_URL,
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  // Optimistic local leads — starts as null (use server data until first drag)
  const [localLeads, setLocalLeads] = useState<Lead[] | null>(null);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const serverLeads = data?.data ?? [];
  const displayLeads = localLeads ?? serverLeads;
  const columns = groupByStage(displayLeads);

  // DnD sensors — require 5px movement to start drag (prevents accidental drags)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const lead = displayLeads.find((l) => String(l.id) === event.active.id);
      setActiveLead(lead ?? null);
    },
    [displayLeads]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveLead(null);

      const { active, over } = event;
      if (!over) return;

      const leadId = parseInt(String(active.id), 10);
      const newStage = over.id as OutreachStatus;

      // Find the lead being moved
      const lead = displayLeads.find((l) => l.id === leadId);
      if (!lead || lead.outreach_status === newStage) return;

      // Optimistic update — update local state immediately
      const optimistic = displayLeads.map((l) =>
        l.id === leadId ? { ...l, outreach_status: newStage } : l
      );
      setLocalLeads(optimistic);

      try {
        await patchLeadStatus(leadId, newStage);
        // Revalidate to sync with server
        void mutate();
        // Also clear local override so future renders use server data
        setLocalLeads(null);
      } catch (err) {
        console.error('[KanbanBoard] PATCH failed, reverting:', err);
        // Revert optimistic update
        setLocalLeads(null);
      }
    },
    [displayLeads, mutate]
  );

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (isLoading && serverLeads.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1 min-h-[300px]">
        <Spinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center flex-1 min-h-[300px]">
        <p className="text-sm text-red-400">
          Failed to load pipeline data. Please refresh the page.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Horizontal scroll container */}
      <div
        className={cn(
          'flex gap-3 overflow-x-auto pb-4',
          'scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent',
          // Ensure columns stretch to fill viewport height
          'min-h-0 flex-1'
        )}
        style={{ minHeight: 'calc(100vh - 120px)' }}
      >
        {STAGE_ORDER.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            leads={columns[stage]}
            onLeadClick={(lead) => {
              // Navigate to leads page with the lead id
              window.location.href = `/leads?id=${lead.id}`;
            }}
          />
        ))}
      </div>

      {/* Drag overlay — renders a clone of the card while dragging */}
      <DragOverlay>
        {activeLead ? (
          <div className="rotate-1 opacity-90 scale-105 pointer-events-none">
            <KanbanCard lead={activeLead} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
