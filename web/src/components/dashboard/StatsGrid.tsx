'use client';

import { cn } from '@/lib/cn';
import type { DashboardStats } from '@/lib/types';

interface StatCardProps {
  label: string;
  value: number | string;
  accent?: string;
  icon?: React.ReactNode;
  sublabel?: string;
}

function StatCard({ label, value, accent, icon, sublabel }: StatCardProps) {
  return (
    <div className="rounded-card border border-ink bg-cream-dark p-5 flex flex-col gap-3 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-rubble uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <span className="text-stone">{icon}</span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span
          className={cn(
            'font-display text-4xl leading-none tabular-nums',
            accent ?? 'text-ink'
          )}
        >
          {typeof value === 'number' ? value.toLocaleString('en-US') : value}
        </span>
      </div>
      {sublabel && (
        <span className="text-xs text-rubble">{sublabel}</span>
      )}
    </div>
  );
}

// --- Icons ----------------------------------------------------------------

function FireIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#C4411A"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 01-7 7 7 7 0 01-7-7c0-1.02.22-2 .7-3 1 1.5 2 3 2.3 3.5z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6B6560"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6B6560"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.82 19.79 19.79 0 01.07 1.18 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6B6560"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

// --- Main component -------------------------------------------------------

interface StatsGridProps {
  stats: DashboardStats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  const contacted = Object.entries(stats.byOutreachStatus)
    .filter(([key]) => key !== 'new')
    .reduce((sum, [, count]) => sum + count, 0);

  const scansRun = stats.recentScans.length;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Total Leads"
        value={stats.totalLeads}
        icon={<UsersIcon />}
        sublabel="All businesses in database"
      />
      <StatCard
        label="Hot Leads"
        value={stats.byTier.hot}
        accent="text-accent"
        icon={<FireIcon />}
        sublabel="Score 12+ or manually flagged"
      />
      <StatCard
        label="Contacted"
        value={contacted}
        icon={<PhoneIcon />}
        sublabel="Outreach status past 'new'"
      />
      <StatCard
        label="Scans Run"
        value={scansRun}
        icon={<ScanIcon />}
        sublabel="Recent discovery scans"
      />
    </div>
  );
}
