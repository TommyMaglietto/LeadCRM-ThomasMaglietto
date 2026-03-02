import type { Metadata } from 'next';
import { PageShell } from '@/components/layout/PageShell';
import { KanbanBoard } from '@/components/pipeline/KanbanBoard';

export const metadata: Metadata = { title: 'Pipeline | Lead Generator' };

export default function PipelinePage() {
  return (
    <PageShell title="Pipeline" noPadding>
      {/* Provide a bit of padding around the board */}
      <div className="flex flex-col h-full px-4 pt-4 pb-2 gap-3">
        {/* Sub-header */}
        <p className="text-xs text-text-muted shrink-0">
          Drag leads between columns to update outreach status. Only hot, warm,
          and cold leads are shown.
        </p>

        {/* Board — KanbanBoard fills remaining height */}
        <KanbanBoard />
      </div>
    </PageShell>
  );
}
