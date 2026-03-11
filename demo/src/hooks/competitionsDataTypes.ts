/**
 * Type definitions for the useCompetitionsData hook.
 */
import type { useDirectoryFilters } from './useDirectoryFilters';
import type { Period } from '../utils/directoryHelpers';

export type Filters = ReturnType<typeof useDirectoryFilters>;

export interface UseCompetitionsDataReturn {
  competitions: Period[];
  competitionsLoading: boolean;
  filteredCompetitions: Period[];
  sortedCompetitions: Period[];
  savePeriodEdits: (periodId: string, payload: Record<string, unknown>) => Promise<void>;
  createCompetition: (payload: {
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    organisation_id?: string;
    project_id?: string;
    parent_period_id?: string;
  }) => Promise<void>;
  handleDeleteCompetition: (orgId: string, compId: string, compName: string) => Promise<void>;
}
