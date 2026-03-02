'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import type { Lead, LeadFilters, PaginatedResponse } from '@/lib/types';

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<PaginatedResponse<Lead>>;
  });

interface UseLeadsOptions extends LeadFilters {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

function buildUrl(options: UseLeadsOptions): string {
  const params = new URLSearchParams();

  if (options.search)   params.set('search',  options.search);
  if (options.trade)    params.set('trade',   options.trade);
  if (options.city)     params.set('city',    options.city);
  if (options.min_score !== undefined) params.set('min_score', String(options.min_score));
  if (options.page)     params.set('page',    String(options.page));
  if (options.limit)    params.set('limit',   String(options.limit));
  if (options.sort)     params.set('sort',    options.sort);
  if (options.order)    params.set('order',   options.order);

  if (options.tier?.length)            options.tier.forEach((t)  => params.append('tier', t));
  if (options.website_status?.length)  options.website_status.forEach((s) => params.append('website_status', s));
  if (options.outreach_status?.length) options.outreach_status.forEach((s) => params.append('outreach_status', s));

  const qs = params.toString();
  return qs ? `/api/leads?${qs}` : '/api/leads';
}

export interface UseLeadsReturn {
  leads: Lead[];
  pagination: PaginatedResponse<Lead>['pagination'] | null;
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

export function useLeads(options: UseLeadsOptions = {}): UseLeadsReturn {
  const url = buildUrl(options);

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Lead>>(url, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  return {
    leads:      data?.data       ?? [],
    pagination: data?.pagination ?? null,
    isLoading,
    isError:    !!error,
    mutate:     useCallback(() => { void mutate(); }, [mutate]),
  };
}
