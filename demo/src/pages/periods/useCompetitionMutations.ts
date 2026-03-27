/**
 * Sub-hook: CRUD mutations for competition detail page.
 *
 * Extracted from useCompetitionDetailData to keep files under 500 lines.
 */
import type React from 'react';
import { api } from '@/api';
import { trashApi } from '@/api/trash';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { getApiV1BaseUrl } from '../../utils/apiFetch';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import type { Period, SeasonProject as Project } from '../../types/season';
import type { Activity } from '../../types/api/activity';
import { getCsrfToken } from '../../utils/csrf';

/** Period-like object passed to edit (may originate from different API shapes). */
export interface PeriodEditRef {
  id?: string | number;
  period_id?: string | number;
  uuid?: string;
  name?: string;
  data?: Record<string, unknown>;
}

/** Match / activity reference. */
export interface MatchRef {
  id?: string | number;
  [key: string]: unknown;
}

/** Project membership reference. */
export interface MemberRef {
  id?: string | number;
  user?: { id?: string | number; name?: string; first_name?: string; last_name?: string; email?: string };
  role?: string;
  functional_roles?: string[];
  functionalRoles?: string[];
}

/** Payload for creating a match in a competition. */
export interface CreateMatchPayload {
  title: string;
  start_time?: string;
  end_time?: string;
  opponent_project_id?: string;
  venue?: 'Home' | 'Away';
  location?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface CompetitionMutationsDeps {
  apiBaseUrl: string;
  resolvedCompetitionId: string;
  competition: Period | null;
  project: Project | null;
  seasonsBasePath: string;
  seasonKeyOrId: string;
  projectSlugOrId: string;
  activatingContext: boolean;
  setCompetition: React.Dispatch<React.SetStateAction<Period | null>>;
  setMatches: React.Dispatch<React.SetStateAction<Activity[]>>;
  setMembers: React.Dispatch<React.SetStateAction<MemberRef[]>>;
  setSelectedEditPeriod: React.Dispatch<React.SetStateAction<PeriodEditRef | null>>;
  setActivatingContext: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveContextState: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>;
  setMembersLoading: React.Dispatch<React.SetStateAction<boolean>>;
  navigate: (to: string, options?: { replace?: boolean; state?: unknown }) => void;
}

export function useCompetitionMutations(deps: CompetitionMutationsDeps) {
  const {
    apiBaseUrl, resolvedCompetitionId, competition, project,
    seasonsBasePath, seasonKeyOrId, projectSlugOrId, activatingContext,
    setCompetition, setMatches, setMembers, setSelectedEditPeriod,
    setActivatingContext, setActiveContextState, setMembersLoading,
    navigate,
  } = deps;

  const { pushToast } = useToast();
  const confirm = useConfirm();

  const apiV1 = getApiV1BaseUrl();

  const savePeriodEdits = async (periodToEdit: PeriodEditRef, patch: Record<string, unknown>) => {
    const pid = String(periodToEdit?.id || periodToEdit?.period_id || periodToEdit?.uuid || periodToEdit?.data?.id || (periodToEdit?.data?.data as Record<string, unknown> | undefined)?.id || resolvedCompetitionId || '').trim();
    if (!pid) throw new Error('Missing period id');
    const updated = await api.patch<Period>(`/periods/${encodeURIComponent(pid)}/`, patch) ?? { ...periodToEdit, ...patch };
    if (String(updated?.id) === String(competition?.id)) setCompetition((prev) => prev ? { ...prev, ...updated } : updated);
    setSelectedEditPeriod((prev: PeriodEditRef | null) => {
      const pId = String(prev?.id || prev?.data?.id || '').trim();
      const nId = String(updated?.id || (updated as unknown as PeriodEditRef)?.data?.id || '').trim();
      return pId && nId && pId === nId ? updated : prev;
    });
  };

  const saveMatchEdits = async (matchToEdit: MatchRef, patch: Record<string, unknown>) => {
    const mid = String(matchToEdit?.id || '').trim();
    if (!mid) throw new Error('Missing match id');
    const updated = await api.patch<Activity>(`/activities/${encodeURIComponent(mid)}/`, patch) ?? { ...matchToEdit, ...patch };
    setMatches((prev) => prev.map((m) => String(m.id) === String(updated?.id) ? { ...m, ...updated } : m));
  };

  const deleteMembership = async (membership: MemberRef) => {
    const mid = String(membership?.id || '').trim();
    const pid = String(project?.id || '').trim();
    if (!mid || !pid) return;
    const u = membership.user;
    const name = u?.name || `${u?.first_name || ''} ${u?.last_name || ''}`.trim() || u?.email || 'this member';
    const ok = await confirm({ title: 'Lid verwijderen', message: `${name} verwijderen uit dit team?`, confirmLabel: 'Verwijderen', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/projects/${encodeURIComponent(pid)}/members/${encodeURIComponent(mid)}/`);
      setMembers((prev) => prev.filter((m: MemberRef) => String(m.id) !== mid));
    } catch (e) { logger.error('Error removing member', e); pushToast({ message: e instanceof Error ? e.message : 'Lid verwijderen mislukt', type: 'error' }); }
  };

  const saveMembershipRole = async (membership: MemberRef, role: string) => {
    const mid = String(membership?.id || '').trim();
    const pid = String(project?.id || '').trim();
    if (!mid || !pid) throw new Error('Missing membership id');
    await api.patch(`/projects/${encodeURIComponent(pid)}/members/${encodeURIComponent(mid)}/`, { role });
    setMembers((prev) => prev.map((m: MemberRef) => String(m.id) === mid ? { ...m, role } : m));
  };

  const updateFunctionalRoles = async (membership: MemberRef, nextRoles: string[]) => {
    const pid = String(project?.id || '').trim();
    const uid = Number(membership?.user?.id);
    if (!pid) throw new Error('Missing project id');
    if (!uid) throw new Error('Missing user id');
    const prevDirect = membership?.functional_roles ?? membership?.functionalRoles;
    const prevRoles = Array.isArray(prevDirect) ? prevDirect.map((r: string) => String(r || '').trim()).filter(Boolean) : [];
    const normalized = (Array.isArray(nextRoles) ? nextRoles : []).map((r) => String(r || '').trim()).filter(Boolean);
    const prevSet = new Set(prevRoles);
    const nextSet = new Set(normalized);
    const toAdd = Array.from(nextSet).filter((r) => !prevSet.has(r));
    const toRemove = Array.from(prevSet).filter((r) => !nextSet.has(r));
    if (toAdd.length) {
      await api.post(`/projects/${encodeURIComponent(pid)}/functional-roles/assign/`, { user_id: uid, roles: toAdd });
    }
    if (toRemove.length) {
      await api.post(`/projects/${encodeURIComponent(pid)}/functional-roles/unassign/`, { user_id: uid, roles: toRemove });
    }
  };

  const deleteCompetition = async () => {
    const cid = String(resolvedCompetitionId || competition?.id || '').trim();
    if (!cid) return;
    const compName = competition?.name || '';
    const ok = await confirm({ title: 'Competitie verwijderen', message: `"${compName}" wordt verplaatst naar de prullenbak.`, confirmLabel: 'Verwijderen', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/periods/${encodeURIComponent(cid)}/`);
      pushToast({
        message: `"${compName}" verplaatst naar prullenbak`,
        type: 'info',
        actions: [{
          label: 'Ongedaan maken',
          onClick: async () => {
            try {
              const trashItem = await trashApi.findByObjectId(cid);
              if (trashItem) {
                await trashApi.restore(trashItem.id);
                pushToast({ message: `"${compName}" hersteld`, type: 'success' });
              }
            } catch (err) {
              logger.error('Failed to restore competition', err);
              pushToast({ message: 'Herstellen mislukt', type: 'error' });
            }
          },
        }],
      });
      navigate(`${seasonsBasePath}/${seasonKeyOrId}?tab=competitions`);
    } catch (e) { logger.error('Error deleting competition', e); pushToast({ message: 'Verwijderen mislukt', type: 'error' }); }
  };

  const createMatchInCompetition = async (payload: CreateMatchPayload) => {
    const pid = String(project?.id || '').trim();
    const cid = String(resolvedCompetitionId || competition?.id || '').trim();
    if (!pid) throw new Error('Missing team id');
    if (!cid) throw new Error('Missing competition id');
    const created = await api.post<Activity>('/activities/', {
      title: payload.title, activity_type: 'match', project_id: Number(pid),
      opponent_project_id: payload.opponent_project_id ? Number(payload.opponent_project_id) : undefined,
      period_id: cid, start_time: payload.start_time, end_time: payload.end_time,
      location: payload.location, description: payload.description,
      metadata: { venue: payload.venue || 'Home', is_home: (payload.venue || 'Home') === 'Home', ...payload?.metadata },
    });
    if (created?.id) {
      setMatches((prev) => [...new Map([[String(created.id), created], ...prev.map((m) => [String(m.id), m] as [string, Activity])]).values()]);
    }
  };

  const activateCompetitionContext = async () => {
    if (!competition || activatingContext) return;
    try {
      setActivatingContext(true);
      await setActiveContext('competition', String(competition.id));
      const c = await getActiveContext();
      setActiveContextState(c);
    } finally {
      setActivatingContext(false);
    }
  };

  const refreshMembers = () => {
    setMembersLoading(true);
    const url = `${apiV1}/projects/${project?.id || projectSlugOrId}/members/?page_size=250`;
    fetchAllPages<MemberRef>(url, { credentials: 'include' })
      .then((all) => setMembers(all))
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  };

  return {
    savePeriodEdits,
    saveMatchEdits,
    deleteMembership,
    saveMembershipRole,
    updateFunctionalRoles,
    deleteCompetition,
    createMatchInCompetition,
    activateCompetitionContext,
    refreshMembers,
    getCsrfToken,
  };
}
