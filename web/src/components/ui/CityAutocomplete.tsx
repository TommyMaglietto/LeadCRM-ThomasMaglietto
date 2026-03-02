'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import Fuse from 'fuse.js';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CityEntry {
  city: string;
  state: string;
  pop: number;
}

export interface SelectedCity {
  city: string;
  state: string;
}

interface CityAutocompleteProps {
  /** Currently selected cities (controlled). */
  value: SelectedCity[];
  /** Called when the selection changes. */
  onChange: (cities: SelectedCity[]) => void;
  /** Two-letter state code to filter suggestions by. */
  stateFilter: string;
  /** Shown when no chips and input is empty. */
  placeholder?: string;
  /** Validation error message. */
  error?: string;
  /** Accessible label. */
  'aria-label'?: string;
}

// ---------------------------------------------------------------------------
// Dataset loader (lazy singleton)
// ---------------------------------------------------------------------------

let _citiesPromise: Promise<CityEntry[]> | null = null;

function loadCities(): Promise<CityEntry[]> {
  if (!_citiesPromise) {
    _citiesPromise = import('@/data/us-cities.json').then(
      (mod) => mod.default as CityEntry[]
    );
  }
  return _citiesPromise;
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatPop(pop: number): string {
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(1)}K`;
  return String(pop);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CityAutocomplete({
  value,
  onChange,
  stateFilter,
  placeholder = 'Search cities...',
  error,
  'aria-label': ariaLabel,
}: CityAutocompleteProps) {
  // -- State ----------------------------------------------------------------
  const [allCities, setAllCities] = useState<CityEntry[]>([]);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // -- Refs -----------------------------------------------------------------
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // -- Load dataset on first focus ------------------------------------------
  const handleFocus = useCallback(() => {
    if (!loaded) {
      loadCities().then((data) => {
        setAllCities(data);
        setLoaded(true);
      });
    }
  }, [loaded]);

  // -- Fuse instance filtered by state --------------------------------------
  const fuse = useMemo(() => {
    const filtered = allCities.filter((c) => c.state === stateFilter);
    return new Fuse(filtered, {
      keys: ['city'],
      threshold: 0.35,
      distance: 100,
      minMatchCharLength: 1,
    });
  }, [allCities, stateFilter]);

  // -- Compute suggestions --------------------------------------------------
  const suggestions = useMemo(() => {
    if (!query.trim()) {
      // Show top cities by population when input is empty but focused
      const filtered = allCities
        .filter((c) => c.state === stateFilter)
        .slice(0, 8);
      return filtered;
    }

    return fuse
      .search(query, { limit: 8 })
      .map((r) => r.item);
  }, [query, fuse, allCities, stateFilter]);

  // Filter out already-selected cities from suggestions
  const filteredSuggestions = useMemo(() => {
    const selectedKeys = new Set(
      value.map((c) => `${c.city}|${c.state}`)
    );
    return suggestions.filter(
      (s) => !selectedKeys.has(`${s.city}|${s.state}`)
    );
  }, [suggestions, value]);

  // -- Reset highlight when suggestions change ------------------------------
  useEffect(() => {
    setHighlightIdx(0);
  }, [filteredSuggestions.length]);

  // -- Scroll highlighted item into view ------------------------------------
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlightIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  // -- Close on outside click -----------------------------------------------
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // -- Handlers -------------------------------------------------------------

  const addCity = useCallback(
    (city: SelectedCity) => {
      const alreadySelected = value.some(
        (c) => c.city === city.city && c.state === city.state
      );
      if (!alreadySelected) {
        onChange([...value, city]);
      }
      setQuery('');
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [value, onChange]
  );

  const removeCity = useCallback(
    (idx: number) => {
      onChange(value.filter((_, i) => i !== idx));
      inputRef.current?.focus();
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightIdx((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIdx((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (isOpen && filteredSuggestions.length > 0) {
          e.preventDefault();
          addCity({
            city: filteredSuggestions[highlightIdx].city,
            state: filteredSuggestions[highlightIdx].state,
          });
        } else if (e.key === 'Enter' && query.trim()) {
          // Accept freeform entry if not in suggestions
          e.preventDefault();
          addCity({ city: query.trim(), state: stateFilter });
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'Backspace' && !query && value.length > 0) {
        // Remove last chip on backspace in empty input
        removeCity(value.length - 1);
      }
    },
    [isOpen, filteredSuggestions, highlightIdx, query, value, addCity, removeCity, stateFilter]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Handle paste of comma-separated cities
      if (raw.includes(',')) {
        const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
        const newCities: SelectedCity[] = [];
        for (const part of parts) {
          // Check if it matches a known city in the state
          const match = allCities.find(
            (c) =>
              c.state === stateFilter &&
              c.city.toLowerCase() === part.toLowerCase()
          );
          if (match) {
            newCities.push({ city: match.city, state: match.state });
          } else if (part.length > 0) {
            newCities.push({ city: part, state: stateFilter });
          }
        }

        if (newCities.length > 0) {
          const selectedKeys = new Set(
            value.map((c) => `${c.city}|${c.state}`)
          );
          const unique = newCities.filter(
            (c) => !selectedKeys.has(`${c.city}|${c.state}`)
          );
          onChange([...value, ...unique]);
        }
        setQuery('');
        return;
      }

      setQuery(raw);
      setIsOpen(true);
    },
    [allCities, stateFilter, value, onChange]
  );

  // -- Render ---------------------------------------------------------------

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      {/* Input container (looks like one input field) */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          'flex flex-wrap items-center gap-1.5 min-h-[32px] w-full rounded-[6px] border bg-surface-input px-2 py-1',
          'border-border transition-colors duration-150 cursor-text',
          'focus-within:border-border-focus focus-within:ring-1 focus-within:ring-border-focus',
          error && 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500'
        )}
      >
        {/* Chips */}
        {value.map((c, i) => (
          <span
            key={`${c.city}-${c.state}-${i}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-active text-text-secondary max-w-[180px]"
          >
            <span className="truncate">
              {c.city}, {c.state}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeCity(i);
              }}
              className="flex-shrink-0 ml-0.5 text-text-muted hover:text-text-primary transition-colors rounded-full"
              aria-label={`Remove ${c.city}`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 3l6 6M9 3l-6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </span>
        ))}

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            handleFocus();
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none h-6"
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          autoComplete="off"
        />
      </div>

      {/* Dropdown */}
      {isOpen && filteredSuggestions.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className={cn(
            'absolute top-full left-0 right-0 z-50 mt-1',
            'max-h-[240px] overflow-y-auto',
            'rounded-[6px] border border-border-subtle bg-surface-card shadow-lg',
            'py-1'
          )}
        >
          {filteredSuggestions.map((s, i) => (
            <li
              key={`${s.city}-${s.state}`}
              role="option"
              aria-selected={i === highlightIdx}
              onMouseEnter={() => setHighlightIdx(i)}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur
                addCity({ city: s.city, state: s.state });
              }}
              className={cn(
                'flex items-center justify-between px-3 py-1.5 cursor-pointer transition-colors',
                i === highlightIdx
                  ? 'bg-surface-hover'
                  : 'hover:bg-surface-hover'
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-medium text-text-primary truncate">
                  {s.city}
                </span>
                <span className="text-xs text-text-muted flex-shrink-0">
                  {s.state}
                </span>
              </div>
              <span className="text-[10px] text-text-muted tabular-nums flex-shrink-0 ml-3">
                {formatPop(s.pop)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Loading state */}
      {isOpen && !loaded && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[6px] border border-border-subtle bg-surface-card shadow-lg py-3 px-3">
          <span className="text-xs text-text-muted">Loading cities...</span>
        </div>
      )}

      {/* No results */}
      {isOpen && loaded && query.trim() && filteredSuggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[6px] border border-border-subtle bg-surface-card shadow-lg py-3 px-3">
          <span className="text-xs text-text-muted">
            No matches. Press Enter to add &ldquo;{query.trim()}&rdquo; manually.
          </span>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
