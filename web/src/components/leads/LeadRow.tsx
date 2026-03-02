'use client';

import { useState } from 'react';
import { TierBadge, WebsiteBadge } from '@/components/ui/Badge';
import { formatPhone, formatScore, formatRating, formatCount } from '@/lib/formatters';
import { OUTREACH_STATUSES, OUTREACH_COLOR_MAP } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Lead, OutreachStatus } from '@/lib/types';

// ─── Icons ───────────────────────────────────────────────────────────────────

function ExternalLinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="inline-block ml-1 shrink-0">
      <path d="M4.5 2H2.5a1 1 0 00-1 1V8.5a1 1 0 001 1h6a1 1 0 001-1V6.5M6.5 1h3m0 0v3m0-3l-4.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill={filled ? '#f59e0b' : 'none'} className="shrink-0">
      <path d="M5 1l1.12 2.5 2.63.25-1.9 1.72.55 2.63L5 6.75 2.6 8.1l.55-2.63L1.25 3.75l2.63-.25L5 1z" stroke="#f59e0b" strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Inline Outreach Dropdown ─────────────────────────────────────────────────

interface InlineOutreachProps {
  leadId:   number;
  current:  OutreachStatus;
  onSaved?: () => void;
}

function InlineOutreach({ leadId, current, onSaved }: InlineOutreachProps) {
  const [saving,  setSaving]  = useState(false);
  const [value,   setValue]   = useState<OutreachStatus>(current);

  const colorConfig = OUTREACH_COLOR_MAP[value];

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as OutreachStatus;
    setValue(next);
    setSaving(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ outreach_status: next }),
      });
      onSaved?.();
    } catch {
      setValue(current); // revert on error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="relative"
      onClick={(e) => e.stopPropagation()} // prevent row click
    >
      <select
        value={value}
        onChange={(e) => void handleChange(e)}
        disabled={saving}
        className={cn(
          'h-6 appearance-none rounded-[4px] pl-2 pr-6 text-[11px] font-medium',
          'border border-transparent cursor-pointer outline-none transition-colors',
          'disabled:opacity-60',
          'focus:ring-1 focus:ring-border-focus'
        )}
        style={{
          backgroundColor: colorConfig?.bgColor ?? '#27272a',
          color:           colorConfig?.textColor ?? '#a1a1aa',
        }}
      >
        {OUTREACH_STATUSES.map((s) => (
          <option
            key={s.value}
            value={s.value}
            className="bg-surface-card text-text-primary"
          >
            {s.label}
          </option>
        ))}
      </select>
      {/* Chevron */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5" style={{ color: colorConfig?.textColor ?? '#a1a1aa' }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 3.75l2.5 2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// ─── Star Rating Row ──────────────────────────────────────────────────────────

function MiniStars({ rating, count }: { rating: number | null; count: number | null }) {
  if (rating === null) return <span className="text-text-muted">—</span>;
  const filled = Math.round(rating);
  return (
    <div className="flex items-center gap-1">
      <span className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon key={i} filled={i < filled} />
        ))}
      </span>
      <span className="text-[11px] text-text-muted">
        {formatRating(rating)}
        {count !== null && ` (${formatCount(count)})`}
      </span>
    </div>
  );
}

// ─── LeadRow ─────────────────────────────────────────────────────────────────

export interface LeadRowProps {
  lead:         Lead;
  selected:     boolean;
  onSelect:     (id: number, checked: boolean) => void;
  onClick:      (lead: Lead) => void;
  onStatusSaved?: () => void;
}

export function LeadRow({ lead, selected, onSelect, onClick, onStatusSaved }: LeadRowProps) {
  const trades = lead.trades
    ? lead.trades.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const scoreColor =
    lead.lead_score > 60 ? 'text-green-400' :
    lead.lead_score > 30 ? 'text-amber-400' :
    lead.lead_score < 0  ? 'text-red-400'   :
    'text-text-secondary';

  return (
    <tr
      onClick={() => onClick(lead)}
      className={cn(
        'border-b border-border-subtle transition-colors duration-75 cursor-pointer group',
        selected ? 'bg-accent/5' : 'hover:bg-surface-hover'
      )}
      style={{ height: '44px' }}
    >
      {/* Checkbox */}
      <td className="px-3 py-0 align-middle w-10" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(lead.id, e.target.checked)}
          className="h-3.5 w-3.5 rounded-sm border-border accent-accent cursor-pointer"
          aria-label={`Select ${lead.name}`}
        />
      </td>

      {/* Name + Address */}
      <td className="px-3 py-0 align-middle min-w-[180px] max-w-[240px]">
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium text-text-primary truncate group-hover:text-accent transition-colors">
            {lead.name}
          </span>
          {lead.address && (
            <span className="text-[11px] text-text-muted truncate">{lead.address}</span>
          )}
        </div>
      </td>

      {/* Phone */}
      <td className="px-3 py-0 align-middle w-36" onClick={(e) => e.stopPropagation()}>
        {lead.phone ? (
          <a
            href={`tel:${lead.phone}`}
            className="text-sm text-text-secondary hover:text-accent transition-colors font-mono whitespace-nowrap"
          >
            {formatPhone(lead.phone)}
          </a>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>

      {/* City */}
      <td className="px-3 py-0 align-middle w-28">
        <span className="text-sm text-text-secondary truncate">{lead.city ?? '—'}</span>
      </td>

      {/* Trades */}
      <td className="px-3 py-0 align-middle max-w-[160px]">
        <div className="flex flex-wrap gap-1">
          {trades.slice(0, 2).map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium bg-surface-active text-text-muted whitespace-nowrap"
            >
              {t}
            </span>
          ))}
          {trades.length > 2 && (
            <span className="text-[10px] text-text-muted">+{trades.length - 2}</span>
          )}
        </div>
      </td>

      {/* Score */}
      <td className="px-3 py-0 align-middle w-16 text-right">
        <span className={cn('text-sm font-semibold font-mono tabular-nums', scoreColor)}>
          {formatScore(lead.lead_score)}
        </span>
      </td>

      {/* Tier */}
      <td className="px-3 py-0 align-middle w-16">
        <TierBadge tier={lead.lead_tier} size="sm" />
      </td>

      {/* Website */}
      <td className="px-3 py-0 align-middle w-32" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <WebsiteBadge status={lead.website_status} size="sm" />
          {lead.website_url && (
            <a
              href={lead.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-accent transition-colors"
              aria-label={`Visit ${lead.name} website`}
            >
              <ExternalLinkIcon />
            </a>
          )}
        </div>
      </td>

      {/* Rating */}
      <td className="px-3 py-0 align-middle w-40">
        <MiniStars rating={lead.google_rating} count={lead.google_review_count} />
      </td>

      {/* Outreach */}
      <td className="px-3 py-0 align-middle w-36" onClick={(e) => e.stopPropagation()}>
        <InlineOutreach
          leadId={lead.id}
          current={lead.outreach_status}
          onSaved={onStatusSaved}
        />
      </td>

      {/* Yelp */}
      <td className="px-3 py-0 align-middle w-12 text-center">
        {lead.has_yelp === 'true' ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mx-auto text-green-400">
            <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span className="text-text-muted text-sm">—</span>
        )}
      </td>
    </tr>
  );
}
