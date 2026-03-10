/**
 * useMatchesData/index.ts
 * Main orchestrator hook for matches data.
 *
 * Encapsulates: seasons/competitions-for-filter fetches, matches state + fetch,
 * filtered/sorted derivations, and progressive-loading controls.
 */

import { useState, useEffect, useRef } from 'react';
import type { Activity } from '../../utils/directoryHelpers';
import type { Filters, UseMatchesDataReturn } from './types';
import { fetchMatchesSeasons, fetchMatchesCompetitions, fetchMatches } from './fetchers';
import { useDerivedMatches } from './derived';

// Re-export types
export type { Filters, UseMatchesDataReturn } from './types';

export function useMatchesData(filters: Filters): UseMatchesDataReturn {
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
    selectedSeasonName,
    selectedSeasonIds,
    selectedCompetitionId,
    setSeasons,
    setCompetitions,
    orgLocked,
    refreshKey,
    setError,
    getSelectedOrgIdForApi,
  } = filters;

  // ── State ─────────────────────────────────────────────────────────
  const [matches, setMatches] = useState<Activity[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesMaxItems, setMatchesMaxItems] = useState<number | null>(500);
  const loadMatchesSeqRef = useRef(0);

  // When the federation changes, reset match list + limit.
  useEffect(() => {
    setMatches([]);
    setMatchesMaxItems(500);
  }, [selectedOrgId]);

  // ── Fetch Seasons (for filter) ────────────────────────────────────
  useEffect(() => {
    const loadSeasons = async () => {
      try {
        const results = await fetchMatchesSeasons({
          selectedTeamId,
          selectedClubId,
          selectedOrgId,
          teams,
          refreshKey,
        });
        setSeasons(results);
      } catch {
        setSeasons([]);
      }
    };
    loadSeasons();
  }, [selectedTeamId, selectedClubId, selectedOrgId, teams, refreshKey, setSeasons]);

  // ── Fetch Competitions (for filter) ───────────────────────────────
  useEffect(() => {
    const loadCompetitions = async () => {
      try {
        const results = await fetchMatchesCompetitions({
          selectedSeasonName,
          selectedSeasonIds,
          selectedOrgId,
          selectedClubId,
          selectedTeamId,
          teams,
          refreshKey,
          getSelectedOrgIdForApi,
        });
        setCompetitions(results);
      } catch {
        setCompetitions([]);
      }
    };
    loadCompetitions();
  }, [selectedSeasonName, selectedSeasonIds, selectedOrgId, selectedClubId, selectedTeamId, teams, refreshKey, setCompetitions, getSelectedOrgIdForApi]);

  // ── Fetch Matches ─────────────────────────────────────────────────
  useEffect(() => {
    const loadMatches = async () => {
      const seq = (loadMatchesSeqRef.current += 1);
      setMatchesLoading(true);

      try {
        const results = await fetchMatches({
          selectedTeamId,
          selectedClubId,
          selectedOrgId,
          selectedSeasonName,
          selectedSeasonIds,
          selectedCompetitionId,
          teams,
          refreshKey,
          matchesMaxItems,
          orgLocked,
          getSelectedOrgIdForApi,
        });

        if (seq !== loadMatchesSeqRef.current) return;
        setMatches(results);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to load matches');
      } finally {
        if (seq === loadMatchesSeqRef.current) setMatchesLoading(false);
      }
    };

    loadMatches();
  }, [
    selectedTeamId,
    selectedClubId,
    selectedOrgId,
    selectedSeasonName,
    selectedSeasonIds,
    selectedCompetitionId,
    teams,
    refreshKey,
    matchesMaxItems,
    orgLocked,
    getSelectedOrgIdForApi,
    setError,
  ]);

  // ── Derived State ─────────────────────────────────────────────────
  const { filteredMatches, sortedMatches } = useDerivedMatches({
    matches,
    statusFilter,
    sportFilter,
    variantFilter,
    organisations,
    clubs,
    teams,
    selectedTeamId,
    selectedClubId,
  });

  return {
    matches,
    setMatches,
    matchesLoading,
    matchesMaxItems,
    setMatchesMaxItems,
    filteredMatches,
    sortedMatches,
  };
}
