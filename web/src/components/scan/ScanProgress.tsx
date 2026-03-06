'use client';

import { useEffect, useState } from 'react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';
import type { Scan } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScanProgressProps {
  scan: Scan | null;
  startedAt: Date;
  onCancel?: () => void;
}

// ---------------------------------------------------------------------------
// Phase display names (keyed by real phase from Python bridge)
// ---------------------------------------------------------------------------

const PHASE_MESSAGES: Record<string, string> = {
  discovery:           'Discovering businesses...',
  dedup:               'Deduplicating results...',
  enriching_websites:  'Checking websites...',
  enriching_yelp:      'Checking Yelp listings...',
  franchise_detection: 'Detecting franchises...',
  scoring:             'Scoring leads...',
  saving:              'Saving to database...',
  complete:            'Scan complete!',
  failed:              'Scan failed',
};

// ---------------------------------------------------------------------------
// Elapsed time formatter
// ---------------------------------------------------------------------------

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ---------------------------------------------------------------------------
// ScanProgress
// ---------------------------------------------------------------------------

export function ScanProgress({ scan, startedAt, onCancel }: ScanProgressProps) {
  const [elapsed, setElapsed] = useState(0);

  // Tick every second (for elapsed timer display only)
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // Use REAL progress from the scan row, falling back to 0
  const progress = scan?.progress ?? 0;
  const phase = scan?.current_phase ?? 'discovery';
  const detail = scan?.phase_detail ?? null;
  const statusMessage = PHASE_MESSAGES[phase] ?? 'Processing...';
  const itemsDone = scan?.items_done ?? 0;
  const itemsTotal = scan?.items_total ?? 0;

  return (
    <div className="flex flex-col items-center gap-6 py-10 px-6">
      {/* Animated icon */}
      <div className="relative flex items-center justify-center">
        {/* Outer pulse ring */}
        <span className="absolute inline-flex h-16 w-16 rounded-full bg-accent/10 animate-ping" />
        {/* Inner ring */}
        <span className="absolute inline-flex h-12 w-12 rounded-full bg-accent/20" />
        {/* Spinner */}
        <Spinner size="md" className="relative z-10" />
      </div>

      {/* Status text */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-base font-semibold text-ink">{statusMessage}</p>
        {detail && (
          <p className="text-xs text-stone">{detail}</p>
        )}
        <p className="text-xs text-rubble">
          Elapsed: {formatElapsed(elapsed)}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <ProgressBar
          value={progress}
          showValue
          color="accent"
          size="md"
          label="Scan progress"
        />
      </div>

      {/* Items counter (when enrichment is active) */}
      {itemsDone > 0 && itemsTotal > 0 && (
        <p className="text-xs text-rubble font-display">
          {itemsDone} / {itemsTotal} items
        </p>
      )}

      {/* Partial results if available */}
      {scan && scan.total_found > 0 && (
        <div className="rounded-[8px] border border-ink/10 bg-cream-dark px-4 py-3 w-full max-w-xs">
          <p className="text-xs text-rubble mb-2 font-medium uppercase tracking-wide">
            Results so far
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-rubble">Found</span>
              <span className="text-sm font-semibold text-ink font-display">
                {scan.total_found}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-rubble">New</span>
              <span className="text-sm font-semibold text-green-700 font-display">
                {scan.new_inserted}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cancel option */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-rubble hover:text-stone transition-colors underline underline-offset-2"
        >
          Cancel (stops polling, scan continues in background)
        </button>
      )}
    </div>
  );
}
