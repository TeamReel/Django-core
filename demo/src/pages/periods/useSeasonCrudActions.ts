import { useCallback } from 'react';
import type { Period } from '../../types/season';
import { getCsrfToken } from '../../types/season';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';

// ─── Types ───────────────────────────────────────────────────────────────────

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

interface UseSeasonCrudActionsParams {
  apiBaseUrl: string;
  org: any;
  project: any;
  season: Period | null;
  resolvedSeasonId: string | null;
  effectiveSeasonId: string | null;
  seasonsBasePath: string;
  navigate: (to: string) => void;
  // State setters
  setSeason: Setter<Period | null>;
  setCompetitions: Setter<Period[]>;
  setMatches: Setter<any[]>;
  setMembers: Setter<any[]>;
  setMembersReloadToken: Setter<number>;
  setActivatingContext: Setter<boolean>;
  setActiveContextState: Setter<any>;
}

// ─── Hook: individual CRUD operations ────────────────────────────────────────

export function useSeasonCrudActions(params: UseSeasonCrudActionsParams) {
  const {
    apiBaseUrl, org, project, season, resolvedSeasonId, effectiveSeasonId,
    seasonsBasePath, navigate,
    setSeason, setCompetitions, setMatches, setMembers, setMembersReloadToken,
    setActivatingContext, setActiveContextState,
  } = params;

  // ── Save period edits ──

  const savePeriodEdits = async (periodToEdit: any, patch: any) => {
    const periodId = String(periodToEdit?.id || '').trim();
    if (!periodId) throw new Error('Missing period id');

    const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(periodId)}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to save period');
    }

    const raw = await res.json().catch(() => null);
    const server = (raw as any)?.data || raw;
    const updated = server && typeof server === 'object' ? { ...periodToEdit, ...patch, ...(server as any) } : { ...periodToEdit, ...patch };
    if (String(updated?.id) === String(season?.id)) {
      setSeason((prev) => (prev ? ({ ...(prev as any), ...(updated as any) } as any) : (updated as any)));
    }
    setCompetitions((prev) => prev.map((p: any) => (String(p.id) === String(updated?.id) ? { ...p, ...updated } : p)));
  };

  // ── Save match edits ──

  const saveMatchEdits = async (matchToEdit: any, patch: any) => {
    const matchId = String(matchToEdit?.id || '').trim();
    if (!matchId) throw new Error('Missing match id');

    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(matchId)}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to save match');
    }

    const raw = await res.json().catch(() => null);
    const updated = (raw as any)?.data || raw || { ...matchToEdit, ...patch };
    setMatches((prev) => prev.map((m: any) => (String(m.id) === String(updated?.id) ? { ...m, ...updated } : m)));
  };

  // ── Delete season handler ──

  const handleDeleteSeason = useCallback(async () => {
    if (!window.confirm(`Are you sure you want to delete season ${season?.name}?`)) return;
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/periods/${encodeURIComponent(String(resolvedSeasonId || effectiveSeasonId || ''))}/`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          credentials: 'include',
        }
      );

      if (res.ok) {
        navigate(seasonsBasePath);
      } else {
        alert('Error deleting season');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting season');
    }
  }, [apiBaseUrl, resolvedSeasonId, effectiveSeasonId, season?.name, seasonsBasePath, navigate]);

  // ── Activate context handler ──

  const handleActivateContext = useCallback(async () => {
    if (!org || !project || !season) return;
    setActivatingContext(true);
    try {
      await setActiveContext('season', String(season.id));
      const updated = await getActiveContext();
      setActiveContextState(updated);
    } catch (e) {
      console.error('Failed to activate context:', e);
    } finally {
      setActivatingContext(false);
    }
  }, [org, project, season]);

  // ── Add squad member handler ──

  const handleAddSquadMember = useCallback(async (payload: any) => {
    const teamIdValue = String(payload.project_id || '').trim();
    const seasonUuid = String(resolvedSeasonId || '').trim();
    const userIdValue = String(payload.user_id || '').trim();
    if (!teamIdValue || !seasonUuid || !userIdValue) return;

    try {
      const body: any = {
        user_id: Number(userIdValue),
        role: 'viewer',
        period_id: seasonUuid,
        metadata: {
          position: String(payload.position || '').trim(),
          shirt_number: String(payload.shirt_number || '').trim(),
        },
      };

      const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(teamIdValue)}/members/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to add member');
      }

      // Optimistically reflect the new membership in the current squad list.
      try {
        const created: any = await res.json().catch(() => null);
        const createdMembership = created?.data ?? created;
        const createdId = String(createdMembership?.id || '').trim();
        if (createdId) {
          setMembers((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            if (list.some((m: any) => String(m?.id || '').trim() === createdId)) return list;
            return [createdMembership, ...list];
          });
        }
      } catch {
        // ignore
      }

      setMembersReloadToken((x) => x + 1);
    } catch (err) {
      console.error('Add member error:', err);
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
