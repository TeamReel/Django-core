/**
 * Shared helpers for all directory list pages (Seasons, Competitions, Matches, etc.).
 *
 * These functions were copy-pasted across SeasonsList, CompetitionsList and MatchesList.
 * Centralising them here eliminates ~400 lines of duplication.
 */

import type { OrganisationOption, ProjectOption } from '../pages/work/WorkFilterBar';

/** Loose row shape shared by all directory-list helpers (covers Period, Activity, etc.). */
export type DirectoryRow = {
  organisation?: { id: string; name: string; slug?: string; sport?: { id: string | number; name?: string } | null } | string | null;
  organisation_id?: string | null;
  project?: { id: string | number; name: string; slug?: string; parent_id?: string; parent_project_id?: string } | string | null;
  project_id?: string | null;
  parent_period?: { id: string; name: string; slug?: string; start_date?: string; end_date?: string } | null;
  parent_period_id?: string | null;
  start_date?: string;
  end_date?: string;
  [key: string]: unknown;
};

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
export const isPeriodActive = (p: DirectoryRow): boolean => {
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
export const getTeamParentId = (t: { parent_id?: unknown; parent?: unknown; parent_project_id?: unknown; parent_project?: unknown } | null | undefined): string | null => {
  const parent =
    t?.parent_id ??
    t?.parent ??
    t?.parent_project_id ??
    (typeof t?.parent_project === 'object' ? (t.parent_project as Record<string, unknown>).id : t?.parent_project);
  if (parent == null) return null;
  return String(typeof parent === 'object' ? (parent as Record<string, unknown>).id : parent);
};

/** Resolve the Federation name for a period/activity. */
export const getFederationName = (
  item: DirectoryRow,
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
export const getTeamId = (item: DirectoryRow): string => {
  const project = item?.project;
  return String(typeof project === 'object' ? project?.id : project || '');
};

/** Extract the team (project) name from an item + teams list. */
export const getTeamName = (
  item: DirectoryRow,
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
  item: DirectoryRow,
  clubs: ProjectOption[],
  teams: ProjectOption[],
): string => {
  const teamId = getTeamId(item);
  const teamObj = teams.find((t) => String(t.id) === String(teamId));
  const clubId =
    teamObj?.parent_id || teamObj?.parent || teamObj?.parent_project_id;
  const clubObj = clubs.find((c) => String(c.id) === String(clubId));
  return clubObj?.name || '';
};

/** Resolve season name from a period's parent_period or a seasons list. */
export const getSeasonName = (
  item: DirectoryRow,
  seasons: Record<string, unknown>[],
): string => {
  const season = item?.parent_period;
  if (typeof season === 'object' && season?.name) return season.name;
  const seasonId = item?.parent_period_id || season?.id;
  const fromList = seasonId
    ? seasons.find((s) => String(s.id) === String(seasonId))
    : undefined;
  return String(fromList?.name || '');
};

// ────────────────────────────────────────────
// Sport filter helper
// ────────────────────────────────────────────

/** Filter a list of periods/activities by sportFilter against the organisation's sport. */
export const matchesSportFilter = (
  item: DirectoryRow,
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
  return String(org?.sport?.id || '') === String(sportFilter);
};

// ────────────────────────────────────────────
// Season options builder (used by Competitions + Matches)
// ────────────────────────────────────────────

export interface SeasonOption {
  name: string;
  ids: string[];
}

/** Build de-duped season dropdown options from a list of season periods. */
export const buildSeasonOptions = (seasons: Record<string, unknown>[]): SeasonOption[] => {
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
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--app-border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--text-sm)',
  backgroundColor: 'var(--app-surface)',
};

// ────────────────────────────────────────────
// Shared domain types
// ────────────────────────────────────────────

/** A period (season or competition) as returned by the API. */
export type Period = {
  id: string;
  name: string;
  slug?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  type?: string;
  project?: { id: string; name: string } | null;
  project_id?: string | null;
  organisation?: { id: string; name: string } | null;
  organisation_id?: string | null;
  parent_period?: { id: string; name: string; slug?: string } | null;
  parent_period_id?: string | null;
  children_count?: number;
  activities_count?: number;
  matches_count?: number;
  children_matches_count?: number;
  matches_total_count?: number;
  members_count?: number;
  data?: Record<string, unknown>;
  sport?: { id: string | number; name: string; slug?: string; sport_icon?: string; category_name?: string } | null;
  period_type?: string;
  [key: string]: unknown;
};

/** A match activity as returned by the API. */
export type Activity = {
  id: string;
  slug?: string;
  title: string;
  activity_type: string;
  start_time?: string;
  end_time?: string | null;
  project?: { id: string | number; name: string; slug?: string; organisation_id?: string } | null;
  period?: {
    id: string;
    name: string;
    parent_period?: { id: string; name: string; slug?: string } | null;
    slug?: string;
    sport?: {
      id: string | number;
      name: string;
      slug?: string;
      sport_icon?: string;
      category_name?: string;
      parent_sport_id?: string | number | null;
    } | null;
  } | null;
  organisation?: { id: string; name: string; slug: string; sport?: { id: string | number; name?: string } | null } | null;
  organisation_id?: string;
  opponent_project?: { id: string | number; name: string; slug?: string } | null;
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
  location?: string;
  description?: string;
};

// ────────────────────────────────────────────
// Row context resolution (shared across all directory tables)
// ────────────────────────────────────────────

export interface RowContextConfig {
  organisations: OrganisationOption[];
  clubs: ProjectOption[];
  teams: ProjectOption[];
  /** Resolved locked-org slug (from `useDirectoryFilters`). */
  lockedOrgSlug?: string;
  /** Preselected slug overrides. */
  preselectedClubSlug?: string;
  preselectedTeamSlug?: string;
  /** Currently selected IDs (used as fallbacks). */
  selectedOrgId?: string;
  selectedClubId?: string;
  /** Fallback org route key (e.g. `orgKeyForRoutes` from the hook). */
  fallbackOrgSlug?: string;
}

export interface RowContext {
  orgId: string;
  orgName: string;
  orgSlug: string;
  clubId: string;
  clubName: string;
  clubSlug: string;
  teamId: string;
  teamName: string;
  teamSlug: string;
  teamObj: ProjectOption | undefined;
  clubObj: ProjectOption | undefined;
  orgObj: OrganisationOption | undefined;
  /** Canonical path to the team page. */
  teamBasePath: string;
}

/**
 * Resolve the common org/club/team context for a table row.
 *
 * Every directory list table row needs to resolve the same chain:
 * item → project (team) → parent (club) → organisation → slugs → paths.
 *
 * Call this once per row and destructure the result.
 */
export function resolveRowContext(
  item: DirectoryRow,
  config: RowContextConfig,
): RowContext {
  const {
    organisations,
    clubs,
    teams,
    lockedOrgSlug = '',
    preselectedClubSlug,
    preselectedTeamSlug,
    selectedOrgId = '',
    selectedClubId = '',
    fallbackOrgSlug = '',
  } = config;

  // ── Team ────────────────────────────────────────────────────────
  const project = item?.project;
  const teamId = String(
    (typeof project === 'object' ? project?.id : project) ??
      item?.project_id ??
      '',
  );
  const teamName =
    (typeof project === 'object' ? project?.name : undefined) || '-';
  const teamObj = teamId
    ? teams.find((t) => String(t.id) === String(teamId))
    : undefined;

  // ── Club ────────────────────────────────────────────────────────
  const clubId = String(
    getTeamParentId(teamObj) ??
      (typeof project === 'object' ? project?.parent_id : undefined) ??
      '',
  );
  const clubObj = clubId
    ? clubs.find((c) => String(c.id) === String(clubId))
    : undefined;
  const clubName: string = clubObj?.name || '-';

  // ── Organisation ────────────────────────────────────────────────
  // Prefer the item's own org data; fall back to selectedOrgId for items
  // that don't embed org info (e.g. Activity/match).
  const rawOrg = item?.organisation;
  const orgId = String(
    (typeof rawOrg === 'object' ? rawOrg?.id : rawOrg) ||
      item?.organisation_id ||
      selectedOrgId ||
      clubObj?.organisation ||
      teamObj?.organisation ||
      '',
  );
  const orgObj = orgId
    ? organisations.find((o) => String(o.id) === String(orgId))
    : undefined;
  const orgName: string =
    (typeof rawOrg === 'object' ? rawOrg?.name : undefined) ||
    orgObj?.name ||
    '-';

  // ── Slugs for URL construction ──────────────────────────────────
  const orgSlugResolved =
    lockedOrgSlug ||
    orgObj?.slug ||
    (typeof rawOrg === 'object' ? rawOrg?.slug : undefined) ||
    orgId;
  const orgSlug = String(orgSlugResolved || fallbackOrgSlug || '').trim();
  const clubSlug = String(
    clubObj?.slug || preselectedClubSlug || clubId || selectedClubId || '',
  ).trim();
  const teamSlug = String(
    teamObj?.slug ||
      (typeof project === 'object' ? project?.slug : undefined) ||
      preselectedTeamSlug ||
      teamId ||
      '',
  ).trim();

  // ── Team base path ──────────────────────────────────────────────
  const teamBasePath = clubSlug
    ? `/${orgSlug}/${clubSlug}/${teamSlug}`
    : `/organisations/${orgSlug}/projects/${teamSlug}`;

  return {
    orgId,
    orgName,
    orgSlug,
    clubId,
    clubName,
    clubSlug,
    teamId,
    teamName,
    teamSlug,
    teamObj,
    clubObj,
    orgObj,
    teamBasePath,
  };
}
