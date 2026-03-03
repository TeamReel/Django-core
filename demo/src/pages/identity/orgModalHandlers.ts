/**
 * Factory for OrgModals create-entity handlers.
 *
 * Extracted from OrgModals to keep the parent component under 500 lines.
 * Each handler performs a POST, an optimistic state update, then a background
 * refresh of caches / counts.
 */

import type { OrgModalsProps } from './OrgModals';
import { invalidateFetchAllPagesCache } from '../../utils/fetchAllPages';

type HandlerDeps = Pick<
  OrgModalsProps,
  | 'org'
  | 'currentOrgSlug'
  | 'currentOrgId'
  | 'getApiV1BaseUrl'
  | 'getCsrfToken'
  | 'fetchClubsPage'
  | 'fetchTeamsForOrg'
  | 'fetchFederationCounts'
  | 'recomputePeriodCounts'
  | 'setClubs'
  | 'setClubsPage'
  | 'setClubsCount'
  | 'setAllClubsForTeams'
  | 'setTeams'
  | 'setTeamsCount'
  | 'setOrgPeriods'
  | 'setFederationMatches'
  | 'setMatchesCount'
>;

export function createOrgModalHandlers(deps: HandlerDeps) {
  const {
    org, currentOrgSlug, currentOrgId,
    getApiV1BaseUrl, getCsrfToken,
    fetchClubsPage, fetchTeamsForOrg, fetchFederationCounts,
    recomputePeriodCounts,
    setClubs, setClubsPage, setClubsCount, setAllClubsForTeams,
    setTeams, setTeamsCount,
    setOrgPeriods, setFederationMatches, setMatchesCount,
  } = deps;

  // ─── Create Club ───────────────────────────────────────────────

  const handleCreateClub = async (projectData: any) => {
    const apiV1BaseUrl = getApiV1BaseUrl();
    const res = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify({
        name: projectData.name,
        description: projectData.description || '',
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to create club');
    }

    const payload: any = await res.json().catch(() => null);
    const created: any = payload?.data?.data || payload?.data || payload;

    if (created && typeof created === 'object') {
      const createdKey = String(created?.slug || created?.id || '');
      if (createdKey) {
        setClubsPage(1);
        setClubs((prev) => {
          if (prev.some((p: any) => String(p?.slug || p?.id || '') === createdKey)) return prev;
          return [created, ...prev];
        });
        setClubsCount((prev) => (typeof prev === 'number' ? prev + 1 : prev));
        setAllClubsForTeams((prev) => {
          if (prev.some((p: any) => String(p?.slug || p?.id || '') === createdKey)) return prev;
          return [created, ...prev];
        });
      }
    }

    invalidateFetchAllPagesCache();
    void fetchClubsPage(1);
    void fetchTeamsForOrg({ force: true });
  };

  // ─── Create Team ───────────────────────────────────────────────

  const handleCreateTeam = async (projectData: any) => {
    const clubId = String(projectData.parent_project_id || '').trim();
    if (!clubId) throw new Error('Select a club first.');

    const apiV1BaseUrl = getApiV1BaseUrl();
    const res = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify({
        name: projectData.name,
        description: projectData.description || '',
        parent_project_id: clubId,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to create team');
    }

    const payload: any = await res.json().catch(() => null);
    const created: any = payload?.data?.data || payload?.data || payload;

    if (created && typeof created === 'object') {
      const createdKey = String(created?.slug || created?.id || '').trim();
      if (createdKey) {
        setTeams((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((p: any) => String(p?.slug || p?.id || '').trim() === createdKey)) return list;
          return [created, ...list];
        });
        setTeamsCount((prev) => (typeof prev === 'number' ? prev + 1 : prev));
      }
    }

    invalidateFetchAllPagesCache();
    void fetchTeamsForOrg({ force: true });
  };

  // ─── Create Season ─────────────────────────────────────────────

  const handleCreateSeason = async (payload: any) => {
    const apiV1BaseUrl = getApiV1BaseUrl();
    const orgId = String(payload.organisation_id || currentOrgId || org?.id || '').trim();
    const teamId = String(payload.project_id || '').trim();
    if (!orgId) throw new Error('Select a federation first');
    if (!teamId) throw new Error('Select a team first');

    const res = await fetch(`${apiV1BaseUrl}/periods/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken() || '',
      },
      credentials: 'include',
      body: JSON.stringify({
        organisation_id: orgId,
        project_id: teamId ? Number(teamId) : undefined,
        parent_period_id: null,
        name: payload.name,
        description: payload.description,
        start_date: payload.start_date,
        end_date: payload.end_date,
        metadata: { type: 'season' },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to create season');
    }

    const raw: any = await res.json().catch(() => null);
    const created: any = raw?.data?.data || raw?.data || raw;
    if (created && typeof created === 'object') {
      const createdId = String(created?.id || '').trim();
      if (createdId) {
        setOrgPeriods((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((p: any) => String(p?.id || '').trim() === createdId)) return list;
          const next = [created, ...list];
          recomputePeriodCounts(next);
          return next;
        });
      }
    }

    invalidateFetchAllPagesCache();
    void fetchFederationCounts(orgId);
  };

  // ─── Create Competition ────────────────────────────────────────

  const handleCreateCompetition = async (payload: any) => {
    const apiV1BaseUrl = getApiV1BaseUrl();
    const orgId = String(payload.organisation_id || currentOrgId || org?.id || '').trim();
    const teamId = String(payload.project_id || '').trim();
    const seasonId = String(payload.parent_period_id || '').trim();
    if (!orgId) throw new Error('Select a federation first');
    if (!teamId) throw new Error('Select a team first');
    if (!seasonId) throw new Error('Select a season first');

    const res = await fetch(`${apiV1BaseUrl}/periods/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken() || '',
      },
      credentials: 'include',
      body: JSON.stringify({
        organisation_id: orgId,
        project_id: teamId ? Number(teamId) : undefined,
        parent_period_id: seasonId || null,
        name: payload.name,
        description: payload.description,
        start_date: payload.start_date,
        end_date: payload.end_date,
        metadata: { type: 'competition' },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to create competition');
    }

    const raw: any = await res.json().catch(() => null);
    const created: any = raw?.data?.data || raw?.data || raw;
    if (created && typeof created === 'object') {
      const createdId = String(created?.id || '').trim();
      if (createdId) {
        setOrgPeriods((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((p: any) => String(p?.id || '').trim() === createdId)) return list;
          const next = [created, ...list];
          recomputePeriodCounts(next);
          return next;
        });
      }
    }

    invalidateFetchAllPagesCache();
    void fetchFederationCounts(orgId);
  };

  // ─── Create Match ──────────────────────────────────────────────

  const handleCreateMatch = async (payload: any) => {
    const apiV1BaseUrl = getApiV1BaseUrl();
    const csrfToken = getCsrfToken();
    const orgIdToRefresh = String(currentOrgId || org?.id || '').trim();
    const teamId = String(payload.project_id || '').trim();
    const competitionId = String(payload.period_id || '').trim();
    if (!teamId) throw new Error('Select a team first');
    if (!competitionId) throw new Error('Select a competition first');

    const res = await fetch(`${apiV1BaseUrl}/activities/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken || '',
      },
      credentials: 'include',
      body: JSON.stringify({
        title: payload.title,
        activity_type: 'match',
        project_id: teamId ? Number(teamId) : undefined,
        opponent_project_id: payload.opponent_project_id ? Number(payload.opponent_project_id) : undefined,
        period_id: competitionId,
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

    const raw: any = await res.json().catch(() => null);
    const created: any = raw?.data?.data || raw?.data || raw;
    if (created && typeof created === 'object') {
      const createdId = String(created?.id || '').trim();
      if (createdId) {
        setFederationMatches((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((m: any) => String(m?.id || '').trim() === createdId)) return list;
          return [created, ...list];
        });
        setMatchesCount((prev) => (typeof prev === 'number' ? prev + 1 : prev));
      }
    }

    invalidateFetchAllPagesCache();
    if (orgIdToRefresh) {
      void fetchFederationCounts(orgIdToRefresh);
    }
  };

  return {
    handleCreateClub,
    handleCreateTeam,
    handleCreateSeason,
    handleCreateCompetition,
    handleCreateMatch,
  };
}
