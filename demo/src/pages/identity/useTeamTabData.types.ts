import { type Dispatch, type SetStateAction } from 'react';

import { MEDIA_SLOTS } from '@/constants/mediaSlots';
import type { Period, OverviewMember } from './teamDetailTypes';

/** Membership record used for media-progress tracking. */
export interface TeamMemberRecord {
  [key: string]: unknown;
  id?: string | number;
  user?: { id?: string | number; avatar_url?: string | null; first_name?: string; last_name?: string; email?: string; [key: string]: unknown };
  /** Dynamic metadata — `any` kept for deep TeamReel asset traversal. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  functional_roles?: string[];
  role?: string;
}

/** Match / activity reference. */
export interface TeamMatchRecord {
  id?: string | number;
  title?: string;
  name?: string;
  slug?: string;
  period_id?: string;
  period?: string | { id?: string } | null;
  start_time?: string;
  [key: string]: unknown;
}

/** Org member item from the organisation members endpoint. */
export interface OrgMemberItem {
  id?: string | number;
  user?: { id?: string | number; first_name?: string; last_name?: string; email?: string; project_memberships?: { project_id?: string | number; project?: { id?: string | number } }[] };
  project_memberships?: { project_id?: string | number; project?: { id?: string | number } }[];
  [key: string]: unknown;
}

/** Kit roles used for brand asset checklist */
export const KIT_ROLES = [
  { id: 'home', label: 'Thuis tenue' },
  { id: 'away', label: 'Uit tenue' },
  { id: 'third', label: 'Derde tenue' },
  { id: 'keeper', label: 'Keeper tenue' },
];

/** Slots tracked on the overview */
export const TRACKED_SLOTS = MEDIA_SLOTS.filter(
  (s) => ['profile', 'kit', 'closeup', 'intro', 'celebration'].includes(s.id),
);

export interface UseTeamTabDataParams {
  activeTabFromUrl: string;
  apiBaseUrl: string;
  teamIdForDirectoryLists: string;
  clubIdForDirectoryLists: string;
  orgSlugForDirectoryLists: string;
  orgId: string;
  clubId: string;
}

export interface UseTeamTabDataReturn {
  hierarchySeasons: Period[];
  hierarchyCompetitionsBySeasonId: Record<string, Period[]>;
  hierarchyMatchesCountBySeasonId: Record<string, number>;
  hierarchyMatchesCountByCompetitionId: Record<string, number>;
  hierarchyLoading: boolean;
  hierarchyError: string | null;
  hierarchySearch: string;
  setHierarchySearch: Dispatch<SetStateAction<string>>;
  overviewMembers: OverviewMember[];
  overviewMembersCount: number | null;
  overviewMembersLoading: boolean;
  overviewMembersError: string | null;
  // Brand
  brandAssets: { label: string; present: boolean }[];
  brandLogoUrl: string | null;
  brandSponsorUrl: string | null;
  batchBrandKits: Record<string, string | null>;
  // Media progress
  fullMembers: TeamMemberRecord[];
  fullMembersLoading: boolean;
  refreshFullMembers: () => void;
  assetStats: { id: string; label: string; done: number; total: number; pct: number }[];
  // Content
  contentCount: number | null;
  contentCountLoading: boolean;
  // Team matches
  teamMatches: TeamMatchRecord[];
  teamMatchesLoading: boolean;
  teamMatchesByPeriodId: Record<string, TeamMatchRecord[]>;
}
