'use client';

import { useStats } from '@/hooks/useStats';
import { Button } from '@/components/ui/Button';
import { LeadQualityChart } from './LeadQualityChart';
import { ConversionChart } from './ConversionChart';
import { ScanHistoryChart } from './ScanHistoryChart';

// ---------------------------------------------------------------------------
// Skeleton helper
// ---------------------------------------------------------------------------

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-[8px] border border-border-subtle bg-surface-card animate-pulse ${className ?? ''}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Breakdown card: top trades
// ---------------------------------------------------------------------------

function TopTradesCard({ byTrade }: { byTrade: { trade: string; count: number }[] }) {
  const top = byTrade.slice(0, 10);
  const maxCount = Math.max(...top.map((t) => t.count), 1);

  return (
    <div className="rounded-[8px] border border-border-subtle bg-surface-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <h3 className="text-sm font-semibold text-text-primary">Leads by Trade</h3>
        <span className="text-xs text-text-muted">{byTrade.length} trades</span>
      </div>
      <div className="p-4">
        {top.length === 0 ? (
          <p className="py-8 text-sm text-center text-text-muted">No data yet</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {top.map((item) => (
              <div key={item.trade} className="flex items-center gap-3">
                <span
                  className="text-xs text-text-secondary truncate shrink-0 capitalize"
                  style={{ width: 112 }}
                >
                  {item.trade}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-surface-active overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((item.count / maxCount) * 100)}%`,
                      backgroundColor: '#8b5cf6',
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-text-muted tabular-nums w-8 text-right">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary stat tiles (analytics-specific)
// ---------------------------------------------------------------------------

interface AnalyticsTileProps {
  label: string;
  value: string | number;
  sub?: string;
}

function AnalyticsTile({ label, value, sub }: AnalyticsTileProps) {
  return (
    <div className="rounded-[8px] border border-border-subtle bg-surface-card p-4 flex flex-col gap-2">
      <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
        {label}
      </span>
      <span className="text-2xl font-mono font-semibold text-text-primary tabular-nums leading-none">
        {typeof value === 'number' ? value.toLocaleString('en-US') : value}
      </span>
      {sub && <span className="text-xs text-text-muted">{sub}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

export function AnalyticsContent() {
  const { stats, isLoading, isError, mutate } = useStats();

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-[316px]" />
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  if (isError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-text-muted">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-sm text-text-secondary">
          Failed to load analytics data.
        </p>
        <Button variant="secondary" size="sm" onClick={mutate}>
          Retry
        </Button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Derived analytics metrics
  // -------------------------------------------------------------------------
  const { totalLeads, byTier, byOutreachStatus, recentScans, byTrade } = stats;

  const totalScans = recentScans.length;
  const completedScans = recentScans.filter((s) => s.status === 'completed').length;

  const hotPct =
    totalLeads > 0 ? Math.round((byTier.hot / totalLeads) * 100) : 0;

  const contacted = Object.entries(byOutreachStatus)
    .filter(([key]) => key !== 'new')
    .reduce((sum, [, v]) => sum + v, 0);

  const contactedPct =
    totalLeads > 0 ? Math.round((contacted / totalLeads) * 100) : 0;

  // -------------------------------------------------------------------------
  // Loaded state
  // -------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6">
      {/* Refresh */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={mutate}
          aria-label="Refresh analytics data"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          Refresh
        </Button>
      </div>

      {/* KPI summary tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AnalyticsTile
          label="Total Leads"
          value={totalLeads}
          sub="All time"
        />
        <AnalyticsTile
          label="Hot Rate"
          value={`${hotPct}%`}
          sub={`${byTier.hot.toLocaleString()} hot leads`}
        />
        <AnalyticsTile
          label="Contacted"
          value={`${contactedPct}%`}
          sub={`${contacted.toLocaleString()} leads reached`}
        />
        <AnalyticsTile
          label="Scans Completed"
          value={completedScans}
          sub={`${totalScans} total scans`}
        />
      </div>

      {/* Charts — 2-column grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LeadQualityChart byTier={byTier} />
        <ConversionChart byOutreachStatus={byOutreachStatus} />
        <ScanHistoryChart scans={recentScans} />
        <TopTradesCard byTrade={byTrade} />
      </div>
    </div>
  );
}
