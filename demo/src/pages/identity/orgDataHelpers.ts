/**
 * Pure helper functions and constants for useOrgData.
 * Extracted from useOrgData.ts during Phase 21 refactor.
 */

import { periodPathKey } from '../../utils/periodPath';
import type { Project, Period } from '../../types';

/* ------------------------------------------------------------------ */
/*  Debug flag                                                         */
/* ------------------------------------------------------------------ */

export const DEBUG_LOGS = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === 'true');

/* ------------------------------------------------------------------ */
/*  API helpers                                                        */
/* ------------------------------------------------------------------ */

export { getApiV1BaseUrl } from '../../utils/apiFetch';

export { getCsrfToken } from '../../utils/csrf';

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                    */
/* ------------------------------------------------------------------ */

export const ORG_TABS: { id: string; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'clubs', label: 'Clubs' },
  { id: 'members', label: 'Members' },
  { id: 'identity', label: 'Identity' },
  { id: 'settings', label: 'Settings' },
];

export const ALLOWED_TABS = new Set([
  'overview', 'clubs', 'members', 'identity', 'settings',
]);

/** Map legacy tab names to compact tab IDs */
export const LEGACY_TAB_MAP: Record<string, string> = {
  hierarchy: 'clubs',
  teams: 'clubs',
  seasons: 'clubs',
  competitions: 'clubs',
  matches: 'clubs',
  users: 'members',
  people: 'members',
  audit: 'settings',
  governance: 'settings',
  operations: 'settings',
};

/* ------------------------------------------------------------------ */
/*  Path builder                                                       */
/* ------------------------------------------------------------------ */

export interface MatchPathDeps {
  currentOrgSlug: string | undefined;
  clubs: Project[];
  teams: Project[];
  orgPeriods: Period[];
}

/** Minimal match shape for path building */
interface MatchRef {
  slug?: string;
  id?: string | number;
  project_id?: string | number;
  period_id?: string | number;
  project?: {
    id?: string | number;
    parent_id?: string | number;
    parent?: { id?: string | number } | null;
    parent_project_id?: string | number;
  } | null;
  period?: {
    id?: string | number;
    slug?: string;
    parent_period_id?: string | number;
    parent_period?: { id?: string | number; slug?: string; name?: string } | null;
    [key: string]: unknown;
  } | null;
}

/**
 * Build the best deep-link path for a given match, using club/team/period
 * hierarchy data when available.
 */
export const getBestMatchDetailPath = (m: MatchRef, deps: MatchPathDeps): string => {
  const matchSlugOrId = String(m?.slug || m?.id || '').trim();
  if (!matchSlugOrId) return '/matches';

  const orgSlug = String(deps.currentOrgSlug || '').trim();
  if (!orgSlug) return `/matches/${matchSlugOrId}`;

  const clubById = new Map<string, Project>();
  for (const c of deps.clubs) {
    if (!c) continue;
    clubById.set(String(c.id), c);
  }

  const teamById = new Map<string, Project>();
  for (const t of deps.teams) {
    if (!t) continue;
    teamById.set(String(t.id), t);
  }

  const periodById = new Map<string, Period>();
  for (const p of deps.orgPeriods) {
    if (!p) continue;
    periodById.set(String(p.id), p);
  }

  const teamId = String(m?.project?.id ?? m?.project_id ?? '').trim();
  const team = teamId ? teamById.get(teamId) : null;
  const teamSlugOrId = String(team?.slug || team?.id || teamId || '').trim();

  const rawClubId = String(
    (team?.parent_id ?? team?.parent ?? team?.parent_project ?? team?.parent_project_id) ??
      (m?.project?.parent_id ?? m?.project?.parent?.id ?? m?.project?.parent_project_id) ??
      '',
  ).trim();
  const club = rawClubId ? clubById.get(rawClubId) : null;
  const clubSlugOrId = String(club?.slug || club?.id || rawClubId || '').trim();

  const periodId = String(m?.period?.id ?? m?.period_id ?? '').trim();
  const competition = periodId ? (periodById.get(periodId) || m?.period) : m?.period;
  const competitionKeyOrId = String(
    periodPathKey(competition as Parameters<typeof periodPathKey>[0]) || competition?.slug || competition?.id || periodId || '',
  ).trim();
  const seasonId = String(
    competition?.parent_period_id ?? competition?.parent_period?.id ?? '',
  ).trim();
  const season = seasonId ? periodById.get(seasonId) : competition?.parent_period;
  const seasonKeyOrId = String(
    periodPathKey(season) || season?.slug || season?.id || seasonId || '',
  ).trim();

  if (orgSlug && clubSlugOrId && teamSlugOrId && seasonKeyOrId && competitionKeyOrId) {
    return `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}/${matchSlugOrId}`;
  }

  return `/matches/${matchSlugOrId}`;
};
