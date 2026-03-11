/**
 * Date helpers for directory pages.
 */

import type { DirectoryRow } from './types';

/** Parse a `YYYY-MM-DD` string into a midnight-UTC Date, or null. */
export const parseDateOnlyUtc = (value?: string | null): Date | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const ymd = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const dt = new Date(`${ymd}T00:00:00.000Z`);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

/** Check whether a period is currently active based on start/end dates. */
export const isPeriodActive = (p: DirectoryRow): boolean => {
  const start = parseDateOnlyUtc(p?.start_date) ?? parseDateOnlyUtc(p?.parent_period?.start_date);
  const end = parseDateOnlyUtc(p?.end_date) ?? parseDateOnlyUtc(p?.parent_period?.end_date);
  if (!start && !end) return false;
  const today = parseDateOnlyUtc(new Date().toISOString())!;
  const afterStart = !start || today.getTime() >= start.getTime();
  const beforeEnd = !end || today.getTime() <= end.getTime();
  return afterStart && beforeEnd;
};
