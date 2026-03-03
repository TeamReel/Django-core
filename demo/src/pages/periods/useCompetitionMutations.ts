/**
 * Sub-hook: CRUD mutations for competition detail page.
 *
 * Extracted from useCompetitionDetailData to keep files under 500 lines.
 */
import type React from 'react';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import type { Period, SeasonProject as Project } from '../../types/season';
import { getCsrfToken } from '../../utils/csrf';

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
  setMatches: React.Dispatch<React.SetStateAction<any[]>>;
  setMembers: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedEditPeriod: React.Dispatch<React.SetStateAction<any | null>>;
  setActivatingContext: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveContextState: React.Dispatch<React.SetStateAction<any | null>>;
  setMembersLoading: React.Dispatch<React.SetStateAction<boolean>>;
  navigate: (to: string, options?: any) => void;
}

export function useCompetitionMutations(deps: CompetitionMutationsDeps) {
  const {
    apiBaseUrl, resolvedCompetitionId, competition, project,
    seasonsBasePath, seasonKeyOrId, projectSlugOrId, activatingContext,
    setCompetition, setMatches, setMembers, setSelectedEditPeriod,
    setActivatingContext, setActiveContextState, setMembersLoading,
    navigate,
  } = deps;

  const savePeriodEdits = async (periodToEdit: any, patch: any) => {
    const pid = String(periodToEdit?.id || periodToEdit?.period_id || periodToEdit?.uuid || periodToEdit?.data?.id || periodToEdit?.data?.data?.id || resolvedCompetitionId || '').trim();
    if (!pid) throw new Error('Missing period id');
    const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(pid)}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
      credentials: 'include', body: JSON.stringify(patch),
    });
    if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(d || 'Failed to save period'); }
    const raw = await res.json().catch(() => null);
    const updated = (raw as any)?.data || raw || { ...periodToEdit, ...patch };
    if (String(updated?.id) === String(competition?.id)) setCompetition((prev) => prev ? { ...(prev as any), ...(updated as any) } as any : updated as any);
    setSelectedEditPeriod((prev: any) => {
      const pId = String(prev?.id || prev?.data?.id || '').trim();
      const nId = String(updated?.id || updated?.data?.id || '').trim();
      return pId && nId && pId === nId ? updated : prev;
    });
  };

  const saveMatchEdits = async (matchToEdit: any, patch: any) => {
    const mid = String(matchToEdit?.id || '').trim();
    if (!mid) throw new Error('Missing match id');
    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(mid)}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
      credentials: 'include', body: JSON.stringify(patch),
    });
    if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(d || 'Failed to save match'); }
    const raw = await res.json().catch(() => null);
    const updated = (raw as any)?.data || raw || { ...matchToEdit, ...patch };
    setMatches((prev) => prev.map((m: any) => String(m.id) === String(updated?.id) ? { ...m, ...updated } : m));
  };

  const deleteMembership = async (membership: any) => {
    const mid = String(membership?.id || '').trim();
    const pid = String((project as any)?.id || '').trim();
    if (!mid || !pid) return;
    const u = membership.user || {};
    const name = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'this member';
    if (!window.confirm(`Remove ${name} from this team?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/members/${encodeURIComponent(mid)}/`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() }, credentials: 'include',
      });
      if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(d || 'Failed to remove member'); }
      setMembers((prev) => prev.filter((m: any) => String(m.id) !== mid));
    } catch (e) { console.error(e); alert(e instanceof Error ? e.message : 'Error removing member'); }
  };

  const saveMembershipRole = async (membership: any, role: string) => {
    const mid = String(membership?.id || '').trim();
    const pid = String((project as any)?.id || '').trim();
    if (!mid || !pid) throw new Error('Missing membership id');
    const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/members/${encodeURIComponent(mid)}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
      credentials: 'include', body: JSON.stringify({ role }),
    });
    if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(d || 'Failed to save member'); }
    setMembers((prev) => prev.map((m: any) => String(m.id) === mid ? { ...m, role } : m));
  };

  const updateFunctionalRoles = async (membership: any, nextRoles: string[]) => {
    const pid = String((project as any)?.id || '').trim();
    const uid = Number(membership?.user?.id);
    if (!pid) throw new Error('Missing project id');
    if (!uid) throw new Error('Missing user id');
    const prevDirect = (membership as any)?.functional_roles ?? (membership as any)?.functionalRoles;
    const prevRoles = Array.isArray(prevDirect) ? prevDirect.map((r: any) => String(r || '').trim()).filter(Boolean) : [];
    const normalized = (Array.isArray(nextRoles) ? nextRoles : []).map((r) => String(r || '').trim()).filter(Boolean);
    const prevSet = new Set(prevRoles);
    const nextSet = new Set(normalized);
    const toAdd = Array.from(nextSet).filter((r) => !prevSet.has(r));
    const toRemove = Array.from(prevSet).filter((r) => !nextSet.has(r));
    const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() };
    if (toAdd.length) {
      const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/functional-roles/assign/`, {
        method: 'POST', headers, credentials: 'include', body: JSON.stringify({ user_id: uid, roles: toAdd }),
      });
      if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(d || 'Failed to assign functional roles'); }
    }
    if (toRemove.length) {
      const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/functional-roles/unassign/`, {
        method: 'POST', headers, credentials: 'include', body: JSON.stringify({ user_id: uid, roles: toRemove }),
      });
      if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(d || 'Failed to unassign functional roles'); }
    }
  };

  const deleteCompetition = async () => {
    const cid = String(resolvedCompetitionId || (competition as any)?.id || '').trim();
    if (!cid) return;
    if (!window.confirm(`Are you sure you want to delete competition ${competition?.name}?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(cid)}/`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() }, credentials: 'include',
      });
      if (res.ok) navigate(`${seasonsBasePath}/${seasonKeyOrId}?tab=competitions`);
      else alert('Error deleting competition');
    } catch (e) { console.error(e); alert('Error deleting competition'); }
  };

  const createMatchInCompetition = async (payload: {
    title: string; start_time: string; end_time: string;
    opponent_project_id?: string; venue?: 'Home' | 'Away'; location?: string; description?: string; metadata?: any;
  }) => {
    const pid = String((project as any)?.id || '').trim();
    const cid = String(resolvedCompetitionId || (competition as any)?.id || '').trim();
    if (!pid) throw new Error('Missing team id');
    if (!cid) throw new Error('Missing competition id');
    const res = await fetch(`${apiBaseUrl}/api/v1/activities/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() }, credentials: 'include',
      body: JSON.stringify({
        title: payload.title, activity_type: 'match', project_id: Number(pid),
        opponent_project_id: payload.opponent_project_id ? Number(payload.opponent_project_id) : undefined,
        period_id: cid, start_time: payload.start_time, end_time: payload.end_time,
        location: payload.location, description: payload.description,
        metadata: { venue: payload.venue || 'Home', is_home: (payload.venue || 'Home') === 'Home', ...(payload as any)?.metadata },
      }),
    });
    if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(d || 'Failed to create match'); }
    const raw = await res.json().catch(() => null);
    const created = (raw as any)?.data || raw;
    if (created?.id) {
      setMatches((prev) => [...new Map([[String(created.id), created], ...prev.map((m: any) => [String(m.id), m] as [string, any])]).values()]);
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
    const url = `${apiBaseUrl}/api/v1/projects/${project?.id || projectSlugOrId}/members/?page_size=250`;
    fetchAllPages(url, { credentials: 'include' })
      .then((all: any[]) => setMembers(all))
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
