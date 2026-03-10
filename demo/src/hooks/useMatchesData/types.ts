/**
 * useMatchesData/types.ts
 * Types for the matches data hook.
 */

import type { Activity } from '../../utils/directoryHelpers';
import type { useDirectoryFilters } from '../useDirectoryFilters';

export type Filters = ReturnType<typeof useDirectoryFilters>;

export interface UseMatchesDataReturn {
  matches: Activity[];
  setMatches: React.Dispatch<React.SetStateAction<Activity[]>>;
  matchesLoading: boolean;
  matchesMaxItems: number | null;
  setMatchesMaxItems: React.Dispatch<React.SetStateAction<number | null>>;
  filteredMatches: Activity[];
  sortedMatches: Activity[];
}
