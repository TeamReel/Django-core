import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { periodPathKey } from '../../utils/periodPath';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import type { WalletOption } from '../../components/transactions/CreateTransactionModal';
import {
  actionButtonStyle,
  type ActionTone,
} from '../identity/detail/detailStyles';
import { useSeasonContext, isSeasonPeriod } from '../../providers/SeasonProvider';
import type { Period } from '../../types/season';
import { getCsrfToken } from '../../types/season';
import {
  getUserId,
  normalizeAccessRole,
  getFunctionalRolesFromMembership,
  getMatchParticipantsCount,
  sleep,
  fetchWithThrottleRetry,
} from './seasonDetailUtils';

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSeasonDetailPageData() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // ── Shared season-hierarchy context (org, project, club, season, permissions, brand) ──
  const ctx = useSeasonContext();
  const {
    org,
    project,
    club,
    season: providerSeason,
    resolvedSeasonId,
    competitions: providerCompetitions,
    seasonsForSwitcher,
    loading: providerLoading,
    error: providerError,
    competitionsLoading: providerCompetitionsLoading,
    isTeamRoute,
    orgSlugOrId,
    clubSlugOrId,
    projectSlugOrId,
    effectiveSeasonId,
    seasonsBasePath,
    projectDetailPath,
    seasonPathKey,
    memberDetailHref,
    clubBrand,
    teamBrand,
    batchBrandKits,
    brandLogoUrl,
    brandSponsorUrl,
    isSuperAdmin,
    orgForPermissions,
    permissionContext,
    userCanEditProject,
    userCanDeleteProject,
    isPlayer,
    apiBaseUrl,
    reloadSeason,
  } = ctx;

  // ── Local copies of provider data for optimistic updates ──
  // The provider fetches the data; these locals allow in-place mutations (edit/delete)
  // without forcing a full provider re-fetch.
  const [competitions, setCompetitions] = useState<Period[]>([]);
  useEffect(() => { setCompetitions(providerCompetitions); }, [providerCompetitions]);

  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(providerLoading); }, [providerLoading]);

  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setError(providerError); }, [providerError]);

  const [competitionsLoading, setCompetitionsLoading] = useState(false);
  useEffect(() => { setCompetitionsLoading(providerCompetitionsLoading); }, [providerCompetitionsLoading]);

  const [season, setSeason] = useState<Period | null>(providerSeason);
  useEffect(() => { setSeason(providerSeason); }, [providerSeason]);

  const tableActionButtonStyle = (tone: ActionTone = 'neutral'): React.CSSProperties => ({
    ...actionButtonStyle(tone),
  });

  const backButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: '4px',
    border: '1px solid var(--app-border)',
    backgroundColor: 'var(--app-surface-2)',
    color: 'var(--app-text)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
  };

  const [activatingContext, setActivatingContext] = useState(false);
  const [activeContext, setActiveContextState] = useState<any | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [membersReloadToken, setMembersReloadToken] = useState(0);

  const [teamRoster, setTeamRoster] = useState<any[]>([]);
  const [teamRosterLoading, setTeamRosterLoading] = useState(false);
  const [teamRosterError, setTeamRosterError] = useState<string | null>(null);
  const [teamRosterReloadToken, setTeamRosterReloadToken] = useState(0);

  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [isAddSquadMemberModalOpen, setIsAddSquadMemberModalOpen] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [opponentClubNames, setOpponentClubNames] = useState<Record<string, string>>({});

  // Edit modal (match TeamDetail page patterns: edit in-place, no /edit route)
  const [isPeriodEditModalOpen, setIsPeriodEditModalOpen] = useState(false);
  const [selectedEditPeriod, setSelectedEditPeriod] = useState<any | null>(null);

  const [isPeriodDetailModalOpen, setIsPeriodDetailModalOpen] = useState(false);
  const [selectedDetailPeriod, setSelectedDetailPeriod] = useState<any | null>(null);

  const [isMatchDetailModalOpen, setIsMatchDetailModalOpen] = useState(false);
  const [selectedDetailMatch, setSelectedDetailMatch] = useState<any | null>(null);

  const [isMatchEditModalOpen, setIsMatchEditModalOpen] = useState(false);
  const [selectedEditMatch, setSelectedEditMatch] = useState<any | null>(null);

  const [isCreateCompetitionModalOpen, setIsCreateCompetitionModalOpen] = useState(false);
  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);
  const [isCreateTxnModalOpen, setIsCreateTxnModalOpen] = useState(false);

  // Brand profile ID for Kits tab
  const [brandProfileId, setBrandProfileId] = useState<string | null>(null);

  const seasonWalletOptions = useMemo<WalletOption[]>(() => {
    const opts: WalletOption[] = [{ kind: 'default', label: 'Default (recommended)' }];
    opts.push({ kind: 'organization', label: 'Federation/Organisation wallet' });
    if (project?.id != null) {
      opts.push({ kind: 'project', label: 'Team wallet', projectId: String(project.id) });
    }
    opts.push({ kind: 'me', label: 'My user wallet' });
    return opts;
  }, [project?.id]);

  // ── Toast notifications ──
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' | 'warning' | 'error' }[]>([]);
  const pushToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = String(Date.now());
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Load active context on mount
  useEffect(() => {
    let cancelled = false;
    const loadActiveContext = async () => {
      try {
        const context = await getActiveContext();
        if (!cancelled) setActiveContextState(context);
      } catch (e) {
        console.error('Failed to load active context:', e);
      }
    };
    void loadActiveContext();
    return () => { cancelled = true; };
  }, []);

  const createModalOrganisations = useMemo(() => {
    if (!org) return [];
    return [{ id: String(org.id), name: String(org.name || ''), slug: (org as any).slug }];
  }, [org]);

  const createModalClubs = useMemo(() => {
    const baseOrgId = String(org?.id || '').trim();
    const c = club || null;
    if (c) {
      return [{ id: String((c as any).id), name: String((c as any).name || ''), slug: (c as any).slug, organisation: baseOrgId || undefined } as any];
    }
    return [] as any[];
  }, [club, org]);

  const createModalTeams = useMemo(() => {
    const team = project || null;
    if (!team) return [] as any[];
    const clubIdValue = String((club as any)?.id || '').trim();
    return [{ id: String((team as any).id), name: String((team as any).name || ''), slug: (team as any).slug, parent_id: clubIdValue || undefined } as any];
  }, [project, club]);

  // Permission checks, navigation helpers, and brand profiles now come from useSeasonContext

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = String(params.get('tab') || (isPlayer ? 'hierarchy' : 'overview')).trim().toLowerCase();
    const allowed = isPlayer
      ? new Set(['hierarchy', 'competitions', 'matches'])
      : new Set(['overview', 'content', 'hierarchy', 'competitions', 'matches', 'squad', 'team', 'media', 'transactions', 'assets', 'workflow']);
    return allowed.has(raw) ? raw : (isPlayer ? 'hierarchy' : 'overview');
  }, [location.search, isPlayer]);

  const navigateToTab = useCallback((tabId: string) => {
    const seasonKeyOrId = periodPathKey(season as any) || String(effectiveSeasonId || resolvedSeasonId || '').trim();
    if (!seasonKeyOrId) return;

    if (tabId === 'overview') {
      navigate(`${seasonsBasePath}/${seasonKeyOrId}`);
      return;
    }

    navigate(`${seasonsBasePath}/${seasonKeyOrId}?tab=${encodeURIComponent(tabId)}`);
  }, [season, effectiveSeasonId, resolvedSeasonId, seasonsBasePath, navigate]);

  const currentUserId = String((user as any)?.id || '').trim();
  const mySeasonMembershipId = useMemo(() => {
    if (!currentUserId) return '';
    const mine = (members || []).find((m: any) => {
      const u = m?.user || m;
      const id = u?.id ?? m?.user_id;
      return String(id || '').trim() === currentUserId;
    });
    return String(mine?.id || '').trim();
  }, [currentUserId, members]);

  // Brand profiles (clubBrand, teamBrand) come from useSeasonContext

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

  // Helper to count matches per competition
  const getMatchCountForCompetition = useCallback((competition: any): number => {
    const annotated = Number(
      (competition as any)?.matches_count ?? (competition as any)?.children_matches_count
    );
    if (!matches.length && Number.isFinite(annotated) && annotated >= 0) return annotated;

    const competitionId = String((competition as any)?.id || '').trim();
    if (!competitionId) return 0;
    return matches.filter((m: any) => {
      const periodId = String(m.period_id || m.period?.id || (m as any)?.period || '');
      return periodId === competitionId;
    }).length;
  }, [matches]);

  const getCompetitionParticipantsCount = useCallback((competition: any): number => {
    const direct = Number(
      (competition as any)?.participants_count ??
        (competition as any)?.participations_count ??
        (competition as any)?.participantsCount ??
        (competition as any)?.participationsCount
    );
    if (Number.isFinite(direct) && direct >= 0) return direct;

    const competitionId = String((competition as any)?.id || '').trim();
    if (!competitionId) return 0;

    // Best-effort aggregation from loaded matches.
    const related = matches.filter((m: any) => String(m.period_id || m.period?.id || '') === competitionId);
    if (related.length === 0) return 0;
    return related.reduce((sum: number, m: any) => sum + getMatchParticipantsCount(m), 0);
  }, [matches]);

  const seasonMatchesCount = useMemo(() => {
    if (matches.length) return matches.length;
    const annotated = Number((season as any)?.children_matches_count ?? (season as any)?.matches_count);
    if (Number.isFinite(annotated) && annotated >= 0) return annotated;
    return 0;
  }, [matches.length, season]);

  // Main org/project/club/season/competitions data now fetched by SeasonProvider

  // ── Load brand profile ID for Kits tab ──
  useEffect(() => {
    if (!project?.id) return;
    let cancelled = false;

    const loadBrandProfile = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/branding/profiles/?project=${project.id}`, { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        const data = json?.data || json;
        const results = data?.results || (Array.isArray(data) ? data : []);
        if (results.length > 0 && !cancelled) {
          setBrandProfileId(results[0]?.id || null);
        }
      } catch { /* ignore */ }
    };

    void loadBrandProfile();
    return () => { cancelled = true; };
  }, [apiBaseUrl, project?.id]);

  // Fetch season squad memberships (season-scoped roster)
  useEffect(() => {
    const projectIdForMembers = String((project as any)?.id || '').trim();
    const seasonUuid = String(resolvedSeasonId || '').trim();

    if (!projectIdForMembers || !seasonUuid) return;

    let cancelled = false;
    const run = async () => {
      setMembersLoading(true);
      setMembersError(null);
      try {
        const membersUrl = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(
          projectIdForMembers
        )}/members/?period=${encodeURIComponent(seasonUuid)}&page_size=200`;

        const membersList = await fetchAllPages<any>(
          membersUrl,
          { credentials: 'include' },
          { bypass: true, maxItems: 5000 }
        );

        if (!cancelled) setMembers(Array.isArray(membersList) ? membersList : []);
      } catch (e) {
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
  }, [apiBaseUrl, project, resolvedSeasonId, membersReloadToken]);

  // Fetch full team roster (all memberships on the team, any period) so we can show
  // "team members not in squad" for quick assignment.
  // Only fetch org members on the squad tab (orgs can have thousands of members).
  useEffect(() => {
    if (activeTab !== 'squad' && activeTab !== 'team') return;
    const projectIdForMembers = String((project as any)?.id || '').trim();
    if (!projectIdForMembers) return;

    let cancelled = false;
    const run = async () => {
      setTeamRosterLoading(true);
      setTeamRosterError(null);
      try {
        // Fetch team-level memberships (project memberships without period filter)
        const rosterUrl = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForMembers)}/members/?page_size=500`;
        const roster = await fetchAllPages<any>(
          rosterUrl,
          { credentials: 'include' },
          { bypass: true, maxItems: 5000 }
        );

        // Only merge org members on the squad tab — the team tab should only show
        // actual team members. Org-wide members are only relevant when assigning
        // new people to a season squad. This avoids loading 2500+ org members on
        // the team tab.
        const byUserId = new Map<string, any>();
        for (const m of Array.isArray(roster) ? roster : []) {
          const uid = String(m?.user?.id || m?.user_id || '').trim();
          if (uid && !byUserId.has(uid)) byUserId.set(uid, m);
        }

        if (activeTab === 'squad') {
          const orgSlugForMembers = String((org as any)?.slug || orgSlugOrId || '').trim();
          if (orgSlugForMembers) {
            try {
              const orgMembersUrl = `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForMembers)}/members/?page_size=500`;
              const orgMembers = await fetchAllPages<any>(
                orgMembersUrl,
                { credentials: 'include' },
                { bypass: true, maxItems: 5000 }
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
  }, [activeTab, apiBaseUrl, org, project, teamRosterReloadToken]);

  const getBestRoleForUser = (userId: string): 'viewer' | 'editor' | 'admin' => {
    const relevant = teamRoster.filter((m: any) => getUserId(m) === String(userId));
    const base = relevant.find((m: any) => !String(m?.period_id ?? m?.period ?? '').trim());
    const anyOne = relevant[0];
    return normalizeAccessRole(base?.role ?? anyOne?.role ?? 'viewer');
  };

  const getFunctionalRolesForUser = (userId: string): string[] => {
    const relevant = teamRoster.filter((m: any) => getUserId(m) === String(userId));
    const set = new Set<string>();
    for (const m of relevant) {
      for (const r of getFunctionalRolesFromMembership(m)) set.add(r);
    }
    return Array.from(set.values());
  };

  // Members eligible for then_vs_now (for modal member picker)
  const thenVsNowEligibleMembers = useMemo(() => {
    return (members || []).map((m: any) => {
      const videos = m?.metadata?.teamreel_assets?.videos || {};
      const thenVsNow = videos?.then_vs_now || {};

      // Collect all transformation variant keys with data
      const transformationKeys: string[] = [];
      for (const k of Object.keys(thenVsNow)) {
        if (!k.startsWith('transformation')) continue;
        const v = thenVsNow[k];
        if (v && (v.processed || v.raw)) transformationKeys.push(k);
      }
      const hasTransformation = transformationKeys.length > 0;

      // Duo Portret eligibility: needs a processed photo_composite video (RVM output)
      const compositeVideo = videos?.photo_composite?.default;
      const hasDuoPortret = !!(
        compositeVideo
        && typeof compositeVideo === 'object'
        && compositeVideo.processing_state === 'processed'
        && compositeVideo.processed
      );

      // Duo Portret Cover: needs a raw photo_composite video (AI-generated)
      const hasDuoPortretCover = !!(
        compositeVideo
        && typeof compositeVideo === 'object'
        && compositeVideo.raw
      );

      // Duo Portret Overlay: needs a processed (RVM) photo_composite video
      const hasDuoPortretOverlay = hasDuoPortret;

      // Sidebyside eligibility: raw AI video
      const sideData = thenVsNow?.sidebyside;
      const hasSidebysideCover = !!(
        sideData
        && typeof sideData === 'object'
        && (sideData.raw || (typeof sideData === 'string'))
      );

      // Sidebyside Overlay: needs processed (RVM) sidebyside video
      const hasSidebysideOverlay = !!(
        sideData
        && typeof sideData === 'object'
        && sideData.processing_state === 'processed'
        && sideData.processed
      );

      // Walking Composite eligibility: needs a processed walking_composite video
      const walkingVideo = videos?.walking_composite?.default;
      const hasWalkingComposite = !!(
        walkingVideo
        && typeof walkingVideo === 'object'
        && walkingVideo.processing_state === 'processed'
        && walkingVideo.processed
      );

      return {
        id: String(m.id || ''),
        userId: String(m.user?.id || m.user_id || ''),
        name: m.user ? `${m.user.first_name || ''} ${m.user.last_name || ''}`.trim() || m.user.email || 'Unknown' : 'Unknown',
        shirtNumber: m.metadata?.shirt_number || m.shirt_number || null,
        position: m.metadata?.position || m.position || null,
        hasDuoPortret,
        hasDuoPortretCover,
        hasDuoPortretOverlay,
        hasSidebysideCover,
        hasSidebysideOverlay,
        hasTransformation,
        hasWalkingComposite,
        transformationKeys,
      };
    }).filter((m: any) => m.id);
  }, [members]);

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

  // Fetch matches only when the user is on a tab that actually needs them.
  useEffect(() => {
    const needsMatches =
      activeTab === 'hierarchy' ||
      activeTab === 'matches' ||
      activeTab === 'competitions' ||
      activeTab === 'content';
    if (!needsMatches) return;
    const projectNumericId = String((project as any)?.id || '').trim();
    const seasonUuid = String(resolvedSeasonId || '').trim();
    if (!projectNumericId || !seasonUuid) return;

    let cancelled = false;
    const run = async () => {
      setMatchesLoading(true);
      try {
        // Server supports include_descendants so we can fetch season matches without scanning all activities.
        const url = `${apiBaseUrl}/api/v1/activities/?project_id=${encodeURIComponent(
          projectNumericId
        )}&period_id=${encodeURIComponent(
          seasonUuid
        )}&include_descendants=true&activity_type=match&ordering=-start_time&page_size=250`;

        const seasonMatches = await fetchAllPages<any>(
          url,
          { credentials: 'include' },
          {
            ttlMs: 30_000,
            cacheKey: `matches:season:${projectNumericId}:${seasonUuid}`,
            maxItems: 250,
          }
        );

        if (!cancelled) setMatches(seasonMatches);
      } catch (e) {
        console.error('Failed to fetch matches:', e);
      } finally {
        if (!cancelled) setMatchesLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, apiBaseUrl, project, resolvedSeasonId]);

  // Fetch opponent club names from match metadata (opponent_club_id → project name)
  useEffect(() => {
    if (!matches.length || !apiBaseUrl) return;
    const clubIds = [...new Set(
      matches
        .map((m: any) => String(m.metadata?.teamreel?.match_context?.opponent_club_id || '').trim())
        .filter((id: string) => id && !opponentClubNames[id])
    )];
    if (!clubIds.length) return;

    let cancelled = false;
    (async () => {
      const results: Record<string, string> = {};
      await Promise.all(
        clubIds.map(async (cid) => {
          try {
            const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(cid)}/`, { credentials: 'include' });
            if (res.ok) {
              const raw: any = await res.json();
              const data = raw?.data ?? raw;
              if (data?.name) results[cid] = data.name;
            }
          } catch { /* ignore */ }
        })
      );
      if (!cancelled) setOpponentClubNames((prev) => ({ ...prev, ...results }));
    })();
    return () => { cancelled = true; };
  }, [matches, apiBaseUrl]);

  // Show club name (parent project) instead of team name (child project) in match titles
  const matchDisplayTitle = useCallback((m: any) => {
    // Prefer a clean title built from metadata club names
    const ctx = m.metadata?.teamreel?.match_context;
    const homeClubName = ctx?.home_club_name || '';
    const awayClubName = ctx?.away_club_name || '';
    const oppClubId = String(ctx?.opponent_club_id || '').trim();
    const resolvedAwayClub = oppClubId ? opponentClubNames[oppClubId] : '';
    const homeName = homeClubName || club?.name || project?.name || '';
    const awayName = resolvedAwayClub || awayClubName || m.opponent_project?.name || '';
    if (homeName && awayName) return `${homeName} vs ${awayName}`;

    // Fallback: string replacement on stored title
    let raw = m.title || m.name || '';
    if (project?.name && club?.name && project.name !== club.name) {
      raw = raw.replace(project.name, club.name);
    }
    const oppTeamName = m.opponent_project?.name || ctx?.away_team_name || '';
    const oppClubName = oppClubId ? opponentClubNames[oppClubId] : '';
    if (oppTeamName && oppClubName && oppTeamName !== oppClubName) {
      raw = raw.replace(oppTeamName, oppClubName);
    }
    return raw;
  }, [opponentClubNames, club, project]);

  // ── Delete season handler ──
  const handleDeleteSeason = useCallback(async () => {
    if (!window.confirm(`Are you sure you want to delete season ${season?.name}?`)) return;
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/periods/${encodeURIComponent(resolvedSeasonId || effectiveSeasonId)}/`,
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
      // (Prevents confusing UX when the add succeeds but the refreshed list is stale.)
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
    // Navigation
    navigate,
    user,

    // Provider data
    org,
    project,
    club,
    season,
    setSeason,
    resolvedSeasonId,
    effectiveSeasonId,
    seasonsBasePath,
    seasonPathKey,
    isTeamRoute,
    orgSlugOrId,
    memberDetailHref,
    clubBrand,
    teamBrand,
    batchBrandKits,
    brandLogoUrl,
    brandSponsorUrl,
    apiBaseUrl,
    userCanEditProject,
    userCanDeleteProject,
    isPlayer,

    // Local state
    competitions,
    setCompetitions,
    competitionsLoading,
    loading,
    error,
    matches,
    setMatches,
    matchesLoading,
    setMatchesLoading,
    members,
    membersLoading,
    membersError,
    setMembersReloadToken,
    teamRoster,
    teamRosterLoading,
    teamRosterError,
    bulkSubmitting,
    activatingContext,
    opponentClubNames,
    brandProfileId,

    // Active context
    activeContext,
    handleActivateContext,

    // Modal state
    isPeriodEditModalOpen,
    setIsPeriodEditModalOpen,
    selectedEditPeriod,
    setSelectedEditPeriod,
    isPeriodDetailModalOpen,
    setIsPeriodDetailModalOpen,
    selectedDetailPeriod,
    setSelectedDetailPeriod,
    isMatchDetailModalOpen,
    setIsMatchDetailModalOpen,
    selectedDetailMatch,
    setSelectedDetailMatch,
    isMatchEditModalOpen,
    setIsMatchEditModalOpen,
    selectedEditMatch,
    setSelectedEditMatch,
    isCreateCompetitionModalOpen,
    setIsCreateCompetitionModalOpen,
    isCreateMatchModalOpen,
    setIsCreateMatchModalOpen,
    isCreateTxnModalOpen,
    setIsCreateTxnModalOpen,
    isAddSquadMemberModalOpen,
    setIsAddSquadMemberModalOpen,

    // Computed
    activeTab,
    navigateToTab,
    seasonWalletOptions,
    seasonMatchesCount,
    createModalOrganisations,
    createModalClubs,
    createModalTeams,
    thenVsNowEligibleMembers,

    // Toasts
    toasts,
    pushToast,
    dismissToast,

    // Business functions
    savePeriodEdits,
    saveMatchEdits,
    getMatchCountForCompetition,
    getCompetitionParticipantsCount,
    getBestRoleForUser,
    getFunctionalRolesForUser,
    assignUsersToSeasonSquad,
    unassignMembershipsFromSeasonSquad,
    matchDisplayTitle,
    handleDeleteSeason,
    handleCreateCompetition,
    handleCreateMatch,
    handleAddSquadMember,

    // Helpers for modals
    isSeasonPeriod,
    organisationSportId: org?.sport?.id ? String(org.sport.id) : null,
  };
}
