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

const SEMANTIC_STYLES: Record<string, { bgColor: string; textColor: string; borderColor: string }> = {
  success: { bgColor: 'rgba(34, 120, 60, 0.12)', textColor: '#1a6b35', borderColor: 'rgba(34, 120, 60, 0.3)' },
  error:   { bgColor: 'rgba(196, 65, 26, 0.12)',  textColor: '#9B2C1A', borderColor: 'rgba(196, 65, 26, 0.3)' },
  warning: { bgColor: 'rgba(184, 134, 11, 0.12)', textColor: '#7A5B06', borderColor: 'rgba(184, 134, 11, 0.3)' },
  info:    { bgColor: 'rgba(59, 110, 143, 0.12)', textColor: '#2C5A75', borderColor: 'rgba(59, 110, 143, 0.3)' },
  neutral: { bgColor: 'rgba(26, 26, 24, 0.06)',   textColor: '#6B6560', borderColor: 'rgba(26, 26, 24, 0.15)' },
  default: { bgColor: 'rgba(26, 26, 24, 0.06)',   textColor: '#6B6560', borderColor: 'rgba(26, 26, 24, 0.15)' },
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
  let bgColor = 'rgba(26, 26, 24, 0.06)';
  let textColor = '#6B6560';
  let borderColor = 'rgba(26, 26, 24, 0.15)';

  if (variant === 'tier' && tier) {
    bgColor = TIER_COLOR_MAP[tier]?.bgColor ?? bgColor;
    textColor = TIER_COLOR_MAP[tier]?.textColor ?? textColor;
    borderColor = TIER_COLOR_MAP[tier]?.color ?? borderColor;
  } else if (variant === 'outreach' && outreach) {
    bgColor = OUTREACH_COLOR_MAP[outreach]?.bgColor ?? bgColor;
    textColor = OUTREACH_COLOR_MAP[outreach]?.textColor ?? textColor;
    borderColor = OUTREACH_COLOR_MAP[outreach]?.color ?? borderColor;
  } else if (variant === 'website' && websiteStatus) {
    bgColor = WEBSITE_COLOR_MAP[websiteStatus]?.bgColor ?? bgColor;
    textColor = WEBSITE_COLOR_MAP[websiteStatus]?.textColor ?? textColor;
    borderColor = WEBSITE_COLOR_MAP[websiteStatus]?.color ?? borderColor;
  } else if (variant in SEMANTIC_STYLES) {
    const style = SEMANTIC_STYLES[variant];
    if (style) {
      bgColor = style.bgColor;
      textColor = style.textColor;
      borderColor = style.borderColor;
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-[4px] leading-none whitespace-nowrap border',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs',
        className
      )}
      style={{ backgroundColor: bgColor, color: textColor, borderColor: `${borderColor}33` }}
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
