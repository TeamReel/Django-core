/**
 * Factory for OrgModals create-entity handlers.
 *
 * Extracted from OrgModals to keep the parent component under 500 lines.
 * Each handler performs a POST, an optimistic state update, then a background
 * refresh of caches / counts.
 */

import type { OrgModalsProps } from './OrgModals';
import { invalidateFetchAllPagesCache } from '../../utils/fetchAllPages';
import { api } from '@/api';
import type { Period } from './clubOrgDetailHelpers';
import type { Project } from '../../types';

/** Payload for project creation (club or team). */
interface CreateProjectPayload {
  name: string;
  description?: string;
  parent_project_id?: string;
  organisation_id?: string;
}

/** Payload for period creation (season or competition). */
interface CreatePeriodPayload {
  organisation_id?: string;
  project_id?: string;
  parent_period_id?: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
}

/** Payload for match creation. */
interface CreateMatchPayload {
  title: string;
  project_id?: string;
  opponent_project_id?: string;
  period_id?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;
  venue?: string;
  metadata?: Record<string, unknown>;
}

/** Activity record returned by the API. */
interface ActivityRecord {
  id: string;
  title?: string;
  activity_type?: string;
  slug?: string;
  [key: string]: unknown;
}

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
    fetchClubsPage, fetchTeamsForOrg, fetchFederationCounts,
    recomputePeriodCounts,
    setClubs, setClubsPage, setClubsCount, setAllClubsForTeams,
    setTeams, setTeamsCount,
    setOrgPeriods, setFederationMatches, setMatchesCount,
  } = deps;

  // ─── Create Club ───────────────────────────────────────────────

  const handleCreateClub = async (projectData: CreateProjectPayload) => {
    const created = await api.post<Project>(`/organisations/${currentOrgSlug}/projects/`, {
      name: projectData.name,
      description: projectData.description || '',
    });

    if (created && typeof created === 'object') {
      const createdKey = String(created?.slug || created?.id || '');
      if (createdKey) {
        setClubsPage(1);
        setClubs((prev) => {
          if (prev.some((p) => String(p?.slug || p?.id || '') === createdKey)) return prev;
          return [created, ...prev];
        });
        setClubsCount((prev) => (typeof prev === 'number' ? prev + 1 : prev));
        setAllClubsForTeams((prev) => {
          if (prev.some((p) => String(p?.slug || p?.id || '') === createdKey)) return prev;
          return [created, ...prev];
        });
      }
    }

    invalidateFetchAllPagesCache();
    void fetchClubsPage(1);
    void fetchTeamsForOrg({ force: true });
  };

  // ─── Create Team ───────────────────────────────────────────────

  const handleCreateTeam = async (projectData: CreateProjectPayload) => {
    const clubId = String(projectData.parent_project_id || '').trim();
    if (!clubId) throw new Error('Select a club first.');

    const created = await api.post<Project>(`/organisations/${currentOrgSlug}/projects/`, {
      name: projectData.name,
      description: projectData.description || '',
      parent_project_id: clubId,
    });

    if (created && typeof created === 'object') {
      const createdKey = String(created?.slug || created?.id || '').trim();
      if (createdKey) {
        setTeams((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((p) => String(p?.slug || p?.id || '').trim() === createdKey)) return list;
          return [created, ...list];
        });
        setTeamsCount((prev) => (typeof prev === 'number' ? prev + 1 : prev));
      }
    }

    invalidateFetchAllPagesCache();
    void fetchTeamsForOrg({ force: true });
  };

  // ─── Create Season ─────────────────────────────────────────────

  const handleCreateSeason = async (payload: CreatePeriodPayload) => {
    const orgId = String(payload.organisation_id || currentOrgId || org?.id || '').trim();
    const teamId = String(payload.project_id || '').trim();
    if (!orgId) throw new Error('Select a federation first');
    if (!teamId) throw new Error('Select a team first');

    const created = await api.post<Period>('/periods/', {
      organisation_id: orgId,
      project_id: teamId ? Number(teamId) : undefined,
      parent_period_id: null,
      name: payload.name,
      description: payload.description,
      start_date: payload.start_date,
      end_date: payload.end_date,
      metadata: { type: 'season' },
    });
    if (created && typeof created === 'object') {
      const createdId = String(created?.id || '').trim();
      if (createdId) {
        setOrgPeriods((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((p) => String(p?.id || '').trim() === createdId)) return list;
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

  const handleCreateCompetition = async (payload: CreatePeriodPayload) => {
    const orgId = String(payload.organisation_id || currentOrgId || org?.id || '').trim();
    const teamId = String(payload.project_id || '').trim();
    const seasonId = String(payload.parent_period_id || '').trim();
    if (!orgId) throw new Error('Select a federation first');
    if (!teamId) throw new Error('Select a team first');
    if (!seasonId) throw new Error('Select a season first');

    const created = await api.post<Period>('/periods/', {
      organisation_id: orgId,
      project_id: teamId ? Number(teamId) : undefined,
      parent_period_id: seasonId || null,
      name: payload.name,
      description: payload.description,
      start_date: payload.start_date,
      end_date: payload.end_date,
      metadata: { type: 'competition' },
    });
    if (created && typeof created === 'object') {
      const createdId = String(created?.id || '').trim();
      if (createdId) {
        setOrgPeriods((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((p) => String(p?.id || '').trim() === createdId)) return list;
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

  const handleCreateMatch = async (payload: CreateMatchPayload) => {
    const orgIdToRefresh = String(currentOrgId || org?.id || '').trim();
    const teamId = String(payload.project_id || '').trim();
    const competitionId = String(payload.period_id || '').trim();
    if (!teamId) throw new Error('Select a team first');
    if (!competitionId) throw new Error('Select a competition first');

    const created = await api.post<ActivityRecord>('/activities/', {
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
        ...payload?.metadata,
      },
    });
    if (created && typeof created === 'object') {
      const createdId = String(created?.id || '').trim();
      if (createdId) {
        setFederationMatches((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((m: Record<string, unknown>) => String(m?.id || '').trim() === createdId)) return list;
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
