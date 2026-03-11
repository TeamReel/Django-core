/**
 * Type definitions for useBreadcrumbsData.
 */
import type { BreadcrumbSwitcherOption } from '@django-core/page-templates';

// ─── Local structural types for API responses ────────────────────────────────

export interface ApiProject {
  id?: string | number;
  name?: string;
  slug?: string;
  parent_id?: unknown;
  parent_project_id?: unknown;
  parent_project?: { id?: string | number } | string | number | null;
  parent?: { id?: string | number } | string | number | null;
}

export interface ApiPeriod {
  id?: string | number;
  name?: string;
  slug?: string;
  [key: string]: unknown;
}

export interface ApiUser {
  id?: string | number;
  first_name?: string;
  last_name?: string;
  email?: string;
  name?: string;
}

export interface ApiMember {
  id?: string | number;
  user?: ApiUser;
}

export interface ApiMatch {
  id?: string | number;
  title?: string;
  name?: string;
  slug?: string;
}

export interface BreadcrumbsDataParams {
  orgSlug: string | null;
  clubSlugOrId: string | null;
  isTeamDetail: boolean;
  effectiveTeamSlugOrId: string | null;
  effectiveSeasonSlugOrId: string | null;
  effectiveCompetitionSlugOrId: string | null;
  effectiveMatchId: string | null;
  userDetailUserId: string;
}

export interface BreadcrumbsDataReturn {
  clubOptions: BreadcrumbSwitcherOption[];
  teamOptions: BreadcrumbSwitcherOption[];
  seasonOptions: BreadcrumbSwitcherOption[];
  competitionOptions: BreadcrumbSwitcherOption[];
  matchOptions: BreadcrumbSwitcherOption[];
  userOptions: BreadcrumbSwitcherOption[];
  memberOptions: BreadcrumbSwitcherOption[];
  currentMemberName: string | null;
  loadingTeams: boolean;
  loadingSeasons: boolean;
  loadingCompetitions: boolean;
  loadingMatches: boolean;
  loadingUsers: boolean;
  loadingMembers: boolean;
  isMemberDetailRoute: boolean;
}
