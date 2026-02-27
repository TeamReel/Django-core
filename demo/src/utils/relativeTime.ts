/**
 * Time-relative formatting utilities
 *
 * Converts dates to human-readable relative strings like "Over 2 dagen" or "3 uur geleden"
 */

export type RelativeTimeLocale = 'nl' | 'en';

interface RelativeTimeStrings {
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
  yesterday: string;
  daysAgo: (n: number) => string;
  weeksAgo: (n: number) => string;
  monthsAgo: (n: number) => string;
  yearsAgo: (n: number) => string;
  inMinutes: (n: number) => string;
  inHours: (n: number) => string;
  tomorrow: string;
  inDays: (n: number) => string;
  inWeeks: (n: number) => string;
  inMonths: (n: number) => string;
  inYears: (n: number) => string;
}

const locales: Record<RelativeTimeLocale, RelativeTimeStrings> = {
  nl: {
    justNow: 'Zojuist',
    minutesAgo: (n) => `${n} ${n === 1 ? 'minuut' : 'minuten'} geleden`,
    hoursAgo: (n) => `${n} ${n === 1 ? 'uur' : 'uur'} geleden`,
    yesterday: 'Gisteren',
    daysAgo: (n) => `${n} dagen geleden`,
    weeksAgo: (n) => `${n} ${n === 1 ? 'week' : 'weken'} geleden`,
    monthsAgo: (n) => `${n} ${n === 1 ? 'maand' : 'maanden'} geleden`,
    yearsAgo: (n) => `${n} ${n === 1 ? 'jaar' : 'jaar'} geleden`,
    inMinutes: (n) => `Over ${n} ${n === 1 ? 'minuut' : 'minuten'}`,
    inHours: (n) => `Over ${n} ${n === 1 ? 'uur' : 'uur'}`,
    tomorrow: 'Morgen',
    inDays: (n) => `Over ${n} dagen`,
    inWeeks: (n) => `Over ${n} ${n === 1 ? 'week' : 'weken'}`,
    inMonths: (n) => `Over ${n} ${n === 1 ? 'maand' : 'maanden'}`,
    inYears: (n) => `Over ${n} ${n === 1 ? 'jaar' : 'jaar'}`,
  },
  en: {
    justNow: 'Just now',
    minutesAgo: (n) => `${n} ${n === 1 ? 'minute' : 'minutes'} ago`,
    hoursAgo: (n) => `${n} ${n === 1 ? 'hour' : 'hours'} ago`,
    yesterday: 'Yesterday',
    daysAgo: (n) => `${n} days ago`,
    weeksAgo: (n) => `${n} ${n === 1 ? 'week' : 'weeks'} ago`,
    monthsAgo: (n) => `${n} ${n === 1 ? 'month' : 'months'} ago`,
    yearsAgo: (n) => `${n} ${n === 1 ? 'year' : 'years'} ago`,
    inMinutes: (n) => `In ${n} ${n === 1 ? 'minute' : 'minutes'}`,
    inHours: (n) => `In ${n} ${n === 1 ? 'hour' : 'hours'}`,
    tomorrow: 'Tomorrow',
    inDays: (n) => `In ${n} days`,
    inWeeks: (n) => `In ${n} ${n === 1 ? 'week' : 'weeks'}`,
    inMonths: (n) => `In ${n} ${n === 1 ? 'month' : 'months'}`,
    inYears: (n) => `In ${n} ${n === 1 ? 'year' : 'years'}`,
  },
};

/**
 * Format a date as a relative time string
 *
 * @param date - Date to format (Date object or ISO string)
 * @param locale - Language ('nl' or 'en'), defaults to 'nl'
 * @returns Relative time string like "Over 2 dagen" or "3 uur geleden"
 *
 * @example
 * ```ts
 * formatRelativeTime(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)) // "Over 2 dagen"
 * formatRelativeTime(new Date(Date.now() - 3 * 60 * 60 * 1000)) // "3 uur geleden"
 * formatRelativeTime(new Date(Date.now() + 24 * 60 * 60 * 1000)) // "Morgen"
 * ```
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: RelativeTimeLocale = 'nl'
): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.round(diffMs / (1000 * 60 * 60 * 24 * 7));
  const diffMonths = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30));
  const diffYears = Math.round(diffMs / (1000 * 60 * 60 * 24 * 365));

  const strings = locales[locale];

  // Future
  if (diffMs > 0) {
    if (diffMinutes < 1) return strings.justNow;
    if (diffMinutes < 60) return strings.inMinutes(diffMinutes);
    if (diffHours < 24) return strings.inHours(diffHours);
    if (diffDays === 1) return strings.tomorrow;
    if (diffDays < 7) return strings.inDays(diffDays);
    if (diffWeeks < 4) return strings.inWeeks(diffWeeks);
    if (diffMonths < 12) return strings.inMonths(diffMonths);
    return strings.inYears(diffYears);
  }

  // Past
  const absDiffMinutes = Math.abs(diffMinutes);
  const absDiffHours = Math.abs(diffHours);
  const absDiffDays = Math.abs(diffDays);
  const absDiffWeeks = Math.abs(diffWeeks);
  const absDiffMonths = Math.abs(diffMonths);
  const absDiffYears = Math.abs(diffYears);

  if (absDiffMinutes < 1) return strings.justNow;
  if (absDiffMinutes < 60) return strings.minutesAgo(absDiffMinutes);
  if (absDiffHours < 24) return strings.hoursAgo(absDiffHours);
  if (absDiffDays === 1) return strings.yesterday;
  if (absDiffDays < 7) return strings.daysAgo(absDiffDays);
  if (absDiffWeeks < 4) return strings.weeksAgo(absDiffWeeks);
  if (absDiffMonths < 12) return strings.monthsAgo(absDiffMonths);
  return strings.yearsAgo(absDiffYears);
}

/**
 * Format a date as a relative time with fallback to absolute for old dates
 *
 * @param date - Date to format
 * @param threshold - Days after which to show absolute date (default: 7)
 * @param locale - Language ('nl' or 'en')
 * @returns Relative time or formatted absolute date
 */
export function formatRelativeTimeWithFallback(
  date: Date | string | number,
  threshold: number = 7,
  locale: RelativeTimeLocale = 'nl'
): string {
  const target = new Date(date);
  const now = new Date();
  const diffDays = Math.abs(Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  if (diffDays <= threshold) {
    return formatRelativeTime(date, locale);
  }

  // Fall back to absolute date
  return target.toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: target.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Get urgency level based on how soon a date is
 *
 * @param date - Date to check
 * @returns 'urgent' (< 24h), 'soon' (< 3 days), 'upcoming' (< 7 days), 'later', or 'past'
 */
export function getDateUrgency(
  date: Date | string | number
): 'urgent' | 'soon' | 'upcoming' | 'later' | 'past' {
  const target = new Date(date);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffMs < 0) return 'past';
  if (diffHours < 24) return 'urgent';
  if (diffDays < 3) return 'soon';
  if (diffDays < 7) return 'upcoming';
  return 'later';
}

export default formatRelativeTime;
