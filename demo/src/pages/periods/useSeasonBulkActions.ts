import { useCallback } from 'react';
import type { Period } from '../../types/season';
import { getCsrfToken } from '../../utils/csrf';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { sleep, fetchWithThrottleRetry } from './seasonDetailUtils';

// ─── Types ───────────────────────────────────────────────────────────────────

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

interface UseSeasonBulkActionsParams {
  apiBaseUrl: string;
  org: any;
  project: any;
  season: Period | null;
  resolvedSeasonId: string | null;
  activeTab: string;
  // State setters
  setCompetitions: Setter<Period[]>;
  setCompetitionsLoading: Setter<boolean>;
  setMatches: Setter<any[]>;
  setMatchesLoading: Setter<boolean>;
  setMembersReloadToken: Setter<number>;
  setTeamRosterReloadToken: Setter<number>;
  setBulkSubmitting: Setter<boolean>;
  // From derived
  getBestRoleForUser: (userId: string) => 'viewer' | 'editor' | 'admin';
}

// ─── Hook: bulk & creation operations ────────────────────────────────────────

export function useSeasonBulkActions(params: UseSeasonBulkActionsParams) {
  const {
    apiBaseUrl, org, project, season, resolvedSeasonId, activeTab,
    setCompetitions, setCompetitionsLoading, setMatches, setMatchesLoading,
    setMembersReloadToken, setTeamRosterReloadToken, setBulkSubmitting,
    getBestRoleForUser,
  } = params;

  // ── Assign users to season squad ──

  const assignUsersToSeasonSquad = async (userIds: string[]) => {
    const projectIdForMembers = String((project as any)?.id || '').trim();
    const seasonUuid = String(resolvedSeasonId || '').trim();
    if (!projectIdForMembers || !seasonUuid) return;

    const ids = (userIds || []).map((x) => String(x || '').trim()).filter(Boolean);
    if (ids.length === 0) return;

    try {
      setBulkSubmitting(true);

      // Prefer bulk endpoint to avoid per-user write throttling.
      if (ids.length > 1) {
        const res = await fetchWithThrottleRetry(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/bulk/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify({
              members: ids.map((uid) => ({
                user_id: Number(uid),
                role: getBestRoleForUser(uid),
                period_id: String(seasonUuid),
              })),
            }),
          }
        );

        if (res.status === 404) {
          // Older backend: fall back to sequential single-member POSTs.
        } else if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || 'Failed to assign users');
        } else {
          setMembersReloadToken((x) => x + 1);
          setTeamRosterReloadToken((x) => x + 1);
          return;
        }
      }

      for (const uid of ids) {
        // Pace requests to avoid hitting server throttles when selecting many users.
        await sleep(250);
        const role = getBestRoleForUser(uid);
        const res = await fetchWithThrottleRetry(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify({
              user_id: Number(uid),
              role,
              period_id: String(seasonUuid),
            }),
          }
        );
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          // ignore duplicates
          if (!/already|exists|duplicate/i.test(text)) {
            throw new Error(text || 'Failed to assign user');
          }
        }
      }

      setMembersReloadToken((x) => x + 1);
      setTeamRosterReloadToken((x) => x + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to assign users');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // ── Unassign memberships from season squad ──

  const unassignMembershipsFromSeasonSquad = async (membershipIds: string[]) => {
    const projectIdForMembers = String((project as any)?.id || '').trim();
    if (!projectIdForMembers) return;

    const ids = (membershipIds || []).map((x) => String(x || '').trim()).filter(Boolean);
    if (ids.length === 0) return;

    try {
      setBulkSubmitting(true);

      // Prefer bulk endpoint to avoid per-row throttling.
      if (ids.length > 1) {
        const res = await fetchWithThrottleRetry(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/bulk-delete/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify({ membership_ids: ids }),
          }
        );

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || 'Failed to unassign users');
        }

        setMembersReloadToken((x) => x + 1);
        setTeamRosterReloadToken((x) => x + 1);
        return;
      }

      for (const membershipId of ids) {
        // Pace requests to avoid hitting server throttles when unassigning many users.
        await sleep(200);
        const res = await fetchWithThrottleRetry(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/${encodeURIComponent(membershipId)}/`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
          }
        );
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || 'Failed to unassign user');
        }
      }

      setMembersReloadToken((x) => x + 1);
      setTeamRosterReloadToken((x) => x + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to unassign users');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // ── Create competition handler ──

  const handleCreateCompetition = useCallback(async (payload: any) => {
    const orgIdValue = String(payload.organisation_id || org?.id || '').trim();
    const teamIdValue = String(payload.project_id || (project as any)?.id || '').trim();
    const seasonIdValue = String(payload.parent_period_id || resolvedSeasonId || season?.id || '').trim();
    if (!orgIdValue) throw new Error('Select a federation first');
    if (!teamIdValue) throw new Error('Select a team first');
    if (!seasonIdValue) throw new Error('Select a season first');

    const res = await fetch(`${apiBaseUrl}/api/v1/periods/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify({
        organisation_id: orgIdValue,
        project_id: teamIdValue ? Number(teamIdValue) : undefined,
        parent_period_id: seasonIdValue,
        name: payload.name,
        description: payload.description,
        start_date: payload.start_date,
        end_date: payload.end_date,
        sport_id: payload.sport_id || undefined,
        metadata: { type: 'competition' },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to create competition');
    }

    // Update UI immediately; refresh list in background.
    const raw: any = await res.json().catch(() => null);
    const created: any = raw?.data?.data || raw?.data || raw;
    if (created && typeof created === 'object') {
      const createdId = String(created?.id || '').trim();
      if (createdId) {
        setCompetitions((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((p: any) => String((p as any)?.id || '').trim() === createdId)) return list;
          return [created as any, ...list];
        });
      }
    }

    // Reload competitions list (matches will be fetched on-demand).
    if (resolvedSeasonId) {
      void (async () => {
        setCompetitionsLoading(true);
        try {
          const competitionsUrl = `${apiBaseUrl}/api/v1/periods/?parent_id=${encodeURIComponent(resolvedSeasonId)}&page_size=500`;
          const competitionResults = await fetchAllPages<Period>(
            competitionsUrl,
            { credentials: 'include' },
            { ttlMs: 10_000, cacheKey: `periods:children:${resolvedSeasonId}` }
          );
          setCompetitions(competitionResults);
        } finally {
          setCompetitionsLoading(false);
        }
      })();
    }
  }, [apiBaseUrl, org, project, resolvedSeasonId, season]);

  // ── Create match handler ──

  const handleCreateMatch = useCallback(async (payload: any) => {
    const teamIdValue = String(payload.project_id || (project as any)?.id || '').trim();
    const competitionIdValue = String(payload.period_id || '').trim();
    if (!teamIdValue) throw new Error('Select a team first');
    if (!competitionIdValue) throw new Error('Select a competition first');

    const res = await fetch(`${apiBaseUrl}/api/v1/activities/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify({
        title: payload.title,
        activity_type: 'match',
        project_id: teamIdValue ? Number(teamIdValue) : undefined,
        opponent_project_id: payload.opponent_project_id ? Number(payload.opponent_project_id) : undefined,
        period_id: competitionIdValue,
        start_time: payload.start_time,
        end_time: payload.end_time,
        location: payload.location,
        description: payload.description,
        metadata: {
          venue: payload.venue || 'Home',
          is_home: (payload.venue || 'Home') === 'Home',
          ...(payload as any)?.metadata,
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to create match');
    }

    // Update UI immediately; refresh matches in background if currently visible.
    const raw: any = await res.json().catch(() => null);
    const created: any = raw?.data?.data || raw?.data || raw;
    if (created && typeof created === 'object') {
      const createdId = String(created?.id || '').trim();
      if (createdId) {
        setMatches((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((m: any) => String(m?.id || '').trim() === createdId)) return list;
          return [created, ...list];
        });
      }
    }

    // Refresh matches if currently visible.
    if (activeTab === 'hierarchy' || activeTab === 'matches' || activeTab === 'competitions') {
      void (async () => {
        setMatchesLoading(true);
        try {
          const projectNumericId = String((project as any)?.id || '').trim();
          const seasonUuid = String(resolvedSeasonId || '').trim();
          if (projectNumericId && seasonUuid) {
            const url = `${apiBaseUrl}/api/v1/activities/?project_id=${encodeURIComponent(
              projectNumericId
            )}&period_id=${encodeURIComponent(
              seasonUuid
            )}&include_descendants=true&activity_type=match&ordering=-start_time&page_size=250`;
            const seasonMatches = await fetchAllPages<any>(
              url,
              { credentials: 'include' },
              { ttlMs: 10_000, cacheKey: `matches:season:${projectNumericId}:${seasonUuid}`, maxItems: 250 }
            );
            setMatches(seasonMatches);
          }
        } finally {
          setMatchesLoading(false);
        }
      })();
    }
  }, [activeTab, apiBaseUrl, project, resolvedSeasonId]);

  return {
    assignUsersToSeasonSquad,
    unassignMembershipsFromSeasonSquad,
    handleCreateCompetition,
    handleCreateMatch,
  };
}
