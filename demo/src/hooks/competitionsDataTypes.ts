/**
 * Type definitions for the useCompetitionsData hook.
 */
import type { useDirectoryFilters } from './useDirectoryFilters';

export type Filters = ReturnType<typeof useDirectoryFilters>;

export interface UseCompetitionsDataReturn {
  competitions: any[];
  competitionsLoading: boolean;
  filteredCompetitions: any[];
  sortedCompetitions: any[];
  savePeriodEdits: (periodId: string, payload: any) => Promise<void>;
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
