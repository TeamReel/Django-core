import { useEffect, useMemo, useReducer, type Dispatch, type SetStateAction } from 'react';
import { api } from '@/api/client';
import { getActiveContext } from '../../utils/activeContext';
import { logger } from '@/utils/logger';
import { formReducer, makeSetter } from '../../utils/formReducer';

/** Minimal project shape for the hook params. */
interface ProjectParam { id?: string; name?: string; slug?: string }
/** Minimal organisation shape for the hook params. */
interface OrgParam { id?: string; slug?: string; name?: string }
import type { MatchRecord } from './SeasonMatchesTab';
/** Minimal membership record shape. */
interface MemberRecord {
  id?: string;
  user?: { id?: string; name?: string; first_name?: string; last_name?: string; email?: string; [key: string]: unknown };
  user_id?: string;
  role?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}
/** Minimal branding profile shape. */
interface BrandingProfileRecord {
  id?: string;
  name?: string;
  [key: string]: unknown;
}
/** Minimal project record from the API. */
interface ProjectRecord {
  id?: string;
  name?: string;
  slug?: string;
  [key: string]: unknown;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseSeasonDataFetchingParams {
  apiBaseUrl: string;
  project: ProjectParam | null;
  resolvedSeasonId: string | null;
  org: OrgParam | null;
  orgSlugOrId: string;
  activeTab: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseSeasonDataFetchingReturn {
  // State
  activatingContext: boolean;
  setActivatingContext: Dispatch<SetStateAction<boolean>>;
  activeContext: Record<string, unknown> | null;
  setActiveContextState: Dispatch<SetStateAction<Record<string, unknown> | null>>;
  matches: MatchRecord[];
  setMatches: Dispatch<SetStateAction<MatchRecord[]>>;
  matchesLoading: boolean;
  setMatchesLoading: Dispatch<SetStateAction<boolean>>;
  members: MemberRecord[];
  setMembers: Dispatch<SetStateAction<MemberRecord[]>>;
  membersLoading: boolean;
  membersError: string | null;
  setMembersReloadToken: Dispatch<SetStateAction<number>>;
  teamRoster: MemberRecord[];
  teamRosterLoading: boolean;
  teamRosterError: string | null;
  setTeamRosterReloadToken: Dispatch<SetStateAction<number>>;
  bulkSubmitting: boolean;
  setBulkSubmitting: Dispatch<SetStateAction<boolean>>;
  opponentClubNames: Record<string, string>;
  brandProfileId: string | null;
}

export function useSeasonDataFetching(params: UseSeasonDataFetchingParams): UseSeasonDataFetchingReturn {
  const { apiBaseUrl, project, resolvedSeasonId, org, orgSlugOrId, activeTab } = params;

  // ── Data state ──
  interface SeasonFetchState {
    activatingContext: boolean;
    activeContext: Record<string, unknown> | null;
    matches: MatchRecord[];
    matchesLoading: boolean;
    members: MemberRecord[];
    membersLoading: boolean;
    membersError: string | null;
    membersReloadToken: number;
    teamRoster: MemberRecord[];
    teamRosterLoading: boolean;
    teamRosterError: string | null;
    teamRosterReloadToken: number;
    bulkSubmitting: boolean;
    opponentClubNames: Record<string, string>;
    brandProfileId: string | null;
  }

  const [s, dispatch] = useReducer(formReducer<SeasonFetchState>, {
    activatingContext: false,
    activeContext: null,
    matches: [],
    matchesLoading: false,
    members: [],
    membersLoading: false,
    membersError: null,
    membersReloadToken: 0,
    teamRoster: [],
    teamRosterLoading: false,
    teamRosterError: null,
    teamRosterReloadToken: 0,
    bulkSubmitting: false,
    opponentClubNames: {},
    brandProfileId: null,
  });

  const setActivatingContext     = useMemo(() => makeSetter(dispatch, 'activatingContext'), [dispatch]);
  const setActiveContextState    = useMemo(() => makeSetter(dispatch, 'activeContext'), [dispatch]);
  const setMatches               = useMemo(() => makeSetter(dispatch, 'matches'), [dispatch]);
  const setMatchesLoading        = useMemo(() => makeSetter(dispatch, 'matchesLoading'), [dispatch]);
  const setMembers               = useMemo(() => makeSetter(dispatch, 'members'), [dispatch]);
  const setMembersLoading        = useMemo(() => makeSetter(dispatch, 'membersLoading'), [dispatch]);
  const setMembersError          = useMemo(() => makeSetter(dispatch, 'membersError'), [dispatch]);
  const setMembersReloadToken    = useMemo(() => makeSetter(dispatch, 'membersReloadToken'), [dispatch]);
  const setTeamRoster            = useMemo(() => makeSetter(dispatch, 'teamRoster'), [dispatch]);
  const setTeamRosterLoading     = useMemo(() => makeSetter(dispatch, 'teamRosterLoading'), [dispatch]);
  const setTeamRosterError       = useMemo(() => makeSetter(dispatch, 'teamRosterError'), [dispatch]);
  const setTeamRosterReloadToken = useMemo(() => makeSetter(dispatch, 'teamRosterReloadToken'), [dispatch]);
  const setBulkSubmitting        = useMemo(() => makeSetter(dispatch, 'bulkSubmitting'), [dispatch]);
  const setOpponentClubNames     = useMemo(() => makeSetter(dispatch, 'opponentClubNames'), [dispatch]);
  const setBrandProfileId        = useMemo(() => makeSetter(dispatch, 'brandProfileId'), [dispatch]);

  // ── Load active context on mount ──
  useEffect(() => {
    let cancelled = false;
    const loadActiveContext = async () => {
      try {
        const context = await getActiveContext();
        if (!cancelled) setActiveContextState(context);
      } catch (e) {
        logger.error('Failed to load active context', e);
      }
    };
    void loadActiveContext();
    return () => { cancelled = true; };
  }, []);

  // ── Load brand profile ID for Kits tab ──
  useEffect(() => {
    if (!project?.id) return;
    let cancelled = false;

    const loadBrandProfile = async () => {
      try {
        const { results } = await api.list<BrandingProfileRecord>('/branding/profiles/', {
          params: { project: String(project.id) },
        });
        if (results.length > 0 && !cancelled) {
          setBrandProfileId(results[0]?.id || null);
        }
      } catch { /* ignore */ }
    };

    void loadBrandProfile();
    return () => { cancelled = true; };
  }, [apiBaseUrl, project?.id]);

  // ── Fetch season squad memberships (season-scoped roster) ──
  useEffect(() => {
    const projectIdForMembers = String(project?.id || '').trim();
    const seasonUuid = String(resolvedSeasonId || '').trim();

    if (!projectIdForMembers || !seasonUuid) return;

    let cancelled = false;
    const run = async () => {
      setMembersLoading(true);
      setMembersError(null);
      try {
        const membersList = await api.listAll<MemberRecord>(
          `/projects/${encodeURIComponent(projectIdForMembers)}/members/`,
          {
            params: { period: seasonUuid },
            pageSize: 200, maxItems: 5000,
          },
        );

        if (!cancelled) setMembers(Array.isArray(membersList) ? membersList : []);
      } catch (e) {
        logger.error('Failed to load squad', e);
        const msg = e instanceof Error ? e.message : 'Failed to load squad';
        if (!cancelled) setMembersError(msg);
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, project, resolvedSeasonId, s.membersReloadToken]);

  // ── Fetch full team roster ──
  // Only fetch org members on the selectie tab (orgs can have thousands of members).
  useEffect(() => {
    if (activeTab !== 'selectie' && activeTab !== 'overview') return;
    const projectIdForMembers = String(project?.id || '').trim();
    if (!projectIdForMembers) return;

    let cancelled = false;
    const run = async () => {
      setTeamRosterLoading(true);
      setTeamRosterError(null);
      try {
        // Fetch team-level memberships (project memberships without period filter)
        const roster = await api.listAll<MemberRecord>(
          `/projects/${encodeURIComponent(projectIdForMembers)}/members/`,
          { pageSize: 500, maxItems: 5000 },
        );

        // Only merge org members on the squad tab — the team tab should only show
        // actual team members. Org-wide members are only relevant when assigning
        // new people to a season squad.
        const byUserId = new Map<string, MemberRecord>();
        for (const m of Array.isArray(roster) ? roster : []) {
          const uid = String(m?.user?.id || m?.user_id || '').trim();
          if (uid && !byUserId.has(uid)) byUserId.set(uid, m);
        }

        if (activeTab === 'selectie') {
          const orgSlugForMembers = String(org?.slug || orgSlugOrId || '').trim();
          if (orgSlugForMembers) {
            try {
              const orgMembers = await api.listAll<MemberRecord>(
                `/organisations/${encodeURIComponent(orgSlugForMembers)}/members/`,
                { pageSize: 500, maxItems: 5000 },
              );
              for (const m of Array.isArray(orgMembers) ? orgMembers : []) {
                const uid = String(m?.user?.id || m?.user_id || '').trim();
                if (uid && !byUserId.has(uid)) byUserId.set(uid, m);
              }
            } catch {
              // Silently fail if no access to org members
            }
          }
        }

        if (!cancelled) setTeamRoster(Array.from(byUserId.values()));
      } catch (e) {
        logger.error('Failed to load team roster', e);
        const msg = e instanceof Error ? e.message : 'Failed to load team roster';
        if (!cancelled) setTeamRosterError(msg);
      } finally {
        if (!cancelled) setTeamRosterLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, apiBaseUrl, org, project, s.teamRosterReloadToken]);

  // ── Fetch matches only when the user is on a tab that actually needs them ──
  useEffect(() => {
    const needsMatches =
      activeTab === 'overview' ||
      activeTab === 'hierarchy' ||
      activeTab === 'matches' ||
      activeTab === 'competitions' ||
      activeTab === 'content';
    if (!needsMatches) return;
    const projectNumericId = String(project?.id || '').trim();
    const seasonUuid = String(resolvedSeasonId || '').trim();
    if (!projectNumericId || !seasonUuid) return;

    let cancelled = false;
    const run = async () => {
      setMatchesLoading(true);
      try {
        const seasonMatches = await api.listAll<MatchRecord>('/activities/', {
          params: {
            project_id: projectNumericId,
            period_id: seasonUuid,
            include_descendants: 'true',
            activity_type: 'match',
            ordering: '-start_time',
          },
          pageSize: 250, maxItems: 250,
        });

        if (!cancelled) setMatches(seasonMatches);
      } catch (e) {
        logger.error('Failed to fetch matches', e);
      } finally {
        if (!cancelled) setMatchesLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, apiBaseUrl, project, resolvedSeasonId]);

  // ── Fetch opponent club names from match metadata ──
  useEffect(() => {
    if (!s.matches.length || !apiBaseUrl) return;
    const clubIds = [...new Set(
      s.matches
        .map((m) => String(m.metadata?.teamreel?.match_context?.opponent_club_id || '').trim())
        .filter((id: string) => id && !s.opponentClubNames[id])
    )];
    if (!clubIds.length) return;

    let cancelled = false;
    (async () => {
      const results: Record<string, string> = {};
      await Promise.all(
        clubIds.map(async (cid) => {
          try {
            const data = await api.get<ProjectRecord>(`/projects/${encodeURIComponent(cid)}/`);
            if (data?.name) results[cid] = data.name;
          } catch { /* ignore */ }
        })
      );
      if (!cancelled) setOpponentClubNames((prev) => ({ ...prev, ...results }));
    })();
    return () => { cancelled = true; };
  }, [s.matches, apiBaseUrl]);

  return {
    // State
    activatingContext: s.activatingContext, setActivatingContext,
    activeContext: s.activeContext, setActiveContextState,
    matches: s.matches, setMatches,
    matchesLoading: s.matchesLoading, setMatchesLoading,
    members: s.members, setMembers,
    membersLoading: s.membersLoading,
    membersError: s.membersError,
    setMembersReloadToken,
    teamRoster: s.teamRoster,
    teamRosterLoading: s.teamRosterLoading,
    teamRosterError: s.teamRosterError,
    setTeamRosterReloadToken,
    bulkSubmitting: s.bulkSubmitting, setBulkSubmitting,
    opponentClubNames: s.opponentClubNames,
    brandProfileId: s.brandProfileId,
  };
}
