'use client';

import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { LEAD_TIERS, WEBSITE_STATUSES, OUTREACH_STATUSES } from '@/lib/constants';
import type { LeadTier, WebsiteStatus, OutreachStatus } from '@/lib/types';

// ─── Multi-Select Chip Group ──────────────────────────────────────────────────

interface ChipGroupProps<T extends string> {
  label:    string;
  options:  { value: T; label: string; textColor?: string; bgColor?: string }[];
  selected: T[];
  onChange: (values: T[]) => void;
}

function ChipGroup<T extends string>({
  label,
  options,
  selected,
  onChange,
}: ChipGroupProps<T>) {
  const toggle = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-rubble uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={cn(
                'px-2.5 py-1 rounded-[4px] text-xs font-medium transition-all duration-100',
                'border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent'
              )}
              style={
                active
                  ? {
                      backgroundColor: opt.bgColor ?? 'rgba(196,65,26,0.15)',
                      color:           opt.textColor ?? '#9B2C1A',
                      borderColor:     opt.textColor ?? '#C4411A',
                    }
                  : {
                      backgroundColor: '#EDE9E1',
                      color:           '#9C9389',
                      borderColor:     '#1A1A18',
                    }
              }
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── FilterPanel ──────────────────────────────────────────────────────────────

export interface FilterPanelValues {
  tier:            LeadTier[];
  website_status:  WebsiteStatus[];
  outreach_status: OutreachStatus[];
  min_score:       number | undefined;
}

interface FilterPanelProps {
  values:   FilterPanelValues;
  onChange: (values: FilterPanelValues) => void;
  onClear:  () => void;
  className?: string;
}

const EMPTY_FILTERS: FilterPanelValues = {
  tier:            [],
  website_status:  [],
  outreach_status: [],
  min_score:       undefined,
};

function hasActiveFilters(values: FilterPanelValues): boolean {
  return (
    values.tier.length > 0            ||
    values.website_status.length > 0  ||
    values.outreach_status.length > 0 ||
    values.min_score !== undefined
  );
}

export function FilterPanel({ values, onChange, onClear, className }: FilterPanelProps) {
  const tierOptions = LEAD_TIERS.map((t) => ({
    value:     t.value as LeadTier,
    label:     t.label,
    bgColor:   t.bgColor,
    textColor: t.textColor,
  }));

  const websiteOptions = WEBSITE_STATUSES.map((s) => ({
    value:     s.value as WebsiteStatus,
    label:     s.label,
    bgColor:   s.bgColor,
    textColor: s.textColor,
  }));

  const outreachOptions = OUTREACH_STATUSES.map((s) => ({
    value:     s.value as OutreachStatus,
    label:     s.label,
    bgColor:   s.bgColor,
    textColor: s.textColor,
  }));

  const active = hasActiveFilters(values);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <ChipGroup
        label="Tier"
        options={tierOptions}
        selected={values.tier}
        onChange={(tier) => onChange({ ...values, tier })}
      />

      <ChipGroup
        label="Website Status"
        options={websiteOptions}
        selected={values.website_status}
        onChange={(website_status) => onChange({ ...values, website_status })}
      />

      <ChipGroup
        label="Outreach Status"
        options={outreachOptions}
        selected={values.outreach_status}
        onChange={(outreach_status) => onChange({ ...values, outreach_status })}
      />

      {/* Min Score */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-rubble uppercase tracking-wide" htmlFor="min-score">
          Min Score
        </label>
        <input
          id="min-score"
          type="number"
          min={-100}
          max={200}
          value={values.min_score ?? ''}
          onChange={(e) => {
            const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
            onChange({ ...values, min_score: v });
          }}
          placeholder="e.g. 50"
          className={cn(
            'h-8 w-32 rounded-[6px] border bg-cream px-3 text-sm text-ink placeholder:text-rubble',
            'border-ink transition-colors outline-none',
            'focus:border-accent focus:ring-1 focus:ring-accent'
          )}
        />
      </div>

      {/* Clear button */}
      {active && (
        <div className="pt-1">
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
}

export { hasActiveFilters, EMPTY_FILTERS };
