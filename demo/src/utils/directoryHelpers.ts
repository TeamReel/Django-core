/**
 * Shared helpers for all directory list pages (Seasons, Competitions, Matches, etc.).
 *
 * These functions were copy-pasted across SeasonsList, CompetitionsList and MatchesList.
 * Centralising them here eliminates ~400 lines of duplication.
 */

import type { OrganisationOption, ProjectOption } from '../pages/work/WorkFilterBar';

// ────────────────────────────────────────────
// Generic array / ID helpers
// ────────────────────────────────────────────

/** Split an array into chunks of a given size. */
export const chunkArray = <T,>(items: T[], chunkSize: number): T[][] => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const size = Math.max(1, Math.floor(chunkSize));
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

/** UUID v1-5 check. */
export const isUuid = (value: unknown): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ''),
  );

/** Strictly numeric PK check. */
export const isNumericId = (value: unknown): boolean =>
  /^\d+$/.test(String(value ?? '').trim());

/** Stable lower-case sort key (missing values sort last). */
export const sortKey = (value: unknown): string => {
  const s = String(value ?? '').trim();
  return s ? s.toLocaleLowerCase() : '\uffff';
};

// ────────────────────────────────────────────
// CSRF
// ────────────────────────────────────────────

/** Read the Django CSRF token from cookies. */
export const getCsrfToken = (): string | undefined =>
  document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='))
    ?.split('=')[1];

// ────────────────────────────────────────────
// Date helpers
// ────────────────────────────────────────────

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
export const isPeriodActive = (p: any): boolean => {
  const start = parseDateOnlyUtc(p?.start_date) ?? parseDateOnlyUtc(p?.parent_period?.start_date);
  const end = parseDateOnlyUtc(p?.end_date) ?? parseDateOnlyUtc(p?.parent_period?.end_date);
  if (!start && !end) return false;
  const today = parseDateOnlyUtc(new Date().toISOString())!;
  const afterStart = !start || today.getTime() >= start.getTime();
  const beforeEnd = !end || today.getTime() <= end.getTime();
  return afterStart && beforeEnd;
};

// ────────────────────────────────────────────
// Hierarchy lookups (resolve names from lists)
// ────────────────────────────────────────────

/** Resolve a project's parent_project ID. */
export const getTeamParentId = (t: any): string | null => {
  const parent =
    t?.parent_id ??
    t?.parent ??
    t?.parent_project_id ??
    (typeof t?.parent_project === 'object' ? t?.parent_project?.id : t?.parent_project);
  if (parent == null) return null;
  return String(typeof parent === 'object' ? parent.id : parent);
};

/** Resolve the Federation name for a period/activity. */
export const getFederationName = (
  item: any,
  organisations: OrganisationOption[],
): string => {
  const org = item?.organisation;
  if (typeof org === 'object' && org?.name) return org.name;
  const orgId = typeof org === 'string' ? org : org?.id;
  const fromList = orgId
    ? organisations.find((o) => String(o.id) === String(orgId))
    : undefined;
  return fromList?.name || '';
};

/** Extract the team (project) ID from an item. */
export const getTeamId = (item: any): string => {
  const project = item?.project;
  return String(typeof project === 'object' ? project?.id : project || '');
};

/** Extract the team (project) name from an item + teams list. */
export const getTeamName = (
  item: any,
  teams?: ProjectOption[],
): string => {
  const project = item?.project;
  if (typeof project === 'object' && project?.name) return project.name;
  const teamId = getTeamId(item);
  const fromList = teamId
    ? teams?.find((t) => String(t.id) === String(teamId))
    : undefined;
  return fromList?.name || '';
};

/** Resolve the Club (parent project) name for an item. */
export const getClubName = (
  item: any,
  clubs: ProjectOption[],
  teams: ProjectOption[],
): string => {
  const teamId = getTeamId(item);
  const teamObj: any = teams.find((t) => String(t.id) === String(teamId));
  const clubId =
    teamObj?.parent_id || teamObj?.parent || teamObj?.parent_project_id;
  const clubObj = clubs.find((c) => String(c.id) === String(clubId));
  return clubObj?.name || '';
};

/** Resolve season name from a period's parent_period or a seasons list. */
export const getSeasonName = (
  item: any,
  seasons: any[],
): string => {
  const season = item?.parent_period;
  if (typeof season === 'object' && season?.name) return season.name;
  const seasonId = item?.parent_period_id || season?.id;
  const fromList = seasonId
    ? seasons.find((s: any) => String(s.id) === String(seasonId))
    : undefined;
  return (fromList as any)?.name || '';
};

// ────────────────────────────────────────────
// Sport filter helper
// ────────────────────────────────────────────

/** Filter a list of periods/activities by sportFilter against the organisation's sport. */
export const matchesSportFilter = (
  item: any,
  sportFilter: string,
  organisations: OrganisationOption[],
): boolean => {
  if (sportFilter === 'all') return true;
  const nestedOrg = item?.organisation;
  const nestedSportId =
    nestedOrg && typeof nestedOrg === 'object' ? nestedOrg?.sport?.id : undefined;
  if (nestedSportId) return String(nestedSportId) === String(sportFilter);

  const orgId =
    (nestedOrg && typeof nestedOrg === 'object' ? nestedOrg?.id : nestedOrg) ||
    item?.organisation_id;
  const org = orgId
    ? organisations.find((o) => String(o.id) === String(orgId))
    : undefined;
  return String((org as any)?.sport?.id || '') === String(sportFilter);
};

// ────────────────────────────────────────────
// Season options builder (used by Competitions + Matches)
// ────────────────────────────────────────────

export interface SeasonOption {
  name: string;
  ids: string[];
}

/** Build de-duped season dropdown options from a list of season periods. */
export const buildSeasonOptions = (seasons: any[]): SeasonOption[] => {
  const byName = new Map<string, SeasonOption>();
  for (const s of seasons) {
    const name = String(s?.name || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const id = String(s?.id);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { name, ids: [id] });
    } else if (!existing.ids.includes(id)) {
      existing.ids.push(id);
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
};

// ────────────────────────────────────────────
// Shared props interface
// ────────────────────────────────────────────

export interface DirectoryListProps {
  preselectedOrgId?: string;
  preselectedClubId?: string;
  preselectedTeamId?: string;
  /** Slug override for club — used in URL construction (falls back to preselectedClubId). */
  preselectedClubSlug?: string;
  /** Slug override for team — used in URL construction (falls back to preselectedTeamId). */
  preselectedTeamSlug?: string;
}

// ────────────────────────────────────────────
// Shared filter select style
// ────────────────────────────────────────────

export const filterSelectStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid var(--app-border)',
  borderRadius: '4px',
  fontSize: '14px',
  backgroundColor: 'var(--app-surface)',
};
