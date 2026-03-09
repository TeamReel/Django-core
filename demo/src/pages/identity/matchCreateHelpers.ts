import type { OrgOption, ProjectOption, PeriodOption } from './matchCreateTypes';

import { extractList } from '../../utils/apiEnvelope';
export { extractList };

export const getNextUrl = (raw: { data?: { next?: string | null }; next?: string | null } | null): string => {
  const next = raw?.data?.next ?? raw?.next;
  return typeof next === 'string' ? next : '';
};

export const fetchAllPagesLocal = async <T = Record<string, unknown>>(url: string, opts: RequestInit, maxItems = 2000): Promise<T[]> => {
  const all: T[] = [];
  let nextUrl = url;
  const seen = new Set<string>();

  while (nextUrl && all.length < maxItems && !seen.has(nextUrl)) {
    seen.add(nextUrl);
    const res = await fetch(nextUrl, opts);
    if (!res.ok) break;
    const raw = await res.json().catch(() => null);
    all.push(...extractList(raw));
    nextUrl = getNextUrl(raw);
  }

  return all.slice(0, maxItems);
};

// ─── Project helpers ─────────────────────────────────────────────────────────

export const getParentProjectId = (p: ProjectOption): string | null => {
  const parent =
    p?.parent_id ??
    p?.parent ??
    p?.parent_project_id ??
    (typeof p?.parent_project === 'object' ? p?.parent_project?.id : p?.parent_project);
  if (parent == null) return null;
  return String(typeof parent === 'object' ? parent.id : parent);
};

export const getProjectIdentity = (p: ProjectOption & { metadata?: { identity?: Record<string, string> } }) => {
  const identity = p?.metadata?.identity || {};
  return {
    name: String(p?.name || '').trim(),
    logoUrl: String(identity?.logo_url || '').trim(),
    defaultLocation: String(identity?.default_location ?? identity?.defaultLocation ?? '').trim(),
  };
};

export const getProjectOrganisationId = (p: ProjectOption): string | null => {
  const org = typeof p.organisation === 'string' ? p.organisation : p.organisation?.id;
  return org ? String(org) : null;
};

export const getClubOrganisationId = (clubId: string, clubsOptions: ProjectOption[]): string | null => {
  const club = clubsOptions.find((c) => String(c.id) === String(clubId));
  if (!club) return null;
  return getProjectOrganisationId(club);
};

export const getTeamParentId = (t: ProjectOption): string | null => getParentProjectId(t);

// ─── DateTime helpers ────────────────────────────────────────────────────────

export const combineDateTime = (date: string, time: string): string | null => {
  if (!date || !time) return null;
  return `${date}T${time}:00`;
};

export const addHoursToIsoLike = (isoLike: string, hours: number): string => {
  const parsed = new Date(isoLike);
  if (Number.isNaN(parsed.getTime())) return isoLike;
  parsed.setHours(parsed.getHours() + hours);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(
    parsed.getMinutes()
  )}:${pad(parsed.getSeconds())}`;
};

// ─── Style helper ────────────────────────────────────────────────────────────

export const controlStyle = (disabled: boolean) => ({
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--app-border)',
  backgroundColor: disabled ? 'var(--app-surface-3, #e9eef5)' : 'var(--app-surface-2)',
  color: disabled ? 'var(--app-text-muted, #667085)' : 'var(--app-text)',
  opacity: disabled ? 0.9 : 1,
  cursor: disabled ? 'not-allowed' : 'pointer',
} as const);
