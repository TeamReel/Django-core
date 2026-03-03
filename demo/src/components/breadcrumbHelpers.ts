/**
 * breadcrumbHelpers — Pure utility functions for Breadcrumbs component.
 * Extracted for reuse and to keep the main component lean.
 */

export const getPeriodType = (p: any): string => {
  const t = p?.type ?? p?.data?.type ?? p?.metadata?.type;
  return String(t || '').toLowerCase();
};

export const getPeriodParentId = (p: any): string => {
  const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
  return parentId ? String(parentId) : '';
};

export const isSeasonPeriod = (p: any): boolean => {
  const parentId = getPeriodParentId(p);
  if (parentId) return false;

  const type = getPeriodType(p);
  if (type === 'season') return true;
  if (['competition', 'league', 'cup', 'friendly', 'tournament', 'round'].includes(type)) return false;
  return true;
};

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
