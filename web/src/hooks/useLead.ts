'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import type { Lead, CallLogEntry } from '@/lib/types';

interface LeadDetailResponse {
  lead: Lead;
  callLog: CallLogEntry[];
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<LeadDetailResponse>;
  });

export interface UseLeadReturn {
  lead:      Lead        | null;
  callLog:   CallLogEntry[];
  isLoading: boolean;
  isError:   boolean;
  mutate:    () => void;
}

export function useLead(id: number | null): UseLeadReturn {
  const url = id !== null ? `/api/leads/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR<LeadDetailResponse>(
    url,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    lead:      data?.lead    ?? null,
    callLog:   data?.callLog ?? [],
    isLoading,
    isError:   !!error,
    mutate:    useCallback(() => { void mutate(); }, [mutate]),
  };
}
