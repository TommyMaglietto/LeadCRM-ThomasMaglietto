'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FilterPanel, type FilterPanelValues, hasActiveFilters } from '@/components/leads/FilterPanel';
import { DEFAULT_TRADES } from '@/lib/constants';
import { cn } from '@/lib/cn';

// ─── Icons ───────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9.25 9.25l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M1.75 3.5h10.5M3.5 7h7M5.25 10.5h3.5"
        stroke={active ? '#C4411A' : 'currentColor'}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.75v7M4.5 6.5L7 9l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 9.5v1.5a1 1 0 001 1h8a1 1 0 001-1V9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

interface LeadsToolbarProps {
  search:      string;
  onSearch:    (value: string) => void;
  trade:       string;
  onTrade:     (value: string) => void;
  city:        string;
  onCity:      (value: string) => void;
  filters:     FilterPanelValues;
  onFilters:   (values: FilterPanelValues) => void;
  onClear:     () => void;
  total:       number;
  showing:     number;
  exportParams: string;
  cities:      string[];
}

export function LeadsToolbar({
  search,
  onSearch,
  trade,
  onTrade,
  city,
  onCity,
  filters,
  onFilters,
  onClear,
  total,
  showing,
  exportParams,
  cities,
}: LeadsToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const filtersActive =
    hasActiveFilters(filters) ||
    !!trade ||
    !!city;

  // Close filter panel on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  const handleExport = () => {
    const url = `/api/leads/export${exportParams ? `?${exportParams}` : ''}`;
    window.location.href = url;
  };

  const tradeOptions = [
    { value: '', label: 'All Trades' },
    ...DEFAULT_TRADES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
  ];

  const cityOptions = [
    { value: '', label: 'All Cities' },
    ...cities.map((c) => ({ value: c, label: c })),
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Main toolbar row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="w-64">
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search name, phone, address..."
            leadingIcon={<SearchIcon />}
          />
        </div>

        {/* Trade dropdown */}
        <select
          value={trade}
          onChange={(e) => onTrade(e.target.value)}
          className={cn(
            'h-8 appearance-none rounded-[6px] border bg-cream pl-3 pr-8 text-sm',
            'border-ink transition-colors outline-none cursor-pointer',
            'focus:border-accent focus:ring-1 focus:ring-accent',
            trade ? 'text-ink' : 'text-rubble'
          )}
        >
          {tradeOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-cream text-ink">
              {opt.label}
            </option>
          ))}
        </select>

        {/* City dropdown */}
        {cities.length > 0 && (
          <select
            value={city}
            onChange={(e) => onCity(e.target.value)}
            className={cn(
              'h-8 appearance-none rounded-[6px] border bg-cream pl-3 pr-8 text-sm',
              'border-ink transition-colors outline-none cursor-pointer',
              'focus:border-accent focus:ring-1 focus:ring-accent',
              city ? 'text-ink' : 'text-rubble'
            )}
          >
            {cityOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-cream text-ink">
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {/* Filters toggle */}
        <Button
          variant={filtersActive ? 'primary' : 'secondary'}
          size="md"
          onClick={() => setFilterOpen((o) => !o)}
          leftIcon={<FilterIcon active={filtersActive} />}
        >
          Filters
          {filtersActive && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
              {[
                ...filters.tier,
                ...filters.website_status,
                ...filters.outreach_status,
                ...(filters.min_score !== undefined ? ['min_score'] : []),
                ...(trade ? ['trade'] : []),
                ...(city  ? ['city']  : []),
              ].length}
            </span>
          )}
        </Button>

        {/* Clear filters */}
        {filtersActive && (
          <Button variant="ghost" size="md" onClick={onClear}>
            Clear
          </Button>
        )}

        <div className="flex-1" />

        {/* Lead count */}
        <span className="text-xs text-rubble whitespace-nowrap">
          Showing <span className="text-stone font-medium">{showing.toLocaleString()}</span> of <span className="text-stone font-medium">{total.toLocaleString()}</span> leads
        </span>

        {/* Export */}
        <Button
          variant="secondary"
          size="md"
          onClick={handleExport}
          leftIcon={<DownloadIcon />}
        >
          Export CSV
        </Button>

        {/* New Scan */}
        <Link href="/scan">
          <Button
            variant="primary"
            size="md"
            leftIcon={<ScanIcon />}
          >
            New Scan
          </Button>
        </Link>
      </div>

      {/* Expandable filter panel */}
      {filterOpen && (
        <div
          ref={filterRef}
          className="rounded-[8px] border border-ink bg-cream-dark p-4 shadow-lg"
        >
          <FilterPanel
            values={filters}
            onChange={onFilters}
            onClear={onClear}
          />
        </div>
      )}
    </div>
  );
}
