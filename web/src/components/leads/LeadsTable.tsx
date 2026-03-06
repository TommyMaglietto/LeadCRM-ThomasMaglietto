'use client';

import { useCallback } from 'react';
import { LeadRow } from '@/components/leads/LeadRow';
import { cn } from '@/lib/cn';
import { Spinner } from '@/components/ui/Spinner';
import type { Lead } from '@/lib/types';

// ─── Column headers ───────────────────────────────────────────────────────────

interface HeaderCell {
  key:       string;
  label:     string;
  width?:    string;
  sortable?: boolean;
  className?: string;
}

const COLUMNS: HeaderCell[] = [
  { key: 'select',          label: '',             width: '40px'  },
  { key: 'name',            label: 'Name',         sortable: true },
  { key: 'phone',           label: 'Phone',        width: '144px' },
  { key: 'city',            label: 'City',         width: '112px', sortable: true },
  { key: 'trades',          label: 'Trades',       width: '160px' },
  { key: 'lead_score',      label: 'Score',        width: '64px',  sortable: true, className: 'text-right' },
  { key: 'lead_tier',       label: 'Tier',         width: '64px',  sortable: true },
  { key: 'website_status',  label: 'Website',      width: '128px', sortable: true },
  { key: 'google_rating',   label: 'Rating',       width: '160px', sortable: true },
  { key: 'outreach_status', label: 'Outreach',     width: '144px', sortable: true },
  { key: 'has_yelp',        label: 'Yelp',         width: '48px',  className: 'text-center' },
];

// ─── Sort Icon ────────────────────────────────────────────────────────────────

function SortIcon({ active, order }: { active: boolean; order: 'asc' | 'desc' }) {
  return (
    <span className={cn('inline-flex flex-col ml-1 opacity-60 align-middle', active && 'opacity-100 text-accent')}>
      <svg width="7" height="5" viewBox="0 0 7 5" fill="currentColor" className={cn('mb-px', active && order === 'asc' ? 'opacity-100' : 'opacity-40')}>
        <path d="M3.5 0L7 5H0L3.5 0Z" />
      </svg>
      <svg width="7" height="5" viewBox="0 0 7 5" fill="currentColor" className={cn(active && order === 'desc' ? 'opacity-100' : 'opacity-40')}>
        <path d="M3.5 5L0 0H7L3.5 5Z" />
      </svg>
    </span>
  );
}

// ─── LeadsTable ───────────────────────────────────────────────────────────────

interface LeadsTableProps {
  leads:        Lead[];
  selectedIds:  Set<number>;
  isLoading:    boolean;
  isError:      boolean;
  sortKey:      string;
  sortOrder:    'asc' | 'desc';
  onSort:       (key: string) => void;
  onSelectOne:  (id: number, checked: boolean) => void;
  onSelectAll:  (checked: boolean) => void;
  onLeadClick:  (lead: Lead) => void;
  onStatusSaved?: () => void;
}

export function LeadsTable({
  leads,
  selectedIds,
  isLoading,
  isError,
  sortKey,
  sortOrder,
  onSort,
  onSelectOne,
  onSelectAll,
  onLeadClick,
  onStatusSaved,
}: LeadsTableProps) {
  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));
  const someSelected = leads.some((l) => selectedIds.has(l.id));

  const handleHeaderCheck = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSelectAll(e.target.checked);
    },
    [onSelectAll]
  );

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm table-fixed">
        <colgroup>
          {COLUMNS.map((col) => (
            <col key={col.key} style={col.width ? { width: col.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-ink/10">
            {/* Checkbox all */}
            <th className="px-3 py-2.5 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={handleHeaderCheck}
                className="h-3.5 w-3.5 rounded-sm border-ink accent-accent cursor-pointer"
                aria-label="Select all leads"
              />
            </th>

            {COLUMNS.slice(1).map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-3 py-2.5 text-left text-xs font-medium text-rubble whitespace-nowrap select-none',
                  col.sortable && 'cursor-pointer hover:text-stone transition-colors',
                  col.className
                )}
                onClick={col.sortable ? () => onSort(col.key) : undefined}
              >
                {col.label}
                {col.sortable && (
                  <SortIcon active={sortKey === col.key} order={sortOrder} />
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={COLUMNS.length} className="py-16 text-center">
                <div className="flex items-center justify-center gap-2 text-rubble">
                  <Spinner size="sm" />
                  <span className="text-sm">Loading leads...</span>
                </div>
              </td>
            </tr>
          )}

          {isError && !isLoading && (
            <tr>
              <td colSpan={COLUMNS.length} className="py-16 text-center">
                <div className="flex flex-col items-center gap-2 text-sm text-red-600">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-600/60">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Failed to load leads. Please try refreshing.
                </div>
              </td>
            </tr>
          )}

          {!isLoading && !isError && leads.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-rubble">
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <rect x="6" y="10" width="24" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12 18h12M12 24h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="27" cy="9" r="5" fill="#EDE9E1" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M25 9h4M27 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <p className="text-sm font-medium text-stone">No leads found</p>
                  <p className="text-xs max-w-xs">Try adjusting your filters or run a new scan to find leads.</p>
                </div>
              </td>
            </tr>
          )}

          {!isLoading && !isError && leads.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              selected={selectedIds.has(lead.id)}
              onSelect={onSelectOne}
              onClick={onLeadClick}
              onStatusSaved={onStatusSaved}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
