// Types and utility functions for TeamOrganisationDetailPage

export type Organisation = {
  id: string;
  name: string;
  slug?: string;
};

export type Project = {
  id: string;
  name: string;
  slug?: string;
  organisation_id?: string;
  organisation?: { id?: string; slug?: string };
};

export type Period = {
  id: string;
  name: string;
  slug?: string;
  project_id?: string | number;
  project?: { id?: string | number };
  parent_period_id?: string | number | null;
  parent_period?: { id?: string | number } | null;
  type?: string;
  data?: any;
  metadata?: any;
};

export type OverviewMember = {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

// ── Utility functions ──

export const looksLikeIdentifier = (value: string): boolean => {
  const v = String(value || '').trim();
  if (!v) return false;
  if (/^\d+$/.test(v)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) return true;
  return false;
};

export const getPeriodType = (p: any): string => {
  const t = p?.type ?? p?.data?.type ?? p?.metadata?.type;
  return String(t || '').toLowerCase();
};

export const getParentPeriodId = (p: any): string => {
  const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
  return parentId != null ? String(parentId) : '';
};

export const getParentProjectId = (p: any): string => {
  const parent =
    p?.parent_id ??
    p?.parent_project_id ??
    (typeof p?.parent_project === 'object' ? p?.parent_project?.id : p?.parent_project) ??
    (typeof p?.parent === 'object' ? p?.parent?.id : p?.parent) ??
    null;
  return parent != null ? String(typeof parent === 'object' ? parent.id : parent) : '';
};

export const isSeasonPeriod = (p: any): boolean => {
  // TeamReel hierarchy: Season is a root Period (no parent_period).
  // Do NOT infer by name; rely on parent/type.
  const parentId = getParentPeriodId(p);
  if (parentId) return false;

  const type = getPeriodType(p);
  if (type === 'season') return true;

  // Guard against misconfigured root competitions.
  if (['competition', 'league', 'cup', 'friendly', 'tournament', 'round'].includes(type)) return false;

  return true;
};

export const mergeUniqueById = <T extends { id: any }>(items: T[]): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items || []) {
    const key = String((item as any)?.id ?? '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};
