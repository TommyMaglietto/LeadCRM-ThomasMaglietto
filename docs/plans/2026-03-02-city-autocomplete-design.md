# City Autocomplete Design

**Date:** 2026-03-02
**Scope:** Web UI only (ScanForm town input)

## Problem

Users type city names freehand in a plain text input. Misspellings like "Hunterville" instead of "Huntersville" cause zero results from Google Places with no feedback.

## Solution

Replace the plain text town input with a tag/chip-based autocomplete powered by a static US city dataset and client-side fuzzy search.

## Data Layer

- Static JSON at `web/src/data/us-cities.json` (~30K US Census places, ~500KB)
- Each entry: `{ "city": "Huntersville", "state": "NC", "pop": 58300 }`
- Lazy-loaded on first input focus
- Fuzzy matching via Fuse.js (~6KB gzipped), pre-filtered to selected state
- Results sorted by match score, then population descending

## CityAutocomplete Component

- Container styled like an input field with chips inside + text input
- Floating dropdown of fuzzy-matched suggestions (max 8)
- Keyboard navigation: arrow keys, Enter/Tab to select, Escape to close
- Paste support: comma-separated cities parsed into chips
- Typing an exact name + Enter accepted even if not in dataset

## Styling

- Reuses existing design tokens: surface-card, border-subtle, accent, etc.
- Chips: rounded-full, bg-surface-active, removable with "x" button
- Dropdown: surface-card bg, subtle shadow, city name bold + state muted + population faint
- Matches existing Input/Dropdown component patterns

## Integration

- ScanForm.tsx: replace Input + townsRaw state with CityAutocomplete
- Output unchanged: still passes `string[]` of "City, ST" to onSubmit
- No backend/pipeline changes

## Files

- **New:** `web/src/data/us-cities.json`, `web/src/components/ui/CityAutocomplete.tsx`
- **Modified:** `web/src/components/scan/ScanForm.tsx`, `web/package.json`
