'use client';

import { Suspense, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { LeadsToolbar } from '@/components/leads/LeadsToolbar';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { LeadDrawer } from '@/components/leads/LeadDrawer';
import { BulkActionBar } from '@/components/leads/BulkActionBar';
import { useLeads } from '@/hooks/useLeads';
import { useDebounce } from '@/hooks/useDebounce';
import { EMPTY_FILTERS, type FilterPanelValues } from '@/components/leads/FilterPanel';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Lead, LeadTier, WebsiteStatus, OutreachStatus } from '@/lib/types';

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page:       number;
  totalPages: number;
  total:      number;
  limit:      number;
  onPage:     (page: number) => void;
  onLimit:    (limit: number) => void;
}

function Pagination({ page, totalPages, total, limit, onPage, onLimit }: PaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-muted">
          {total === 0 ? '0 results' : `${start}–${end} of ${total.toLocaleString()}`}
        </span>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-text-muted">Rows:</label>
          <select
            value={limit}
            onChange={(e) => onLimit(Number(e.target.value))}
            className={cn(
              'h-7 appearance-none rounded-[5px] border bg-surface-input px-2 pr-6 text-xs text-text-primary',
              'border-border outline-none cursor-pointer',
              'focus:border-border-focus'
            )}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size} className="bg-surface-card">
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <PageButton onClick={() => onPage(1)} disabled={page <= 1} aria-label="First page">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L5 7l4 4M3.5 3v8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </PageButton>

        <PageButton onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </PageButton>

        {getPageNumbers(page, totalPages).map((p, i) =>
          p === null ? (
            <span key={`ellipsis-${i}`} className="px-1 text-text-muted text-xs select-none">…</span>
          ) : (
            <PageButton key={p} onClick={() => onPage(p)} active={p === page}>
              {p}
            </PageButton>
          )
        )}

        <PageButton onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Next page">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </PageButton>

        <PageButton onClick={() => onPage(totalPages)} disabled={page >= totalPages} aria-label="Last page">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4M10.5 3v8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </PageButton>
      </div>
    </div>
  );
}

interface PageButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: React.ReactNode;
}

function PageButton({ active, children, disabled, className, ...props }: PageButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'h-7 min-w-[28px] px-1.5 rounded-[5px] text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        'disabled:opacity-30 disabled:cursor-not-allowed',
        active
          ? 'bg-accent text-white'
          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function getPageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | null)[] = [];
  pages.push(1);
  if (current > 3) pages.push(null);
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push(null);
  pages.push(total);
  return pages;
}

// ─── URL param helpers ────────────────────────────────────────────────────────

function getParam(params: URLSearchParams, key: string): string {
  return params.get(key) ?? '';
}

function getArrayParam(params: URLSearchParams, key: string): string[] {
  return params.getAll(key);
}

function getNumberParam(params: URLSearchParams, key: string): number | undefined {
  const v = params.get(key);
  return v ? parseInt(v, 10) : undefined;
}

// ─── Inner page (uses useSearchParams — must be wrapped in Suspense) ──────────

function LeadsPageInner() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // ── Filters state from URL ──
  const [search,    setSearch]    = useState(() => getParam(searchParams, 'search'));
  const [trade,     setTrade]     = useState(() => getParam(searchParams, 'trade'));
  const [city,      setCity]      = useState(() => getParam(searchParams, 'city'));
  const [page,      setPage]      = useState(() => parseInt(searchParams.get('page') ?? '1', 10));
  const [limit,     setLimit]     = useState(() => parseInt(searchParams.get('limit') ?? String(DEFAULT_PAGE_SIZE), 10));
  const [sortKey,   setSortKey]   = useState(() => getParam(searchParams, 'sort') || 'lead_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => (searchParams.get('order') as 'asc' | 'desc') || 'desc');

  const [filters, setFilters] = useState<FilterPanelValues>(() => ({
    tier:            getArrayParam(searchParams, 'tier') as LeadTier[],
    website_status:  getArrayParam(searchParams, 'website_status') as WebsiteStatus[],
    outreach_status: getArrayParam(searchParams, 'outreach_status') as OutreachStatus[],
    min_score:       getNumberParam(searchParams, 'min_score'),
  }));

  // ── UI state ──
  const [selectedIds,  setSelectedIds]  = useState<Set<number>>(new Set());
  const [drawerLeadId, setDrawerLeadId] = useState<number | null>(null);
  const [drawerOpen,   setDrawerOpen]   = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // ── URL sync helper ──
  const updateUrl = useCallback(
    (updates: Record<string, string | string[] | number | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        params.delete(key);
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else if (value !== undefined && value !== '' && String(value) !== '') {
          params.set(key, String(value));
        }
      });
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // ── Data fetch ──
  const { leads, pagination, isLoading, isError, mutate } = useLeads({
    search:          debouncedSearch  || undefined,
    trade:           trade            || undefined,
    city:            city             || undefined,
    tier:            filters.tier.length > 0            ? filters.tier            : undefined,
    website_status:  filters.website_status.length > 0  ? filters.website_status  : undefined,
    outreach_status: filters.outreach_status.length > 0 ? filters.outreach_status : undefined,
    min_score:       filters.min_score,
    page,
    limit,
    sort:  sortKey,
    order: sortOrder,
  });

  // Unique cities extracted from current data set
  const cities = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => { if (l.city) set.add(l.city); });
    return Array.from(set).sort();
  }, [leads]);

  // ── Handlers ──
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
    updateUrl({ search: val, page: undefined });
  }, [updateUrl]);

  const handleTrade = useCallback((val: string) => {
    setTrade(val);
    setPage(1);
    updateUrl({ trade: val, page: undefined });
  }, [updateUrl]);

  const handleCity = useCallback((val: string) => {
    setCity(val);
    setPage(1);
    updateUrl({ city: val, page: undefined });
  }, [updateUrl]);

  const handleFilters = useCallback((vals: FilterPanelValues) => {
    setFilters(vals);
    setPage(1);
    updateUrl({
      tier:            vals.tier,
      website_status:  vals.website_status,
      outreach_status: vals.outreach_status,
      min_score:       vals.min_score,
      page:            undefined,
    });
  }, [updateUrl]);

  const handleClear = useCallback(() => {
    setSearch('');
    setTrade('');
    setCity('');
    setFilters(EMPTY_FILTERS);
    setPage(1);
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const handleSort = useCallback((key: string) => {
    const newOrder: 'asc' | 'desc' = sortKey === key && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortKey(key);
    setSortOrder(newOrder);
    setPage(1);
    updateUrl({ sort: key, order: newOrder, page: undefined });
  }, [sortKey, sortOrder, updateUrl]);

  const handlePage = useCallback((p: number) => {
    setPage(p);
    updateUrl({ page: p });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [updateUrl]);

  const handleLimit = useCallback((l: number) => {
    setLimit(l);
    setPage(1);
    updateUrl({ limit: l, page: undefined });
  }, [updateUrl]);

  const handleSelectOne = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? new Set(leads.map((l) => l.id)) : new Set());
  }, [leads]);

  const handleLeadClick = useCallback((lead: Lead) => {
    setDrawerLeadId(lead.id);
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleMutate = useCallback(() => { void mutate(); }, [mutate]);

  // ── Export query string ──
  const exportParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (trade) params.set('trade', trade);
    if (city)  params.set('city',  city);
    filters.tier.forEach((t)            => params.append('tier', t));
    filters.website_status.forEach((s)  => params.append('website_status', s));
    filters.outreach_status.forEach((s) => params.append('outreach_status', s));
    if (filters.min_score !== undefined)  params.set('min_score', String(filters.min_score));
    return params.toString();
  }, [debouncedSearch, trade, city, filters]);

  return (
    <PageShell title="Leads" noPadding>
      <div className="flex flex-col h-full min-h-0">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-border-subtle shrink-0">
          <LeadsToolbar
            search={search}
            onSearch={handleSearch}
            trade={trade}
            onTrade={handleTrade}
            city={city}
            onCity={handleCity}
            filters={filters}
            onFilters={handleFilters}
            onClear={handleClear}
            total={pagination?.total ?? 0}
            showing={leads.length}
            exportParams={exportParams}
            cities={cities}
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <LeadsTable
            leads={leads}
            selectedIds={selectedIds}
            isLoading={isLoading}
            isError={isError}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            onSelectOne={handleSelectOne}
            onSelectAll={handleSelectAll}
            onLeadClick={handleLeadClick}
            onStatusSaved={handleMutate}
          />
        </div>

        {/* Pagination */}
        {!isLoading && pagination && pagination.totalPages > 0 && (
          <div className="px-6 border-t border-border-subtle shrink-0">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={limit}
              onPage={handlePage}
              onLimit={handleLimit}
            />
          </div>
        )}
      </div>

      {/* Drawer */}
      <LeadDrawer
        leadId={drawerLeadId}
        open={drawerOpen}
        onClose={handleDrawerClose}
      />

      {/* Bulk Actions */}
      <BulkActionBar
        selectedIds={Array.from(selectedIds)}
        onDeselect={() => setSelectedIds(new Set())}
        onBulkUpdate={handleMutate}
      />
    </PageShell>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsPageInner />
    </Suspense>
  );
}
