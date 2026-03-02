'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import type { DashboardStats } from '@/lib/types';

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<DashboardStats>;
  });

export interface UseStatsReturn {
  stats: DashboardStats | null;
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

/**
 * Fetches aggregated dashboard stats from GET /api/stats.
 * Refreshes every 60 seconds so the dashboard stays reasonably fresh without
 * hammering the server.
 */
export function useStats(): UseStatsReturn {
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>(
    '/api/stats',
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 60_000,
    }
  );

  return {
    stats: data ?? null,
    isLoading,
    isError: !!error,
    mutate: useCallback(() => { void mutate(); }, [mutate]),
  };
}
