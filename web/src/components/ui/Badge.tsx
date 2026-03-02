'use client';

import { cn } from '@/lib/cn';
import {
  TIER_COLOR_MAP,
  OUTREACH_COLOR_MAP,
  WEBSITE_COLOR_MAP,
} from '@/lib/constants';
import type { LeadTier, OutreachStatus, WebsiteStatus } from '@/lib/types';

type BadgeVariant =
  | 'tier'
  | 'outreach'
  | 'website'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'default';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  tier?: LeadTier;
  outreach?: OutreachStatus;
  websiteStatus?: WebsiteStatus;
  size?: 'sm' | 'md';
  className?: string;
}

const SEMANTIC_STYLES: Record<string, { bgColor: string; textColor: string }> = {
  success: { bgColor: 'rgba(34, 197, 94, 0.15)', textColor: '#86efac' },
  error:   { bgColor: 'rgba(239, 68, 68, 0.15)',  textColor: '#fca5a5' },
  warning: { bgColor: 'rgba(245, 158, 11, 0.15)', textColor: '#fcd34d' },
  info:    { bgColor: 'rgba(59, 130, 246, 0.15)', textColor: '#93c5fd' },
  neutral: { bgColor: 'rgba(113, 113, 122, 0.15)', textColor: '#a1a1aa' },
  default: { bgColor: '#27272a', textColor: '#a1a1aa' },
};

export function Badge({
  children,
  variant = 'default',
  tier,
  outreach,
  websiteStatus,
  size = 'md',
  className,
}: BadgeProps) {
  let bgColor = '#27272a';
  let textColor = '#a1a1aa';

  if (variant === 'tier' && tier) {
    bgColor = TIER_COLOR_MAP[tier]?.bgColor ?? bgColor;
    textColor = TIER_COLOR_MAP[tier]?.textColor ?? textColor;
  } else if (variant === 'outreach' && outreach) {
    bgColor = OUTREACH_COLOR_MAP[outreach]?.bgColor ?? bgColor;
    textColor = OUTREACH_COLOR_MAP[outreach]?.textColor ?? textColor;
  } else if (variant === 'website' && websiteStatus) {
    bgColor = WEBSITE_COLOR_MAP[websiteStatus]?.bgColor ?? bgColor;
    textColor = WEBSITE_COLOR_MAP[websiteStatus]?.textColor ?? textColor;
  } else if (variant in SEMANTIC_STYLES) {
    const style = SEMANTIC_STYLES[variant];
    if (style) {
      bgColor = style.bgColor;
      textColor = style.textColor;
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-[4px] leading-none whitespace-nowrap',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs',
        className
      )}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {children}
    </span>
  );
}

/** Convenience wrappers */
export function TierBadge({ tier, size }: { tier: LeadTier; size?: 'sm' | 'md' }) {
  const labels: Record<LeadTier, string> = {
    hot: 'Hot',
    warm: 'Warm',
    cold: 'Cold',
    skip: 'Skip',
  };
  return (
    <Badge variant="tier" tier={tier} size={size}>
      {labels[tier]}
    </Badge>
  );
}

export function OutreachBadge({ status, size }: { status: OutreachStatus; size?: 'sm' | 'md' }) {
  const labels: Record<OutreachStatus, string> = {
    new: 'New',
    contacted: 'Contacted',
    replied: 'Replied',
    meeting_set: 'Meeting Set',
    closed_won: 'Closed Won',
    closed_lost: 'Closed Lost',
  };
  return (
    <Badge variant="outreach" outreach={status} size={size}>
      {labels[status]}
    </Badge>
  );
}

export function WebsiteBadge({ status, size }: { status: WebsiteStatus | null; size?: 'sm' | 'md' }) {
  if (!status) return <Badge size={size}>—</Badge>;
  const labels: Record<WebsiteStatus, string> = {
    no_website: 'No Website',
    dead: 'Dead',
    parked: 'Parked',
    facebook_only: 'Facebook Only',
    placeholder: 'Placeholder',
    free_tier: 'Free Tier',
    poor: 'Poor',
    adequate: 'Adequate',
  };
  return (
    <Badge variant="website" websiteStatus={status} size={size}>
      {labels[status]}
    </Badge>
  );
}
