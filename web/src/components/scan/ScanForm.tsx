'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { CityAutocomplete, type SelectedCity } from '@/components/ui/CityAutocomplete';
import { DEFAULT_TRADES } from '@/lib/constants';

// ---------------------------------------------------------------------------
// US States list
// ---------------------------------------------------------------------------

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScanFormProps {
  onSubmit: (trades: string[], towns: string[], refresh: boolean) => Promise<void>;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// ScanForm
// ---------------------------------------------------------------------------

export function ScanForm({ onSubmit, isLoading = false }: ScanFormProps) {
  // Trade selection state
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set());

  // Town input state
  const [selectedCities, setSelectedCities] = useState<SelectedCity[]>([]);
  const [defaultState, setDefaultState] = useState('NC');
  const [refresh, setRefresh] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{ trades?: string; towns?: string }>({});

  // Fetch available trades from API — fall back to DEFAULT_TRADES if unavailable
  const [trades, setTrades] = useState<string[]>(DEFAULT_TRADES);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.ok ? r.json() as Promise<{ trades?: string[] }> : null)
      .then((data) => {
        if (data?.trades && Array.isArray(data.trades) && data.trades.length > 0) {
          setTrades(data.trades);
        }
      })
      .catch(() => {
        // Use default trades if API unavailable
      });
  }, []);

  // ---------------------------------------------------------------------------
  // Trade selection handlers
  // ---------------------------------------------------------------------------

  const toggleTrade = useCallback((trade: string) => {
    setSelectedTrades((prev) => {
      const next = new Set(prev);
      if (next.has(trade)) {
        next.delete(trade);
      } else {
        next.add(trade);
      }
      return next;
    });
    setErrors((e) => ({ ...e, trades: undefined }));
  }, []);

  const selectAll = useCallback(() => {
    setSelectedTrades(new Set(trades));
    setErrors((e) => ({ ...e, trades: undefined }));
  }, [trades]);

  const deselectAll = useCallback(() => {
    setSelectedTrades(new Set());
  }, []);

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const newErrors: typeof errors = {};

      if (selectedTrades.size === 0) {
        newErrors.trades = 'Select at least one trade.';
      }

      if (selectedCities.length === 0) {
        newErrors.towns = 'Select at least one town.';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setErrors({});
      const towns = selectedCities.map((c) => `${c.city}, ${c.state}`);
      await onSubmit([...selectedTrades], towns, refresh);
    },
    [selectedTrades, selectedCities, refresh, onSubmit]
  );

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="flex flex-col gap-6">
      {/* Trade picker */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-ink">
            Trades
            <span className="ml-1.5 text-xs font-normal text-rubble">
              ({selectedTrades.size}/{trades.length} selected)
            </span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-accent hover:text-accent-hover transition-colors font-medium"
            >
              Select all
            </button>
            <span className="text-rubble text-xs">|</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-xs text-stone hover:text-ink transition-colors font-medium"
            >
              Deselect all
            </button>
          </div>
        </div>

        {/* 3-column checkbox grid */}
        <div
          className={cn(
            'rounded-[8px] border p-3',
            errors.trades ? 'border-red-500/50 bg-red-500/5' : 'border-ink/10 bg-cream-dark'
          )}
        >
          <div className="grid grid-cols-3 gap-x-4 gap-y-2">
            {trades.map((trade) => {
              const checked = selectedTrades.has(trade);
              return (
                <label
                  key={trade}
                  className={cn(
                    'flex items-center gap-2 cursor-pointer rounded-[4px] px-1 py-0.5 -mx-1 -my-0.5',
                    'transition-colors hover:bg-ink/[0.03]',
                    'text-xs capitalize',
                    checked ? 'text-ink' : 'text-stone'
                  )}
                >
                  <span
                    className={cn(
                      'flex-shrink-0 w-3.5 h-3.5 rounded-[3px] border transition-all duration-100',
                      'flex items-center justify-center',
                      checked
                        ? 'bg-accent border-accent'
                        : 'border-ink bg-cream'
                    )}
                    aria-hidden="true"
                  >
                    {checked && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path
                          d="M1 3.5L3.5 6L8 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleTrade(trade)}
                    aria-label={trade}
                  />
                  {trade}
                </label>
              );
            })}
          </div>
        </div>

        {errors.trades && (
          <p className="text-xs text-red-600">{errors.trades}</p>
        )}
      </div>

      {/* Town input */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-ink">
            Towns
          </label>
          <p className="text-xs text-rubble">
            Type to search cities. Select from suggestions or paste comma-separated names.
          </p>
        </div>

        <div className="flex gap-2 items-start">
          {/* City autocomplete */}
          <div className="flex-1">
            <CityAutocomplete
              value={selectedCities}
              onChange={(cities) => {
                setSelectedCities(cities);
                setErrors((err) => ({ ...err, towns: undefined }));
              }}
              stateFilter={defaultState}
              placeholder="Search cities..."
              error={errors.towns}
              aria-label="Towns"
            />
          </div>

          {/* State dropdown */}
          <div className="w-28 shrink-0">
            <Dropdown
              options={US_STATES}
              value={defaultState}
              onChange={setDefaultState}
              aria-label="Default state"
            />
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-ink">Options</label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <span
            className={cn(
              'w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 transition-all duration-100',
              refresh
                ? 'bg-accent border-accent'
                : 'border-ink bg-cream group-hover:border-ink'
            )}
            aria-hidden="true"
          >
            {refresh && (
              <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                <path
                  d="M1 3.5L3.5 6L8 1"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <input
            type="checkbox"
            className="sr-only"
            checked={refresh}
            onChange={(e) => setRefresh(e.target.checked)}
          />
          <span className="text-sm text-stone group-hover:text-ink transition-colors">
            Re-enrich existing leads
            <span className="ml-1 text-xs text-rubble">
              (update previously seen businesses)
            </span>
          </span>
        </label>
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={isLoading}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Launching scan...' : 'Start Scan'}
      </Button>
    </form>
  );
}
