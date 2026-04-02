/**
 * useSquadData – Hook for fetching and managing team squad
 */
import { useCallback } from 'react';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import { getFormations } from '@/utils/masterData';
import { useMatchWizard } from '../MatchWizardContext';
import type { SquadMember } from '../types';

// ============================================================================
// Return type
// ============================================================================

export interface UseSquadDataReturn {
  fetchSquad: () => Promise<void>;
  loadSavedLineup: () => void;
  saveLineup: () => Promise<boolean>;
}

export function useSquadData(): UseSquadDataReturn {
  const {
    selectedMatch,
    setSquadGroups,
    setSquadLoading,
    setSquadError,
    lineupFormation,
    lineupSlots,
    setLineupSlots,
    setLineupFormation,
  } = useMatchWizard();

  const fetchSquad = useCallback(async () => {
    if (!selectedMatch) return;

    const pid = selectedMatch.project?.id;
    if (!pid) return;

    const seasonId = selectedMatch.period?.parent_period?.id;

    setSquadLoading(true);
    setSquadError(null);

    try {
      const fetchMembers = (withSeason: boolean) =>
        api.listAll<SquadMember>(
          `/projects/${encodeURIComponent(String(pid))}/members/`,
          {
            pageSize: 100,
            ...(withSeason && seasonId ? { params: { period: seasonId } } : {}),
          },
        );

      let members: SquadMember[] = [];
      if (seasonId) {
        members = await fetchMembers(true);
        // Fallback: if season roster is empty, load all members
        if (members.length === 0) members = await fetchMembers(false);
      } else {
        members = await fetchMembers(false);
      }

      // Group by role
      const groups: Record<string, SquadMember[]> = { goalkeeper: [], player: [] };
      members.forEach(p => {
        let roles: string[] = [];
        if (p.functional_roles?.length) roles = p.functional_roles;
        else if (p.metadata?.functional_roles?.length) roles = p.metadata.functional_roles;
        else if (p.data?.functional_role) roles = [p.data.functional_role];
        else if (p.metadata?.team_role) roles = [p.metadata.team_role];
        else roles = ['player'];

        roles.forEach(role => {
          const nr = role.toLowerCase();
          if (nr === 'goalkeeper' || nr === 'keeper' || nr === 'gk') {
            groups.goalkeeper.push(p);
          } else if (groups[nr]) {
            groups[nr].push(p);
          } else {
            groups.player.push(p);
          }
        });
      });

      setSquadGroups(groups);
    } catch (err) {
      logger.error('Failed to fetch squad', err);
      setSquadError('Kon spelers niet laden. Controleer je verbinding.');
    } finally {
      setSquadLoading(false);
    }
  }, [selectedMatch, setSquadGroups, setSquadLoading, setSquadError]);

  // Load saved lineup from match metadata
  const loadSavedLineup = useCallback(() => {
    if (!selectedMatch) return;

    const metadata = selectedMatch.metadata;
    const saved = metadata?.lineup as { formation?: string; goalkeeper?: string[]; player?: string[] } | undefined;

    if (saved) {
      if (saved.formation) setLineupFormation(saved.formation);
      if (saved.goalkeeper || saved.player) {
        setLineupSlots({
          goalkeeper: saved.goalkeeper || [],
          player: saved.player || [],
        });
      }
    } else if (metadata?.formation) {
      setLineupFormation(metadata.formation as string);
    }
  }, [selectedMatch, setLineupFormation, setLineupSlots]);

  // Save lineup to match metadata
  const saveLineup = useCallback(async (): Promise<boolean> => {
    if (!selectedMatch) return false;

    try {
      const matchId = selectedMatch.slug || selectedMatch.id;
      const existingMetadata = selectedMatch.metadata || {};

      // Resolve formation UUID from cached formations
      const formations = await getFormations();
      const formationCode = lineupFormation || '4-3-3';
      const formationRecord = formations.find((f) => f.code === formationCode);

      await api.patch(`/activities/${encodeURIComponent(String(matchId))}/`, {
        metadata: {
          ...existingMetadata,
          formation: lineupSlots,
          lineup: {
            formation: formationCode,
            ...(formationRecord ? { formation_id: formationRecord.id } : {}),
            goalkeeper: lineupSlots.goalkeeper,
            player: lineupSlots.player,
          },
        },
      });
      return true;
    } catch (err) {
      logger.error('Failed to save lineup', err);
      return false;
    }
  }, [selectedMatch, lineupSlots, lineupFormation]);

  return {
    fetchSquad,
    loadSavedLineup,
    saveLineup,
  };
}
