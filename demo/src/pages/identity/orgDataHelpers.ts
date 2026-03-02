/**
 * Pure helper functions and constants for useOrgData.
 * Extracted from useOrgData.ts during Phase 21 refactor.
 */

import { periodPathKey } from '../../utils/periodPath';

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
  { id: 'hierarchy', label: 'Hierarchy' },
  { id: 'clubs', label: 'Clubs' },
  { id: 'teams', label: 'Teams' },
  { id: 'seasons', label: 'Seasons' },
  { id: 'competitions', label: 'Competitions' },
  { id: 'matches', label: 'Matches' },
  { id: 'users', label: 'Members' },
  { id: 'audit', label: 'Audit' },
  { id: 'governance', label: 'Governance' },
  { id: 'operations', label: 'Operations (Admin)' },
  { id: 'settings', label: 'Settings' },
];

export const ALLOWED_TABS = new Set([
  'overview', 'hierarchy', 'clubs', 'teams', 'seasons', 'competitions',
  'matches', 'users', 'audit', 'governance', 'operations', 'identity', 'settings',
]);

/* ------------------------------------------------------------------ */
/*  Path builder                                                       */
/* ------------------------------------------------------------------ */

export interface MatchPathDeps {
  currentOrgSlug: string | undefined;
  clubs: any[];
  teams: any[];
  orgPeriods: any[];
}

/**
 * Build the best deep-link path for a given match, using club/team/period
 * hierarchy data when available.
 */
export const getBestMatchDetailPath = (m: any, deps: MatchPathDeps): string => {
  const matchSlugOrId = String((m as any)?.slug || m?.id || '').trim();
  if (!matchSlugOrId) return '/matches';

  const orgSlug = String(deps.currentOrgSlug || '').trim();
  if (!orgSlug) return `/matches/${matchSlugOrId}`;

  const clubById = new Map<string, any>();
  for (const c of deps.clubs as any[]) {
    if (!c) continue;
    clubById.set(String(c.id), c);
  }

  const teamById = new Map<string, any>();
  for (const t of deps.teams as any[]) {
    if (!t) continue;
    teamById.set(String(t.id), t);
  }

  const periodById = new Map<string, any>();
  for (const p of deps.orgPeriods as any[]) {
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
    periodPathKey(competition) || (competition as any)?.slug || (competition as any)?.id || periodId || '',
  ).trim();
  const seasonId = String(
    (competition as any)?.parent_period_id ?? (competition as any)?.parent_period?.id ?? '',
  ).trim();
  const season = seasonId ? periodById.get(seasonId) : (competition as any)?.parent_period;
  const seasonKeyOrId = String(
    periodPathKey(season) || (season as any)?.slug || (season as any)?.id || seasonId || '',
  ).trim();

  if (orgSlug && clubSlugOrId && teamSlugOrId && seasonKeyOrId && competitionKeyOrId) {
    return `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}/${matchSlugOrId}`;
  }

  return `/matches/${matchSlugOrId}`;
};
