import { useCallback } from 'react';
import type { Period, SeasonProject, SeasonOrganisation } from '../../types/season';
import type { SeasonSquadAddMemberPayload } from '../identity/seasonSquadAddMember.types';
import { api } from '@/api/client';
import { periodsApi, activitiesApi } from '@/api';
import { trashApi } from '@/api/trash';
import type { Period as ApiPeriod, Activity } from '../../types/api/activity';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import type { MatchRecord } from './SeasonMatchesTab';

// ─── Types ───────────────────────────────────────────────────────────────────

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

interface UseSeasonCrudActionsParams {
  apiBaseUrl: string;
  org: SeasonOrganisation | null;
  project: SeasonProject | null;
  season: Period | null;
  resolvedSeasonId: string | null;
  effectiveSeasonId: string | null;
  seasonsBasePath: string;
  navigate: (to: string) => void;
  // State setters
  setSeason: Setter<Period | null>;
  setCompetitions: Setter<Period[]>;
  setMatches: Setter<MatchRecord[]>;
  setMembers: Setter<Record<string, unknown>[]>;
  setMembersReloadToken: Setter<number>;
  setActivatingContext: Setter<boolean>;
  setActiveContextState: Setter<Record<string, unknown> | null>;
}

// ─── Hook: individual CRUD operations ────────────────────────────────────────

export function useSeasonCrudActions(params: UseSeasonCrudActionsParams) {
  const {
    apiBaseUrl, org, project, season, resolvedSeasonId, effectiveSeasonId,
    seasonsBasePath, navigate,
    setSeason, setCompetitions, setMatches, setMembers, setMembersReloadToken,
    setActivatingContext, setActiveContextState,
  } = params;

  const { pushToast } = useToast();
  const confirm = useConfirm();

  // ── Save period edits ──

  const savePeriodEdits = async (periodToEdit: Record<string, unknown>, patch: Record<string, unknown>) => {
    const periodId = String(periodToEdit?.id || '').trim();
    if (!periodId) throw new Error('Missing period id');

    const res = await periodsApi.update(periodId, patch as unknown as Partial<ApiPeriod>);
    const server = res && typeof res === 'object' ? res : null;
    const updated = server && typeof server === 'object' ? { ...periodToEdit, ...patch, ...server } : { ...periodToEdit, ...patch };
    if (String(updated?.id) === String(season?.id)) {
      setSeason((prev) => (prev ? { ...prev, ...updated } : updated) as Period);
    }
    setCompetitions((prev) => prev.map((p) => (String(p.id) === String(updated?.id) ? { ...p, ...updated } : p)));
  };

  // ── Save match edits ──

  const saveMatchEdits = async (matchToEdit: Record<string, unknown>, patch: Record<string, unknown>) => {
    const matchId = String(matchToEdit?.id || '').trim();
    if (!matchId) throw new Error('Missing match id');

    const updated = await activitiesApi.update(matchId, patch as unknown as Partial<Activity>) as unknown as Record<string, unknown> || { ...matchToEdit, ...patch };
    setMatches((prev) => prev.map((m) => (String(m.id) === String(updated?.id) ? { ...m, ...updated } as MatchRecord : m)));
  };

  // ── Delete season handler ──

  const handleDeleteSeason = useCallback(async () => {
    const seasonName = season?.name || '';
    const seasonId = String(resolvedSeasonId || effectiveSeasonId || '');
    const ok = await confirm({ title: 'Seizoen verwijderen', message: `"${seasonName}" wordt verplaatst naar de prullenbak.`, confirmLabel: 'Verwijderen', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(
        `/periods/${encodeURIComponent(seasonId)}/`,
      );
      pushToast({
        message: `"${seasonName}" verplaatst naar prullenbak`,
        type: 'info',
        actions: [{
          label: 'Ongedaan maken',
          onClick: async () => {
            try {
              const trashItem = await trashApi.findByObjectId(seasonId);
              if (trashItem) {
                await trashApi.restore(trashItem.id);
                pushToast({ message: `"${seasonName}" hersteld`, type: 'success' });
              }
            } catch (err) {
              logger.error('Failed to restore season', err);
              pushToast({ message: 'Herstellen mislukt', type: 'error' });
            }
          },
        }],
      });
      navigate(seasonsBasePath);
    } catch (e) {
      logger.error('Error deleting season', e);
      pushToast({ message: 'Verwijderen mislukt', type: 'error' });
    }
  }, [resolvedSeasonId, effectiveSeasonId, season?.name, seasonsBasePath, navigate, confirm]);

  // ── Activate context handler ──

  const handleActivateContext = useCallback(async () => {
    if (!org || !project || !season) return;
    setActivatingContext(true);
    try {
      await setActiveContext('season', String(season.id));
      const updated = await getActiveContext();
      setActiveContextState(updated);
    } catch (e) {
      logger.error('Failed to activate context', e);
    } finally {
      setActivatingContext(false);
    }
  }, [org, project, season]);

  // ── Add squad member handler ──

  const handleAddSquadMember = useCallback(async (payload: SeasonSquadAddMemberPayload) => {
    const teamIdValue = String(payload.project_id || '').trim();
    const seasonUuid = String(resolvedSeasonId || '').trim();
    const userIdValue = String(payload.user_id || '').trim();
    if (!teamIdValue || !seasonUuid || !userIdValue) return;

    try {
      const body: Record<string, unknown> = {
        user_id: Number(userIdValue),
        role: 'viewer',
        period_id: seasonUuid,
        metadata: {
          position: String(payload.position || '').trim(),
          shirt_number: String(payload.shirt_number || '').trim(),
        },
      };

      const createdMembership = await api.post<Record<string, unknown>>(`/projects/${encodeURIComponent(teamIdValue)}/members/`, body);

      // Optimistically reflect the new membership in the current squad list.
      try {
        const createdId = String(createdMembership?.id || '').trim();
        if (createdId) {
          setMembers((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            if (list.some((m) => String(m?.id || '').trim() === createdId)) return list;
            return [createdMembership, ...list];
          });
        }
      } catch {
        // ignore
      }

      setMembersReloadToken((x) => x + 1);
    } catch (err) {
      logger.error('Add member error', err);
    }
  }, [apiBaseUrl, resolvedSeasonId]);

  return {
    savePeriodEdits,
    saveMatchEdits,
    handleDeleteSeason,
    handleActivateContext,
    handleAddSquadMember,
  };
}
