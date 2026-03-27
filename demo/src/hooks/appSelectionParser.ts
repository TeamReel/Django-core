/**
 * URL parsing logic and types for app selection context.
 *
 * Pure functions — no React dependencies.
 */

// ============================================================================
// Types
// ============================================================================

/** All possible fields from any parseAppPath variant. */
export type ParsedPathFields = {
  type: string;
  orgSlug?: string;
  clubSlugOrId?: string;
  teamSlugOrId?: string;
  seasonSlugOrId?: string;
  competitionSlugOrId?: string;
  matchId?: string;
};

export type AppProjectRow = {
  id: string | number;
  name: string;
  slug: string;
  updated_at?: string;
  parent_id?: string | number | null;
  parent_name?: string | null;
};

export type AppPeriodRow = {
  id: string;
  name?: string;
  start_date?: string | null;
  end_date?: string | null;
};

export type AppSelection = {
  orgSlug: string;
  clubSlugOrId: string | null;
  clubName: string | null;
  teamSlugOrId: string | null;
  teamName: string | null;
  teamIdForApi: string | null;
  seasonSlugOrId: string | null;
  seasonName: string | null;
  seasonIdForApi: string | null;
  competitionSlugOrId: string | null;
  competitionName: string | null;
  competitionIdForApi: string | null;
  matchId: string | null;
  /** User's own team — always from user.projects, never URL/localStorage. */
  myOrgSlug: string | null;
  myClubSlugOrId: string | null;
  myTeamSlugOrId: string | null;
  mySeasonSlugOrId: string | null;
};

// ============================================================================
// Constants
// ============================================================================

export const APP_LAST_CTX_KEY = 'demo_app_last_context_v1';

// Pre-compiled Regexes
const RESERVED_ROOT_SEGMENTS = new Set([
  '', 'dashboard', 'login', 'register', 'directory', 'organisations',
  'projects', 'matches', 'health', 'studio', 'content', 'notifications',
  'usage-events', 'settings', 'users'
]);

const REGEX = {
  vanityMatch: /^\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/,
  vanityCompetition: /^\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/,
  vanitySeason: /^\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/,
  vanityTeam: /^\/([^/]+)\/([^/]+)\/([^/]+)$/,
  vanityClub: /^\/([^/]+)\/([^/]+)$/,
  hierarchyMatchTeam: /^\/organisations\/([^/]+)\/projects\/([^/]+)\/teams\/([^/]+)\/seasons\/([^/]+)\/competitions\/([^/]+)\/matches\/([^/]+)/,
  hierarchyMatch: /^\/organisations\/([^/]+)\/projects\/([^/]+)\/seasons\/([^/]+)\/competitions\/([^/]+)\/matches\/([^/]+)/,
  legacyMatch: /^\/matches\/([^/]+)/,
  competitionTeamMatch: /^\/organisations\/([^/]+)\/projects\/([^/]+)\/teams\/([^/]+)\/seasons\/([^/]+)\/competitions\/([^/]+)/,
  competitionMatch: /^\/organisations\/([^/]+)\/projects\/([^/]+)\/seasons\/([^/]+)\/competitions\/([^/]+)/,
  seasonTeamMatch: /^\/organisations\/([^/]+)\/projects\/([^/]+)\/teams\/([^/]+)\/seasons\/([^/]+)/,
  seasonMatch: /^\/organisations\/([^/]+)\/projects\/([^/]+)\/seasons\/([^/]+)/,
  teamMatch: /^\/organisations\/([^/]+)\/projects\/([^/]+)\/teams\/([^/]+)/,
  clubMatch: /^\/organisations\/([^/]+)\/projects\/([^/]+)/,
};

// ============================================================================
// Path parser
// ============================================================================

export function parseAppPath(path: string) {
  const isVanity = (m: RegExpMatchArray | null) => Boolean(m && !RESERVED_ROOT_SEGMENTS.has(String(m[1] || '')));

  const vanityMatch = path.match(REGEX.vanityMatch);
  if (isVanity(vanityMatch)) return {
    type: 'vanityMatch',
    orgSlug: vanityMatch![1],
    clubSlugOrId: vanityMatch![2],
    teamSlugOrId: vanityMatch![3],
    seasonSlugOrId: vanityMatch![4],
    competitionSlugOrId: vanityMatch![5],
    matchId: vanityMatch![6],
  };

  const vanityCompetition = path.match(REGEX.vanityCompetition);
  if (isVanity(vanityCompetition)) return {
    type: 'vanityCompetition',
    orgSlug: vanityCompetition![1],
    clubSlugOrId: vanityCompetition![2],
    teamSlugOrId: vanityCompetition![3],
    seasonSlugOrId: vanityCompetition![4],
    competitionSlugOrId: vanityCompetition![5],
  };

  const vanitySeason = path.match(REGEX.vanitySeason);
  if (isVanity(vanitySeason)) return {
    type: 'vanitySeason',
    orgSlug: vanitySeason![1],
    clubSlugOrId: vanitySeason![2],
    teamSlugOrId: vanitySeason![3],
    seasonSlugOrId: vanitySeason![4],
  };

  const vanityTeam = path.match(REGEX.vanityTeam);
  if (isVanity(vanityTeam)) return {
    type: 'vanityTeam',
    orgSlug: vanityTeam![1],
    clubSlugOrId: vanityTeam![2],
    teamSlugOrId: vanityTeam![3],
  };

  const vanityClub = path.match(REGEX.vanityClub);
  if (isVanity(vanityClub)) return {
    type: 'vanityClub',
    orgSlug: vanityClub![1],
    clubSlugOrId: vanityClub![2],
  };

  const hierarchyMatchTeam = path.match(REGEX.hierarchyMatchTeam);
  if (hierarchyMatchTeam) return {
    type: 'hierarchyMatchTeam',
    orgSlug: hierarchyMatchTeam[1],
    clubSlugOrId: hierarchyMatchTeam[2],
    teamSlugOrId: hierarchyMatchTeam[3],
    seasonSlugOrId: hierarchyMatchTeam[4],
    competitionSlugOrId: hierarchyMatchTeam[5],
    matchId: hierarchyMatchTeam[6],
  };

  const hierarchyMatch = path.match(REGEX.hierarchyMatch);
  if (hierarchyMatch) return {
    type: 'hierarchyMatch',
    orgSlug: hierarchyMatch[1],
    teamSlugOrId: hierarchyMatch[2],
    seasonSlugOrId: hierarchyMatch[3],
    competitionSlugOrId: hierarchyMatch[4],
    matchId: hierarchyMatch[5],
  };

  const competitionTeamMatch = path.match(REGEX.competitionTeamMatch);
  if (competitionTeamMatch) return {
    type: 'competitionTeamMatch',
    orgSlug: competitionTeamMatch[1],
    clubSlugOrId: competitionTeamMatch[2],
    teamSlugOrId: competitionTeamMatch[3],
    seasonSlugOrId: competitionTeamMatch[4],
    competitionSlugOrId: competitionTeamMatch[5],
  };

  const competitionMatch = path.match(REGEX.competitionMatch);
  if (competitionMatch) return {
    type: 'competitionMatch',
    orgSlug: competitionMatch[1],
    teamSlugOrId: competitionMatch[2],
    seasonSlugOrId: competitionMatch[3],
    competitionSlugOrId: competitionMatch[4],
  };

  const legacyMatch = path.match(REGEX.legacyMatch);
  if (legacyMatch) return {
    type: 'legacyMatch',
    matchId: legacyMatch[1],
  };

  const seasonTeamMatch = path.match(REGEX.seasonTeamMatch);
  if (seasonTeamMatch) return {
    type: 'seasonTeamMatch',
    orgSlug: seasonTeamMatch[1],
    clubSlugOrId: seasonTeamMatch[2],
    teamSlugOrId: seasonTeamMatch[3],
    seasonSlugOrId: seasonTeamMatch[4],
  };

  const seasonMatch = path.match(REGEX.seasonMatch);
  if (seasonMatch) return {
    type: 'seasonMatch',
    orgSlug: seasonMatch[1],
    clubSlugOrId: seasonMatch[2],
    seasonSlugOrId: seasonMatch[3],
  };

  const teamMatch = path.match(REGEX.teamMatch);
  if (teamMatch) return {
    type: 'teamMatch',
    orgSlug: teamMatch[1],
    clubSlugOrId: teamMatch[2],
    teamSlugOrId: teamMatch[3],
  };

  const clubMatch = path.match(REGEX.clubMatch);
  if (clubMatch) return {
    type: 'clubMatch',
    orgSlug: clubMatch[1],
    clubSlugOrId: clubMatch[2],
  };

  return null;
}
