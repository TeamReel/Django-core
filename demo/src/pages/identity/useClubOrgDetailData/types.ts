/**
 * useClubOrgDetailData/types.ts
 * Types for the ClubOrgDetail data hook.
 */

import type { Dispatch, SetStateAction } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { BreadcrumbSwitcherOption } from '@django-core/page-templates';
import type { Organisation, Project, Period, OverviewMember } from '../clubOrgDetailHelpers';

/** Raw member item from the organisation members API (overview tab). */
export type RawMemberApiItem = {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  user?: RawMemberApiItem;
  project_memberships?: Array<{
    project_id?: string;
    project?: { id?: string; parent_id?: string; parent_project_id?: string };
  }>;
};

export interface UseClubOrgDetailDataReturn {
  // Core
  org: Organisation | null;
  club: Project | null;
  loading: boolean;
  error: string | null;
  navigate: NavigateFunction;
  apiBaseUrl: string;
  activeContext: Record<string, unknown> | null;
  setActiveContextState: Dispatch<SetStateAction<Record<string, unknown> | null>>;
  activatingContext: boolean;
  setActivatingContext: Dispatch<SetStateAction<boolean>>;
  // Modals
  isProjectEditModalOpen: boolean;
  setIsProjectEditModalOpen: Dispatch<SetStateAction<boolean>>;
  isProjectDetailModalOpen: boolean;
  setIsProjectDetailModalOpen: Dispatch<SetStateAction<boolean>>;
  // Tabs
  activeTabFromUrl: string;
  makeTabHref: (tabId: string) => string;
  // IDs / keys
  orgIdForDirectoryLists: string;
  orgSlugForDirectoryLists: string;
  clubIdForDirectoryLists: string;
  orgKeyForRoutes: string;
  clubKeyForRoutes: string;
  backToOrgHref: string;
  // Club switcher
  clubBreadcrumbOptions: BreadcrumbSwitcherOption[];
  orgClubsForSwitcherLoading: boolean;
  handleClubSwitch: (option: BreadcrumbSwitcherOption) => void;
  // Overview
  overviewLoading: boolean;
  overviewError: string | null;
  overviewTeams: Project[];
  overviewSeasons: Period[];
  overviewMembers: OverviewMember[];
  overviewCounts: { teams: number; seasons: number; members: number } | null;
  // Hierarchy (spread from useClubOrgHierarchy)
  hierarchySearch: string;
  setHierarchySearch: Dispatch<SetStateAction<string>>;
  hierarchyTeams: Project[];
  hierarchySeasonsByTeamId: Record<string, Period[]>;
  hierarchyCompetitionsCountByTeamId: Record<string, number>;
  hierarchyMatchesCountByTeamId: Record<string, number>;
  hierarchyCompetitionsCountBySeasonId: Record<string, number>;
  hierarchyMatchesCountBySeasonId: Record<string, number>;
  hierarchyMembersCountByTeamId: Record<string, number>;
  hierarchyMembersCountForClub: number | null;
  hierarchyLoading: boolean;
  hierarchyError: string | null;
  // Brand
  brandLogoUrl: string | null;
  brandProfileId: string | null;
  // Refetch
  refetch: () => void;
}

// Re-export from helpers
export type { Organisation, Project, Period, OverviewMember };
