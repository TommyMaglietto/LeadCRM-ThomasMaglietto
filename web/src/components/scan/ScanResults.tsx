'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Scan } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScanResultsProps {
  scan: Scan;
  onRunAnother: () => void;
}

// ---------------------------------------------------------------------------
// Stat card sub-component
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number;
  color?: string;
  muted?: boolean;
}

function StatCard({ label, value, color, muted = false }: StatCardProps) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-[8px] border border-border-subtle bg-surface-card">
      <span
        className={cn(
          'text-2xl font-bold font-mono tabular-nums',
          muted ? 'text-text-muted' : 'text-text-primary'
        )}
        style={color ? { color } : undefined}
      >
        {value.toLocaleString()}
      </span>
      <span className="text-[11px] text-text-muted uppercase tracking-wide font-medium">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tier row sub-component
// ---------------------------------------------------------------------------

interface TierRowProps {
  label: string;
  count: number;
  badgeVariant: 'success' | 'warning' | 'info' | 'neutral';
}

function TierRow({ label, count, badgeVariant }: TierRowProps) {
  const pct =
    count === 0 ? 0 : Math.round((count / Math.max(count, 1)) * 100);

  return (
    <div className="flex items-center gap-3">
      <Badge variant={badgeVariant} size="sm" className="w-14 justify-center">
        {label}
      </Badge>
      <div className="flex-1 h-1.5 rounded-full bg-surface-active overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            badgeVariant === 'success' && 'bg-green-500',
            badgeVariant === 'warning' && 'bg-amber-500',
            badgeVariant === 'info'    && 'bg-blue-500',
            badgeVariant === 'neutral' && 'bg-zinc-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-sm font-semibold text-text-primary w-8 text-right tabular-nums">
        {count}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScanResults
// ---------------------------------------------------------------------------

export function ScanResults({ scan, onRunAnother }: ScanResultsProps) {
  const router = useRouter();

  const didFail = scan.status === 'failed';
  const total = scan.total_found;
  const tierTotal = scan.hot_count + scan.warm_count + scan.cold_count + scan.skip_count;

  return (
    <div className="flex flex-col gap-6">
      {/* Status header */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            didFail ? 'bg-red-500/15' : 'bg-green-500/15'
          )}
        >
          {didFail ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5L13 4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div>
          <p className={cn('text-sm font-semibold', didFail ? 'text-red-400' : 'text-green-400')}>
            {didFail ? 'Scan failed' : 'Scan completed'}
          </p>
          {scan.completed_at && (
            <p className="text-xs text-text-muted">
              {new Date(scan.completed_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Error message */}
      {didFail && scan.error_message && (
        <div className="rounded-[8px] border border-red-500/30 bg-red-500/5 px-4 py-3">
          <p className="text-xs text-text-muted font-medium mb-1">Error details</p>
          <p className="text-xs text-red-300 font-mono leading-relaxed break-all">
            {scan.error_message}
          </p>
        </div>
      )}

      {/* Summary counts */}
      {!didFail && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Found" value={total} color="#fafafa" />
            <StatCard label="New" value={scan.new_inserted} color="#22c55e" />
            <StatCard label="Updated" value={scan.updated} color="#6366f1" />
          </div>

          {/* Tier breakdown */}
          {tierTotal > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-text-muted font-medium uppercase tracking-wide">
                Tier Breakdown
              </p>
              <div className="rounded-[8px] border border-border-subtle bg-surface-card p-4 flex flex-col gap-3">
                <TierRow label="Hot"  count={scan.hot_count}  badgeVariant="success" />
                <TierRow label="Warm" count={scan.warm_count} badgeVariant="warning" />
                <TierRow label="Cold" count={scan.cold_count} badgeVariant="info" />
                <TierRow label="Skip" count={scan.skip_count} badgeVariant="neutral" />
              </div>
            </div>
          )}

          {/* Scan metadata */}
          <div className="rounded-[8px] border border-border-subtle bg-surface-card px-4 py-3 flex flex-col gap-2">
            <p className="text-[11px] text-text-muted uppercase tracking-wide font-medium">
              Scan details
            </p>
            <div className="flex flex-col gap-1.5">
              {scan.trades && (
                <div className="flex gap-2">
                  <span className="text-xs text-text-muted w-14 shrink-0">Trades</span>
                  <span className="text-xs text-text-secondary capitalize leading-relaxed">
                    {scan.trades.split(',').join(', ')}
                  </span>
                </div>
              )}
              {scan.towns && (
                <div className="flex gap-2">
                  <span className="text-xs text-text-muted w-14 shrink-0">Towns</span>
                  <span className="text-xs text-text-secondary leading-relaxed">
                    {scan.towns.split(',').join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        {!didFail && (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => router.push('/leads')}
          >
            View Results in Leads
          </Button>
        )}
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={onRunAnother}
        >
          Run Another Scan
        </Button>
      </div>
    </div>
  );
}
