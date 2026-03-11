/**
 * Type definitions for the useDirectoryFilters hook.
 */
import type { useSports } from './useSports';
import type { useContextSwitcher } from '@django-core/context-switcher';
import type { OrganisationOption, ProjectOption } from '../pages/work/WorkFilterBar';
import type { DirectoryListProps, SeasonOption, Period } from '../utils/directoryHelpers';

// Re-export so consumers only need one import
export type { OrganisationOption, ProjectOption };

export interface UseDirectoryFiltersConfig extends DirectoryListProps {
  /** Show season filter dropdown (Competitions + Matches). */
  showSeasonFilter?: boolean;
  /** Show competition filter dropdown (Matches only). */
  showCompetitionFilter?: boolean;
  /** Show sport variant filter (Competitions + Matches). */
  showVariantFilter?: boolean;
}

export interface DirectoryFiltersState {
  // Auth
  isSuperAdmin: boolean;
  user: { id?: string | number; email?: string; is_superuser?: boolean } | null;

  // Lock flags
  orgLocked: boolean;
  clubLocked: boolean;
  teamLocked: boolean;

  // Options lists
  organisations: OrganisationOption[];
  clubs: ProjectOption[];
  teams: ProjectOption[];

  // Selection
  selectedOrgId: string;
  selectedClubId: string;
  selectedTeamId: string;
  statusFilter: string;
  sportFilter: string;
  variantFilter: string;

  // Season cascade (Competitions + Matches)
  selectedSeasonName: string;
  seasonOptions: SeasonOption[];
  selectedSeasonIds: string[];
  seasons: Period[];
  setSeasons: React.Dispatch<React.SetStateAction<Period[]>>;

  // Competition cascade (Matches only)
  selectedCompetitionId: string;
  competitions: Period[];
  setCompetitions: React.Dispatch<React.SetStateAction<Period[]>>;

  // Setters with cascade resets
  setSelectedOrgId: (v: string) => void;
  setSelectedClubId: (v: string) => void;
  setSelectedTeamId: (v: string) => void;
  setStatusFilter: (v: string) => void;
  setSportFilter: (v: string) => void;
  setVariantFilter: (v: string) => void;
  setSelectedSeasonName: (v: string) => void;
  setSelectedCompetitionId: (v: string) => void;
  clearAll: () => void;

  // Loading / error
  isLoading: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;

  // Refresh
  refreshKey: number;
  triggerRefresh: () => void;

  // Resolved values (for API calls)
  lockedOrgSlug: string;
  getSelectedOrgSlugForApi: () => string;
  getSelectedOrgIdForApi: () => string;

  // Route key helpers
  orgKeyForRoutes: string;

  // Sports
  categories: ReturnType<typeof useSports>['categories'];
  variants: ReturnType<typeof useSports>['variants'];
  getVariantsForCategory: ReturnType<typeof useSports>['getVariantsForCategory'];

  // Context
  context: ReturnType<typeof useContextSwitcher>['context'];
}
