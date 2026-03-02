import type { LeadTier, OutreachStatus, WebsiteStatus } from './types';

export interface StatusConfig {
  value: string;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export const LEAD_TIERS: StatusConfig[] = [
  {
    value: 'hot',
    label: 'Hot',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    textColor: '#fca5a5',
  },
  {
    value: 'warm',
    label: 'Warm',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    textColor: '#fcd34d',
  },
  {
    value: 'cold',
    label: 'Cold',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    textColor: '#93c5fd',
  },
  {
    value: 'skip',
    label: 'Skip',
    color: '#71717a',
    bgColor: 'rgba(113, 113, 122, 0.15)',
    textColor: '#a1a1aa',
  },
];

export const OUTREACH_STATUSES: StatusConfig[] = [
  {
    value: 'new',
    label: 'New',
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.15)',
    textColor: '#a5b4fc',
  },
  {
    value: 'contacted',
    label: 'Contacted',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    textColor: '#fcd34d',
  },
  {
    value: 'replied',
    label: 'Replied',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    textColor: '#93c5fd',
  },
  {
    value: 'meeting_set',
    label: 'Meeting Set',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    textColor: '#c4b5fd',
  },
  {
    value: 'closed_won',
    label: 'Closed Won',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    textColor: '#86efac',
  },
  {
    value: 'closed_lost',
    label: 'Closed Lost',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    textColor: '#fca5a5',
  },
];

export const WEBSITE_STATUSES: StatusConfig[] = [
  {
    value: 'no_website',
    label: 'No Website',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    textColor: '#fca5a5',
  },
  {
    value: 'dead',
    label: 'Dead',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    textColor: '#fca5a5',
  },
  {
    value: 'parked',
    label: 'Parked',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    textColor: '#fcd34d',
  },
  {
    value: 'facebook_only',
    label: 'Facebook Only',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    textColor: '#fcd34d',
  },
  {
    value: 'placeholder',
    label: 'Placeholder',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    textColor: '#fcd34d',
  },
  {
    value: 'free_tier',
    label: 'Free Tier',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    textColor: '#93c5fd',
  },
  {
    value: 'poor',
    label: 'Poor',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    textColor: '#93c5fd',
  },
  {
    value: 'adequate',
    label: 'Adequate',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    textColor: '#86efac',
  },
];

export const TIER_COLOR_MAP: Record<LeadTier, StatusConfig> = Object.fromEntries(
  LEAD_TIERS.map((t) => [t.value, t])
) as Record<LeadTier, StatusConfig>;

export const OUTREACH_COLOR_MAP: Record<OutreachStatus, StatusConfig> = Object.fromEntries(
  OUTREACH_STATUSES.map((s) => [s.value, s])
) as Record<OutreachStatus, StatusConfig>;

export const WEBSITE_COLOR_MAP: Record<WebsiteStatus, StatusConfig> = Object.fromEntries(
  WEBSITE_STATUSES.map((s) => [s.value, s])
) as Record<WebsiteStatus, StatusConfig>;

export const DEFAULT_TRADES: string[] = [
  'plumber',
  'electrician',
  'hvac',
  'roofer',
  'painter',
  'landscaper',
  'general contractor',
  'handyman',
  'flooring',
  'carpet cleaning',
  'pest control',
  'pressure washing',
  'window cleaning',
  'junk removal',
  'moving company',
  'locksmith',
  'garage door repair',
  'fence company',
  'pool service',
  'tree service',
];

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/leads', label: 'Leads', icon: 'leads' },
  { href: '/pipeline', label: 'Pipeline', icon: 'pipeline' },
  { href: '/scan', label: 'Scan', icon: 'scan' },
  { href: '/analytics', label: 'Analytics', icon: 'analytics' },
] as const;

export const PAGE_SIZE_OPTIONS = [25, 50, 100];
export const DEFAULT_PAGE_SIZE = 50;
