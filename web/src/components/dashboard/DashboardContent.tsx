'use client';

import { useStats } from '@/hooks/useStats';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { StatsGrid } from './StatsGrid';
import { TierDistribution } from './TierDistribution';
import { WebsiteStatusChart } from './WebsiteStatusChart';
import { OutreachFunnel } from './OutreachFunnel';
import { RecentScans } from './RecentScans';

// --- Skeleton -------------------------------------------------------------

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-card border border-ink bg-cream-dark animate-pulse shadow-card ${className ?? ''}`}
    />
  );
}

// --- Top cities mini-chart ------------------------------------------------

function TopCitiesCard({
  byCity,
}: {
  byCity: { city: string; count: number }[];
}) {
  const top = byCity.slice(0, 8);
  const maxCount = Math.max(...top.map((c) => c.count), 1);

  return (
    <div className="rounded-card border border-ink bg-cream-dark shadow-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink/15">
        <h3 className="font-display text-lg tracking-wide text-ink uppercase">Top Cities</h3>
        <span className="text-xs text-rubble">{byCity.length} cities</span>
      </div>
      <div className="p-4">
        {top.length === 0 ? (
          <p className="py-8 text-sm text-center text-rubble">No data yet</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {top.map((item) => (
              <div key={item.city} className="flex items-center gap-3">
                <span
                  className="text-xs text-stone truncate shrink-0"
                  style={{ width: 90 }}
                >
                  {item.city}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-ink/8 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((item.count / maxCount) * 100)}%`,
                      backgroundColor: '#C4411A',
                      opacity: 0.75,
                    }}
                  />
                </div>
                <span className="text-xs font-display text-rubble tabular-nums w-8 text-right">
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

// --- Main client component ------------------------------------------------

export function DashboardContent() {
  const { stats, isLoading, isError, mutate } = useStats();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-[316px]" />
          ))}
        </div>
        <SkeletonBlock className="h-64" />
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-rubble">
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
        <p className="text-sm text-stone">
          Failed to load dashboard stats.
        </p>
        <Button variant="secondary" size="sm" onClick={mutate}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Refresh button row */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={mutate}
          aria-label="Refresh dashboard data"
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

      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TierDistribution byTier={stats.byTier} />
        <OutreachFunnel byOutreachStatus={stats.byOutreachStatus} />
        <WebsiteStatusChart byWebsiteStatus={stats.byWebsiteStatus} />
        <TopCitiesCard byCity={stats.byCity} />
      </div>

      <RecentScans scans={stats.recentScans} />
    </div>
  );
}
