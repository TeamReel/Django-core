import type { UseTeamTabDataParams, UseTeamTabDataReturn } from './useTeamTabData.types';
import { useHierarchyData } from './useHierarchyData';
import { useOverviewMembers } from './useOverviewMembers';
import { useMediaProgress } from './useMediaProgress';
import { useBrandData } from './useBrandData';
import { useTeamMatches } from './useTeamMatches';

export type { UseTeamTabDataParams, UseTeamTabDataReturn };

export function useTeamTabData({
  activeTabFromUrl,
  apiBaseUrl,
  teamIdForDirectoryLists,
  clubIdForDirectoryLists,
  orgSlugForDirectoryLists,
  orgId,
  clubId,
}: UseTeamTabDataParams): UseTeamTabDataReturn {
  const hierarchy = useHierarchyData({
    activeTabFromUrl,
    apiBaseUrl,
    teamIdForDirectoryLists,
    clubIdForDirectoryLists,
  });

  const overview = useOverviewMembers({
    activeTabFromUrl,
    apiBaseUrl,
    orgSlugForDirectoryLists,
    teamIdForDirectoryLists,
  });

  const media = useMediaProgress({
    activeTabFromUrl,
    apiBaseUrl,
    teamIdForDirectoryLists,
  });

  const brand = useBrandData({
    activeTabFromUrl,
    orgId,
    clubId,
    teamIdForDirectoryLists,
  });

  const matches = useTeamMatches({
    activeTabFromUrl,
    apiBaseUrl,
    teamIdForDirectoryLists,
  });

  return {
    // Hierarchy
    ...hierarchy,
    // Overview members
    ...overview,
    // Brand
    ...brand,
    // Media progress
    ...media,
    // Content + Team matches
    ...matches,
  };
}
