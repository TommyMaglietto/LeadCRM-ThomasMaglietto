'use client';

import useSWR from 'swr';
import { useCallback, useState } from 'react';
import type { Scan } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanResponse {
  data: Scan;
}

interface LaunchScanResponse {
  scanId: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<ScanResponse>;
  });

// ---------------------------------------------------------------------------
// useScanStatus — polls GET /api/scans/[id] every 3 s while running
// ---------------------------------------------------------------------------

export interface UseScanStatusReturn {
  scan: Scan | null;
  isRunning: boolean;
  isLoading: boolean;
  isError: boolean;
}

export function useScanStatus(scanId: number | null): UseScanStatusReturn {
  const url = scanId !== null ? `/api/scans/${scanId}` : null;

  const isTerminal = (s: Scan | null) =>
    s !== null && (s.status === 'completed' || s.status === 'failed');

  const { data, error, isLoading } = useSWR<ScanResponse>(url, fetcher, {
    // Poll every 3 seconds while scan is still running. Stop once completed/failed.
    refreshInterval: (data) => {
      const scan = data?.data ?? null;
      return isTerminal(scan) ? 0 : 3000;
    },
    revalidateOnFocus: false,
  });

  const scan = data?.data ?? null;

  return {
    scan,
    isRunning: scan !== null && (scan.status === 'running' || scan.status === 'pending'),
    isLoading,
    isError: !!error,
  };
}

// ---------------------------------------------------------------------------
// useScan — main hook: launch scans + track active scan id
// ---------------------------------------------------------------------------

export interface UseScanReturn {
  scan: Scan | null;
  isRunning: boolean;
  isLoading: boolean;
  isError: boolean;
  activeScanId: number | null;
  launchScan: (trades: string[], towns: string[], refresh?: boolean) => Promise<number>;
  clearScan: () => void;
  /** Resume tracking an existing scan by ID (e.g. after navigation) */
  resumeScan: (scanId: number) => void;
}

export function useScan(): UseScanReturn {
  const [activeScanId, setActiveScanId] = useState<number | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  const { scan, isRunning, isLoading, isError } = useScanStatus(activeScanId);

  const launchScan = useCallback(
    async (trades: string[], towns: string[], refresh = false): Promise<number> => {
      setIsLaunching(true);
      try {
        const res = await fetch('/api/scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trades, towns, refresh }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }

        const data = await res.json() as LaunchScanResponse;
        setActiveScanId(data.scanId);
        return data.scanId;
      } finally {
        setIsLaunching(false);
      }
    },
    [],
  );

  const clearScan = useCallback(() => {
    setActiveScanId(null);
  }, []);

  const resumeScan = useCallback((scanId: number) => {
    setActiveScanId(scanId);
  }, []);

  return {
    scan,
    isRunning: isLaunching || isRunning,
    isLoading: isLaunching || isLoading,
    isError,
    activeScanId,
    launchScan,
    clearScan,
    resumeScan,
  };
}
