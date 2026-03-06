'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

// --- Icons ----------------------------------------------------------------

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function LeadsIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 14c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function PipelineIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1.5" y="3" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="6.5" y="5" width="3" height="8" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11.5" y="7" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ScanIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M1.5 5V3a1 1 0 011-1H4M12 2h1.5a1 1 0 011 1v2M14.5 11v2a1 1 0 01-1 1H12M4 14H2.5a1 1 0 01-1-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function AnalyticsIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M2 12l3.5-4 3 2 3-5 2.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 14h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// --- Nav config -----------------------------------------------------------

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',  Icon: DashboardIcon },
  { href: '/leads',      label: 'Leads',      Icon: LeadsIcon },
  { href: '/pipeline',   label: 'Pipeline',   Icon: PipelineIcon },
  { href: '/scan',       label: 'Scan',       Icon: ScanIcon },
  { href: '/analytics',  label: 'Analytics',  Icon: AnalyticsIcon },
] as const;

// --- Sidebar --------------------------------------------------------------

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{ width: 240 }}
      className="fixed inset-y-0 left-0 z-30 flex flex-col bg-ink border-r border-ink"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-accent">
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L12 4v6L7 13 2 10V4L7 1z" fill="#EDE9E1" fillOpacity="0.9" />
          </svg>
        </div>
        <span className="font-display text-xl tracking-wider text-cream uppercase">
          LeadGen
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="Main navigation">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-sm font-medium transition-colors duration-100',
                    isActive
                      ? 'bg-accent text-cream'
                      : 'text-cream/60 hover:bg-white/8 hover:text-cream'
                  )}
                >
                  <Icon
                    className={cn(
                      'shrink-0 transition-colors',
                      isActive ? 'text-cream' : 'text-cream/40'
                    )}
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="shrink-0 px-5 py-3 border-t border-white/10">
        <p className="text-[11px] text-cream/40 leading-tight">LeadGen v1.0.0</p>
        <p className="text-[11px] text-cream/25 leading-tight">Local Business CRM</p>
      </div>
    </aside>
  );
}
