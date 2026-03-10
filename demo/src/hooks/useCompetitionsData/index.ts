/**
 * useCompetitionsData/index.ts
 * Main orchestrator hook for competitions data.
 *
 * Encapsulates: seasons-for-filter fetch, competitions state + fetch,
 * CRUD operations, and filtered/sorted derivations.
 */

import { useState, useEffect } from 'react';
import type { Period } from '../../utils/directoryHelpers';
import type { Filters, UseCompetitionsDataReturn } from '../competitionsDataTypes';
import { fetchSeasons, fetchCompetitions } from './fetchers';
import { useCompetitionHandlers } from './handlers';
import { useDerivedCompetitions } from './derived';

// Re-export types for backward compatibility
export type { Filters, UseCompetitionsDataReturn } from '../competitionsDataTypes';
export type { PeriodWithMeta } from './types';

export function useCompetitionsData(filters: Filters): UseCompetitionsDataReturn {
  const {
    organisations,
    clubs,
    teams,
    selectedOrgId,
    selectedClubId,
    selectedTeamId,
    statusFilter,
    sportFilter,
    variantFilter,
    selectedSeasonIds,
    seasons,
    setSeasons,
    refreshKey,
    triggerRefresh,
    setError,
    getSelectedOrgIdForApi,
  } = filters;

  // ── State ─────────────────────────────────────────────────────────
  const [competitions, setCompetitions] = useState<Period[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(false);

  // ── Fetch Seasons (for filter dropdown) ───────────────────────────
  useEffect(() => {
    const loadSeasons = async () => {
      try {
        const results = await fetchSeasons({
          selectedTeamId,
          selectedClubId,
          selectedOrgId,
          teams,
          refreshKey,
          getSelectedOrgIdForApi,
        });
        setSeasons(results);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to load seasons');
        setSeasons([]);
      }
    };

    loadSeasons();
  }, [selectedTeamId, selectedClubId, selectedOrgId, teams, refreshKey, getSelectedOrgIdForApi, setSeasons, setError]);

  // ── Fetch Competitions ────────────────────────────────────────────
  useEffect(() => {
    const loadCompetitions = async () => {
      setCompetitionsLoading(true);
      try {
        const results = await fetchCompetitions({
          selectedTeamId,
          selectedClubId,
          selectedOrgId,
          selectedSeasonIds,
          teams,
          refreshKey,
          getSelectedOrgIdForApi,
        });
        setCompetitions(results);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to load competitions');
      } finally {
        setCompetitionsLoading(false);
      }
    };

    loadCompetitions();
  }, [selectedTeamId, selectedClubId, selectedOrgId, selectedSeasonIds, teams, refreshKey, getSelectedOrgIdForApi, setError]);

  // ── CRUD Handlers ─────────────────────────────────────────────────
  const { savePeriodEdits, createCompetition, handleDeleteCompetition } = useCompetitionHandlers({
    selectedOrgId,
    selectedTeamId,
    selectedSeasonIds,
    triggerRefresh,
    setCompetitions,
  });

  // ── Derived State ─────────────────────────────────────────────────
  const { filteredCompetitions, sortedCompetitions } = useDerivedCompetitions({
    competitions,
    statusFilter,
    sportFilter,
    variantFilter,
    organisations,
    clubs,
    teams,
    seasons,
  });

  return {
    competitions,
    competitionsLoading,
    filteredCompetitions,
    sortedCompetitions,
    savePeriodEdits,
    createCompetition,
    handleDeleteCompetition,
  };
}
