/**
 * Shared types for all directory list pages.
 */

import type { OrganisationOption, ProjectOption } from '../../pages/work/WorkFilterBar';

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

export interface DirectoryListProps {
  preselectedOrgId?: string;
  preselectedClubId?: string;
  preselectedTeamId?: string;
  /** Slug override for club — used in URL construction (falls back to preselectedClubId). */
  preselectedClubSlug?: string;
  /** Slug override for team — used in URL construction (falls back to preselectedTeamId). */
  preselectedTeamSlug?: string;
}

export interface SeasonOption {
  name: string;
  ids: string[];
}

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
