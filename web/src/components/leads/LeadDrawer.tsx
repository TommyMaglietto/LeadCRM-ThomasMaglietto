'use client';

import { useState, useCallback } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { TierBadge, WebsiteBadge } from '@/components/ui/Badge';
import { Dropdown } from '@/components/ui/Dropdown';
import { Spinner } from '@/components/ui/Spinner';
import { NotesEditor } from '@/components/leads/NotesEditor';
import { CallLog } from '@/components/leads/CallLog';
import { useLead } from '@/hooks/useLead';
import { formatPhone, formatDate, formatRating, formatCount, formatScore, humanize } from '@/lib/formatters';
import { OUTREACH_STATUSES } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Lead, OutreachStatus } from '@/lib/types';

// ─── Icons ───────────────────────────────────────────────────────────────────

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <path d="M2 3a1 1 0 011-1h1.5a1 1 0 011 .75l.5 2a1 1 0 01-.29.94L4.8 6.15a7.5 7.5 0 003.05 3.05l.46-.91a1 1 0 01.94-.29l2 .5a1 1 0 01.75 1V11a1 1 0 01-1 1h-1C5.5 12 2 8.5 2 4V3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.2" />
      <ellipse cx="7" cy="7" rx="2.25" ry="5.25" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.75 5.25h10.5M1.75 8.75h10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <path d="M7 1.75a3.5 3.5 0 013.5 3.5c0 2.625-3.5 7-3.5 7S3.5 7.875 3.5 5.25A3.5 3.5 0 017 1.75z" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="7" cy="5.25" r="1.25" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill={filled ? '#f59e0b' : 'none'} className="shrink-0">
      <path d="M6 1l1.4 3h3.1L7.9 6.1l1 3L6 7.5 3.1 9.1l1-3L1.5 4H4.6L6 1z" stroke="#f59e0b" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
      <path d="M5 2.5H2.5a1 1 0 00-1 1V9.5a1 1 0 001 1h6a1 1 0 001-1V7M7.5 1.5H10.5M10.5 1.5V4.5M10.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Star Rating ─────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-text-muted text-xs">—</span>;
  const stars = Math.round(rating);
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon key={i} filled={i < stars} />
      ))}
    </span>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">{title}</h3>
      {children}
    </div>
  );
}

// ─── Detail Grid Item ─────────────────────────────────────────────────────────

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-text-muted uppercase tracking-wide">{label}</span>
      <div className="text-sm text-text-primary">{children}</div>
    </div>
  );
}

// ─── Outreach Dropdown ────────────────────────────────────────────────────────

interface OutreachSelectorProps {
  leadId:  number;
  current: OutreachStatus;
  onSaved: () => void;
}

function OutreachSelector({ leadId, current, onSaved }: OutreachSelectorProps) {
  const [saving, setSaving] = useState(false);

  const handleChange = async (value: string) => {
    setSaving(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ outreach_status: value }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const options = OUTREACH_STATUSES.map((s) => ({ value: s.value, label: s.label }));

  return (
    <div className="relative flex-1">
      <Dropdown
        label="Outreach Status"
        options={options}
        value={current}
        onChange={(v) => void handleChange(v)}
        disabled={saving}
      />
      {saving && (
        <div className="absolute right-8 top-7 flex items-center">
          <Spinner size="xs" />
        </div>
      )}
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

interface LeadDrawerProps {
  leadId:  number | null;
  open:    boolean;
  onClose: () => void;
}

export function LeadDrawer({ leadId, open, onClose }: LeadDrawerProps) {
  const { lead, callLog, isLoading, mutate } = useLead(open ? leadId : null);

  const handleLeadSaved = useCallback(() => {
    void mutate();
  }, [mutate]);

  const trades = lead?.trades ? lead.trades.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const googleSearchUrl = lead
    ? `https://www.google.com/search?q=${encodeURIComponent(
        `${lead.name}${lead.city ? ` ${lead.city}` : ''}${lead.state ? ` ${lead.state}` : ''}`
      )}`
    : null;

  const drawerTitle = lead ? (
    <a
      href={googleSearchUrl!}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-accent transition-colors hover:underline underline-offset-2"
    >
      {lead.name}
    </a>
  ) : 'Lead Details';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={drawerTitle}
      width={520}
    >
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <Spinner size="md" />
        </div>
      )}

      {!isLoading && !lead && (
        <div className="flex items-center justify-center h-48 text-text-muted text-sm">
          Lead not found.
        </div>
      )}

      {lead && (
        <div className="flex flex-col gap-6 p-5">
          {/* ── Tier + Score badges under the header ── */}
          <div className="flex items-center gap-2 -mt-1 flex-wrap">
            <TierBadge tier={lead.lead_tier} />
            <span
              className={cn(
                'text-xs font-semibold font-mono',
                lead.lead_score > 0 ? 'text-green-400' : lead.lead_score < 0 ? 'text-red-400' : 'text-text-muted'
              )}
            >
              Score: {formatScore(lead.lead_score)}
            </span>
          </div>

          {/* ── Contact Info ── */}
          <Section title="Contact">
            <div className="flex flex-col gap-2">
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-2 text-sm text-text-primary hover:text-accent transition-colors"
                >
                  <span className="text-text-muted"><PhoneIcon /></span>
                  {formatPhone(lead.phone)}
                </a>
              )}

              {lead.website_url && (
                <a
                  href={lead.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-text-primary hover:text-accent transition-colors group"
                >
                  <span className="text-text-muted"><GlobeIcon /></span>
                  <span className="truncate">{lead.website_url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted">
                    <ExternalLinkIcon />
                  </span>
                </a>
              )}

              {lead.address && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <span className="text-text-muted"><MapPinIcon /></span>
                  <span>{lead.address}{lead.city ? `, ${lead.city}` : ''}{lead.state ? `, ${lead.state}` : ''}</span>
                </div>
              )}

              {lead.google_rating !== null && (
                <div className="flex items-center gap-2">
                  <StarRating rating={lead.google_rating} />
                  <span className="text-sm text-text-secondary">
                    {formatRating(lead.google_rating)}
                    {lead.google_review_count !== null && (
                      <span className="text-text-muted ml-1">({formatCount(lead.google_review_count)} reviews)</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </Section>

          {/* ── Outreach Status ── */}
          <Section title="Status">
            <OutreachSelector
              leadId={lead.id}
              current={lead.outreach_status}
              onSaved={handleLeadSaved}
            />
          </Section>

          {/* ── Details Grid ── */}
          <Section title="Details">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <DetailItem label="Website Status">
                <WebsiteBadge status={lead.website_status} size="sm" />
              </DetailItem>

              <DetailItem label="Franchise">
                <span className={cn(
                  'text-sm',
                  lead.franchise_flag === 'definite_franchise' ? 'text-red-400' :
                  lead.franchise_flag === 'likely_franchise'   ? 'text-amber-400' :
                  'text-text-secondary'
                )}>
                  {humanize(lead.franchise_flag)}
                </span>
              </DetailItem>

              <DetailItem label="Yelp">
                {lead.has_yelp === 'true' ? (
                  <span className="text-green-400 text-sm flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                    Yes
                  </span>
                ) : (
                  <span className="text-text-muted text-sm">—</span>
                )}
              </DetailItem>

              <DetailItem label="Trades">
                {trades.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {trades.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 rounded-[3px] text-[11px] bg-surface-active text-text-secondary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </DetailItem>

              <DetailItem label="First Seen">
                <span className="text-sm">{formatDate(lead.first_seen)}</span>
              </DetailItem>

              <DetailItem label="Last Enriched">
                <span className="text-sm">{formatDate(lead.last_enriched)}</span>
              </DetailItem>
            </div>
          </Section>

          {/* ── Notes ── */}
          <Section title="Notes">
            <NotesEditor
              leadId={lead.id}
              initialValue={lead.notes}
              onSaved={handleLeadSaved}
            />
          </Section>

          {/* ── Call Log ── */}
          <Section title="Call Log">
            <CallLog
              leadId={lead.id}
              entries={callLog}
              onAdded={handleLeadSaved}
            />
          </Section>
        </div>
      )}
    </Drawer>
  );
}
