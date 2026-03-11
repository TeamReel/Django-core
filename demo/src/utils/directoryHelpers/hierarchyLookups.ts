/**
 * Hierarchy lookups — resolve names from org/club/team/season lists.
 */

import type { OrganisationOption, ProjectOption } from '../../pages/work/WorkFilterBar';
import type { DirectoryRow } from './types';

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
