/**
 * Formats a 10-digit phone string as (XXX) XXX-XXXX.
 * Handles strings with existing formatting characters stripped out.
 */
export function formatPhone(phone: string | null): string {
  if (!phone) return '—';

  const digits = phone.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('1')) {
    const core = digits.slice(1);
    return `(${core.slice(0, 3)}) ${core.slice(3, 6)}-${core.slice(6)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phone;
}

/**
 * Formats a date string as a relative label ("2 days ago", "just now") for
 * dates within the last 30 days, or as a short calendar date ("Mar 1") for
 * older dates. Returns "—" for null/empty input.
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Formats a score number with a sign prefix (e.g. +82, -5, 0).
 */
export function formatScore(score: number): string {
  if (score > 0) return `+${score}`;
  if (score < 0) return `${score}`;
  return '0';
}

/**
 * Formats a float rating to one decimal place, or returns "—".
 */
export function formatRating(rating: number | null): string {
  if (rating === null || rating === undefined) return '—';
  return rating.toFixed(1);
}

/**
 * Formats a large integer with commas (e.g. 1234 → "1,234").
 */
export function formatCount(count: number | null): string {
  if (count === null || count === undefined) return '—';
  return count.toLocaleString('en-US');
}

/**
 * Truncates a URL for display (removes protocol and trailing slash).
 */
export function formatUrl(url: string | null): string {
  if (!url) return '—';
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

/**
 * Converts a snake_case or underscore string to Title Case.
 */
export function humanize(str: string): string {
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
