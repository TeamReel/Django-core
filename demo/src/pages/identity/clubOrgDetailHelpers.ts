/* ─── Shared types, constants & helpers for ClubOrganisationDetailPage ─── */

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
  description?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
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

export type KitAsset = {
  id: string;
  asset_type: string;
  url?: string;
  alt_text?: string;
  file_details?: {
    id: string;
    name: string;
    size: number;
    content_type: string;
  };
};

/* ─── Constants ─────────────────────────────────────────────── */

export const KIT_TYPES = [
  { id: 'kit_home', label: 'Home Kit', description: 'Primary home match kit' },
  { id: 'kit_away', label: 'Away Kit', description: 'Away match kit' },
  { id: 'kit_third', label: 'Third Kit', description: 'Alternative third kit' },
  { id: 'kit_goalkeeper', label: 'Goalkeeper Kit', description: 'Goalkeeper specific kit' },
  { id: 'kit_coach', label: 'Coach Kit', description: 'Coaching staff kit' },
  { id: 'kit_assistant', label: 'Assistant Kit', description: 'Assistant staff kit' },
  { id: 'kit_training', label: 'Training Kit', description: 'Training and practice kit' },
  { id: 'kit_legacy', label: 'Legacy Kit', description: 'Legacy / retro kit' },
] as const;

/* ─── Pure helpers ──────────────────────────────────────────── */

export { unwrapEnvelope, extractList, extractCount } from '../../utils/apiEnvelope';
export { getCsrfToken } from '../../utils/csrf';

export const looksLikeIdentifier = (value: string): boolean => {
  const v = String(value || '').trim();
  if (!v) return false;
  if (/^\d+$/.test(v)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) return true;
  return false;
};

export const getTeamParentId = (t: any): string => {
  const parent =
    t?.parent_id ??
    t?.parent_project_id ??
    (typeof t?.parent_project === 'object' ? t?.parent_project?.id : t?.parent_project) ??
    (typeof t?.parent === 'object' ? t?.parent?.id : t?.parent);
  return parent != null ? String(typeof parent === 'object' ? parent.id : parent) : '';
};

export const mergeUniqueById = <T extends { id: any }>(items: T[]): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items || []) {
    const key = String(item?.id ?? '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};
