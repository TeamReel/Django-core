/**
 * useCompetitionsData/handlers.ts
 * CRUD operations for competitions.
 */

import { useCallback } from 'react';
import { api, trashApi } from '@/api';
import { invalidateFetchAllPagesCache } from '../../utils/fetchAllPages';
import type { Period } from '../../utils/directoryHelpers';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';

interface UseCompetitionHandlersParams {
  selectedOrgId: string;
  selectedTeamId: string;
  selectedSeasonIds: string[];
  triggerRefresh: () => void;
  setCompetitions: React.Dispatch<React.SetStateAction<Period[]>>;
}

export function useCompetitionHandlers({
  selectedOrgId,
  selectedTeamId,
  selectedSeasonIds,
  triggerRefresh,
  setCompetitions,
}: UseCompetitionHandlersParams) {
  const { pushToast } = useToast();

  const savePeriodEdits = useCallback(async (periodId: string, payload: Record<string, unknown>) => {
    await api.patch(`/periods/${periodId}/`, payload);
  }, []);

  const createCompetition = useCallback(async (payload: {
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    organisation_id?: string;
    project_id?: string;
    parent_period_id?: string;
  }) => {
    const orgId = String(payload.organisation_id || selectedOrgId || '');
    const teamId = String(payload.project_id || selectedTeamId || '');
    const seasonId = String(payload.parent_period_id || selectedSeasonIds[0] || '');
    if (!orgId) throw new Error('Select a federation first');
    if (!teamId) throw new Error('Select a team first');
    if (!seasonId) throw new Error('Select a season first');

    await api.post('/periods/', {
      organisation_id: orgId,
      project_id: teamId ? Number(teamId) : undefined,
      parent_period_id: seasonId || null,
      name: payload.name,
      description: payload.description,
      start_date: payload.start_date,
      end_date: payload.end_date,
      metadata: { type: 'competition' },
    });

    invalidateFetchAllPagesCache();
    triggerRefresh();
  }, [selectedOrgId, selectedTeamId, selectedSeasonIds, triggerRefresh]);

  const handleDeleteCompetition = useCallback(async (orgId: string, compId: string, compName: string) => {
    if (!compId || !window.confirm(`Weet je zeker dat je competitie "${compName}" wilt verwijderen?`)) {
      return;
    }
    try {
      // Optimistic update
      let deletedCompetition: Period | undefined;
      setCompetitions((prev) => {
        deletedCompetition = prev.find((c) => c.id === compId);
        return prev.filter((c) => c.id !== compId);
      });

      await api.delete(`/periods/${compId}/`);

      // Show toast with undo action
      pushToast({
        message: `"${compName}" verplaatst naar prullenbak`,
        type: 'info',
        actions: [{
          label: 'Ongedaan maken',
          onClick: async () => {
            try {
              const trashItem = await trashApi.findByObjectId(compId);
              if (trashItem) {
                await trashApi.restore(trashItem.id);
                // Restore to list
                if (deletedCompetition) {
                  setCompetitions((prev) => [...prev, deletedCompetition!]);
                }
                pushToast({ message: `"${compName}" hersteld`, type: 'success' });
              }
            } catch (err) {
              logger.error('Failed to restore competition', err);
              pushToast({ message: 'Herstellen mislukt', type: 'error' });
            }
          },
        }],
      });
    } catch (err) {
      logger.error('Failed to delete competition', err);
      pushToast({ message: 'Verwijderen mislukt', type: 'error' });
      // Revert optimistic update by refreshing
      triggerRefresh();
    }
  }, [setCompetitions, pushToast, triggerRefresh]);

  return {
    savePeriodEdits,
    createCompetition,
    handleDeleteCompetition,
  };
}
