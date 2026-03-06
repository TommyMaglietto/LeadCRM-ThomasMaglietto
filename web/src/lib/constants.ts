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
    color: '#C4411A',
    bgColor: 'rgba(196, 65, 26, 0.12)',
    textColor: '#9B2C1A',
  },
  {
    value: 'warm',
    label: 'Warm',
    color: '#B8860B',
    bgColor: 'rgba(184, 134, 11, 0.12)',
    textColor: '#7A5B06',
  },
  {
    value: 'cold',
    label: 'Cold',
    color: '#3B6E8F',
    bgColor: 'rgba(59, 110, 143, 0.12)',
    textColor: '#2C5A75',
  },
  {
    value: 'skip',
    label: 'Skip',
    color: '#9C9389',
    bgColor: 'rgba(156, 147, 137, 0.15)',
    textColor: '#6B6560',
  },
];

export const OUTREACH_STATUSES: StatusConfig[] = [
  {
    value: 'new',
    label: 'New',
    color: '#C4411A',
    bgColor: 'rgba(196, 65, 26, 0.10)',
    textColor: '#9B2C1A',
  },
  {
    value: 'contacted',
    label: 'Contacted',
    color: '#B8860B',
    bgColor: 'rgba(184, 134, 11, 0.10)',
    textColor: '#7A5B06',
  },
  {
    value: 'replied',
    label: 'Replied',
    color: '#3B6E8F',
    bgColor: 'rgba(59, 110, 143, 0.10)',
    textColor: '#2C5A75',
  },
  {
    value: 'meeting_set',
    label: 'Meeting Set',
    color: '#7B5EA7',
    bgColor: 'rgba(123, 94, 167, 0.10)',
    textColor: '#5C4480',
  },
  {
    value: 'closed_won',
    label: 'Closed Won',
    color: '#22783C',
    bgColor: 'rgba(34, 120, 60, 0.10)',
    textColor: '#1A6B35',
  },
  {
    value: 'closed_lost',
    label: 'Closed Lost',
    color: '#9B2C1A',
    bgColor: 'rgba(155, 44, 26, 0.10)',
    textColor: '#7A2315',
  },
];

export const WEBSITE_STATUSES: StatusConfig[] = [
  {
    value: 'no_website',
    label: 'No Website',
    color: '#C4411A',
    bgColor: 'rgba(196, 65, 26, 0.10)',
    textColor: '#9B2C1A',
  },
  {
    value: 'dead',
    label: 'Dead',
    color: '#9B2C1A',
    bgColor: 'rgba(155, 44, 26, 0.10)',
    textColor: '#7A2315',
  },
  {
    value: 'parked',
    label: 'Parked',
    color: '#B8860B',
    bgColor: 'rgba(184, 134, 11, 0.10)',
    textColor: '#7A5B06',
  },
  {
    value: 'facebook_only',
    label: 'Facebook Only',
    color: '#B8860B',
    bgColor: 'rgba(184, 134, 11, 0.10)',
    textColor: '#7A5B06',
  },
  {
    value: 'placeholder',
    label: 'Placeholder',
    color: '#B8860B',
    bgColor: 'rgba(184, 134, 11, 0.10)',
    textColor: '#7A5B06',
  },
  {
    value: 'free_tier',
    label: 'Free Tier',
    color: '#3B6E8F',
    bgColor: 'rgba(59, 110, 143, 0.10)',
    textColor: '#2C5A75',
  },
  {
    value: 'poor',
    label: 'Poor',
    color: '#3B6E8F',
    bgColor: 'rgba(59, 110, 143, 0.10)',
    textColor: '#2C5A75',
  },
  {
    value: 'adequate',
    label: 'Adequate',
    color: '#22783C',
    bgColor: 'rgba(34, 120, 60, 0.10)',
    textColor: '#1A6B35',
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
