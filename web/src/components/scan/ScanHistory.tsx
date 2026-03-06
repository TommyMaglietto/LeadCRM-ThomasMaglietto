'use client';

import useSWR from 'swr';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/formatters';
import type { DashboardStats, Scan } from '@/lib/types';

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<DashboardStats>;
  });

// ---------------------------------------------------------------------------
// Status pill
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: Scan['status'] }) {
  const configs: Record<Scan['status'], { label: string; variant: 'success' | 'error' | 'warning' | 'neutral' }> = {
    completed: { label: 'Done',    variant: 'success' },
    failed:    { label: 'Failed',  variant: 'error' },
    running:   { label: 'Running', variant: 'warning' },
    pending:   { label: 'Pending', variant: 'neutral' },
  };

  const cfg = configs[status];
  return (
    <Badge variant={cfg.variant} size="sm">
      {cfg.label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// ScanHistory
// ---------------------------------------------------------------------------

export function ScanHistory() {
  const { data, isLoading, error } = useSWR<DashboardStats>('/api/stats', fetcher, {
    refreshInterval: 15_000,  // refresh every 15 s
    revalidateOnFocus: true,
  });

  const scans = data?.recentScans ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-rubble py-4 text-center">
        Could not load scan history.
      </p>
    );
  }

  if (scans.length === 0) {
    return (
      <p className="text-xs text-rubble py-4 text-center">
        No scans yet. Start your first scan to see history here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {scans.map((scan) => (
        <div
          key={scan.id}
          className={cn(
            'rounded-[8px] border border-ink/10 bg-cream-dark p-3 flex flex-col gap-2',
            scan.status === 'running' && 'border-amber-500/30 bg-amber-500/5'
          )}
        >
          {/* Header row: status + date */}
          <div className="flex items-center justify-between gap-2">
            <StatusPill status={scan.status} />
            <span className="text-[11px] text-rubble">
              {formatDate(scan.created_at)}
            </span>
          </div>

          {/* Trades */}
          {scan.trades && (
            <p className="text-xs text-stone capitalize leading-relaxed line-clamp-2">
              {scan.trades.split(',').map((t) => t.trim()).join(', ')}
            </p>
          )}

          {/* Stats row */}
          {scan.status === 'completed' && (
            <div className="flex items-center gap-3 pt-0.5">
              <span className="text-[11px] text-rubble">
                <span className="font-display font-semibold text-stone">{scan.total_found}</span>
                {' '}found
              </span>
              <span className="text-[11px] text-rubble">
                <span className="font-display font-semibold text-green-700">{scan.new_inserted}</span>
                {' '}new
              </span>
              {scan.hot_count > 0 && (
                <span className="text-[11px] text-rubble">
                  <span className="font-display font-semibold text-red-600">{scan.hot_count}</span>
                  {' '}hot
                </span>
              )}
            </div>
          )}

          {/* Error message */}
          {scan.status === 'failed' && scan.error_message && (
            <p className="text-[11px] text-red-600 line-clamp-2 font-display">
              {scan.error_message}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
