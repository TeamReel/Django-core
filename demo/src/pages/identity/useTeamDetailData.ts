import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocation, useNavigate, useParams, type NavigateFunction } from 'react-router-dom';
import { type BreadcrumbSwitcherOption } from '@django-core/page-templates';

import { fetchAllPages } from '../../utils/fetchAllPages';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import { unwrapEnvelope } from '../../utils/apiEnvelope';
import { useUserRole } from '../../components/PermissionGuards';
import { getApiBaseUrl } from '../../utils/apiBase';
import { getApiV1BaseUrl } from '../../utils/apiFetch';
import { logger } from '@/utils/logger';
import { api } from '@/api';
import { routes } from '../../routes';
import type { BrandProfile } from '@/types/api/branding';

import {
  type Organisation,
  type Project,
  looksLikeIdentifier,
  getParentProjectId,
  mergeUniqueById,
} from './teamDetailTypes';

export interface UseTeamDetailDataReturn {
  // Core entities
  org: Organisation | null;
  club: Project | null;
  team: Project | null;
  setTeam: Dispatch<SetStateAction<Project | null>>;
  loading: boolean;
  error: string | null;
  // Identifiers
  orgIdForDirectoryLists: string;
  clubIdForDirectoryLists: string;
  teamIdForDirectoryLists: string;
  orgSlugForDirectoryLists: string;
  orgKeyForRoutes: string;
  clubKeyForRoutes: string;
  teamKeyForRoutes: string;
  // Active context
  activatingContext: boolean;
  setActivatingContext: Dispatch<SetStateAction<boolean>>;
  activeContextState: Record<string, unknown> | null;
  setActiveContextState: Dispatch<SetStateAction<Record<string, unknown> | null>>;
  // Modal state
  isProjectEditModalOpen: boolean;
  setIsProjectEditModalOpen: Dispatch<SetStateAction<boolean>>;
  isProjectDetailModalOpen: boolean;
  setIsProjectDetailModalOpen: Dispatch<SetStateAction<boolean>>;
  // Brand
  brandProfileId: string | null;
  // Switcher
  clubTeamsForSwitcher: Project[];
  clubTeamsForSwitcherLoading: boolean;
  teamBreadcrumbOptions: BreadcrumbSwitcherOption[];
  handleTeamSwitch: (option: BreadcrumbSwitcherOption) => void;
  // Navigation
  backToClubHref: string;
  federationClubsHref: string;
  // Meta
  apiBaseUrl: string;
  isPlayer: boolean;
  // Refetch
  refetch: () => void;
}

export function useTeamDetailData(): UseTeamDetailDataReturn {
  const { orgId, clubId, projectId } = useParams<{ orgId: string; clubId: string; projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isPlayer } = useUserRole();

  const apiBaseUrl = getApiBaseUrl();
  const apiV1 = getApiV1BaseUrl();

  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(clubId || '').trim();
  const teamSlugOrId = String(projectId || '').trim();

  // API lookup for organisations uses slug (not UUID). If we land on a UUID URL,
  // resolve it via the organisations list (which contains both id + slug).
  const [resolvedOrgSlug, setResolvedOrgSlug] = useState<string>('');
  const effectiveOrgSlug = useMemo(() => {
    const explicit = String(resolvedOrgSlug || '').trim();
    if (explicit) return explicit;
    const raw = String(orgSlugOrId || '').trim();
    return looksLikeIdentifier(raw) ? '' : raw;
  }, [orgSlugOrId, resolvedOrgSlug]);

  const [org, setOrg] = useState<Organisation | null>(null);
  const [club, setClub] = useState<Project | null>(null);
  const [team, setTeam] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activatingContext, setActivatingContext] = useState(false);
  const [activeContextState, setActiveContextState] = useState<Record<string, unknown> | null>(null);
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState(false);
  const [isProjectDetailModalOpen, setIsProjectDetailModalOpen] = useState(false);
  const [brandProfileId, setBrandProfileId] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  const [clubTeamsForSwitcher, setClubTeamsForSwitcher] = useState<Project[]>([]);
  const [clubTeamsForSwitcherLoading, setClubTeamsForSwitcherLoading] = useState(false);

  // ── Load active context ──
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

  // ── Load org, club, and team ──
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!orgSlugOrId || !clubSlugOrId || !teamSlugOrId) {
          throw new Error('Missing organisation, club, or team identifier.');
        }

        if (!effectiveOrgSlug) {
          const res = await api.list<{ id?: string; slug?: string }>('/organisations/', { pageSize: 250 });
          const list = res.results || [];
          const match = list.find((o) => String(o?.id || '') === String(orgSlugOrId));
          const slug = String(match?.slug || '').trim();
          if (!slug) throw new Error('Organisation not found');
          if (cancelled) return;
          setResolvedOrgSlug(slug);
          return;
        }

        const [loadedOrg, loadedClub, loadedTeam] = await Promise.all([
          api.get<Organisation>(`/organisations/${encodeURIComponent(effectiveOrgSlug)}/`),
          api.get<Project>(
            `/organisations/${encodeURIComponent(effectiveOrgSlug)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
          ),
          api.get<Project>(
            `/organisations/${encodeURIComponent(effectiveOrgSlug)}/projects/${encodeURIComponent(clubSlugOrId)}/teams/${encodeURIComponent(teamSlugOrId)}/`,
          ),
        ]);

        if (cancelled) return;
        setOrg(loadedOrg);
        setClub(loadedClub);
        setTeam(loadedTeam);
      } catch (e) {
        logger.error('Failed to load team', e);
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load team');
        setOrg(null);
        setClub(null);
        setTeam(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [apiBaseUrl, clubSlugOrId, orgSlugOrId, teamSlugOrId, effectiveOrgSlug, refreshKey]);

  // ── ID / slug memos ──
  const orgIdForDirectoryLists = useMemo(() => String(org?.id || '').trim(), [org?.id]);
  const clubIdForDirectoryLists = useMemo(() => String(club?.id || '').trim(), [club?.id]);
  const teamIdForDirectoryLists = useMemo(() => String(team?.id || '').trim(), [team?.id]);

  const orgSlugForDirectoryLists = useMemo(() => {
    const slug = String(org?.slug || resolvedOrgSlug || '').trim();
    return slug;
  }, [org?.slug, resolvedOrgSlug]);

  const orgKeyForRoutes = useMemo(() => {
    const slug = String(org?.slug || resolvedOrgSlug || '').trim();
    return slug || String(orgSlugOrId || '').trim();
  }, [org?.slug, orgSlugOrId, resolvedOrgSlug]);
  const clubKeyForRoutes = useMemo(() => String(club?.slug || clubSlugOrId || '').trim(), [club?.slug, clubSlugOrId]);
  const teamKeyForRoutes = useMemo(() => String(team?.slug || teamSlugOrId || '').trim(), [team?.slug, teamSlugOrId]);

  const shouldResolveOrg = useMemo(() => looksLikeIdentifier(orgSlugOrId), [orgSlugOrId]);
  const shouldResolveClub = useMemo(() => looksLikeIdentifier(clubSlugOrId), [clubSlugOrId]);
  const shouldResolveTeam = useMemo(() => looksLikeIdentifier(teamSlugOrId), [teamSlugOrId]);

  // ── Slug redirect (club/team) ──
  useEffect(() => {
    if (!org || !club || !team) return;

    const resolvedClubSlug = String(club?.slug || '').trim();
    const resolvedTeamSlug = String(team?.slug || '').trim();

    const desiredClubKey = resolvedClubSlug || clubSlugOrId;
    const desiredTeamKey = resolvedTeamSlug || teamSlugOrId;

    const needsRedirect =
      (shouldResolveClub && resolvedClubSlug && resolvedClubSlug !== clubSlugOrId) ||
      (shouldResolveTeam && resolvedTeamSlug && resolvedTeamSlug !== teamSlugOrId);

    if (!needsRedirect) return;

    const orgKey = String(org?.slug || resolvedOrgSlug || orgSlugOrId || '').trim();
    if (!orgKey || !desiredClubKey || !desiredTeamKey) return;

    navigate(
      `${routes.team({ orgId: orgKey, clubId: desiredClubKey, projectId: desiredTeamKey })}${location.search || ''}`,
      { replace: true },
    );
  }, [club, clubSlugOrId, location.search, navigate, org, orgSlugOrId, shouldResolveClub, shouldResolveTeam, team, teamSlugOrId]);

  // ── Slug redirect (org) ──
  useEffect(() => {
    if (!shouldResolveOrg) return;
    const slug = String(org?.slug || resolvedOrgSlug || '').trim();
    if (!slug) return;
    if (slug === orgSlugOrId) return;
    const clubKey = String(club?.slug || clubSlugOrId || '').trim();
    const teamKey = String(team?.slug || teamSlugOrId || '').trim();
    if (!clubKey || !teamKey) return;
    navigate(`${routes.team({ orgId: slug, clubId: clubKey, projectId: teamKey })}${location.search || ''}`, {
      replace: true,
    });
  }, [club, clubSlugOrId, location.search, navigate, org?.slug, orgSlugOrId, resolvedOrgSlug, shouldResolveOrg, team, teamSlugOrId]);

  // ── Load club teams for breadcrumb switcher ──
  useEffect(() => {
    let cancelled = false;

    const loadClubTeams = async () => {
      if (!clubIdForDirectoryLists) return;

      setClubTeamsForSwitcherLoading(true);
      setClubTeamsForSwitcher([]);
      try {
        const orgKey = String(org?.slug || resolvedOrgSlug || '').trim();

        const clubIdForFilter = String(getParentProjectId((team || {}) as Record<string, unknown>) || clubIdForDirectoryLists || '').trim();
        if (!clubIdForFilter) {
          if (!cancelled) setClubTeamsForSwitcher([]);
          return;
        }

        const isTeamUnderThisClub = (t: Project): boolean => {
          const parentId = String(getParentProjectId(t) || '').trim();
          if (!parentId) return false;
          return parentId === clubIdForFilter;
        };

        const directUrl = `${apiV1}/projects/?parent_project=${encodeURIComponent(String(clubIdForDirectoryLists))}&page_size=500&include_archived=true`;
        const orgTeamsUrl = orgKey
          ? `${apiV1}/organisations/${encodeURIComponent(orgKey)}/projects/?page_size=250&include_archived=true&parent_project__isnull=false`
          : `${apiV1}/projects/?page_size=250&include_archived=true&parent_project__isnull=false`;

        const [directResults, orgTeamsResults] = await Promise.all([
          fetchAllPages<Project>(directUrl, { credentials: 'include' }, { ttlMs: 60_000, bypass: true, maxItems: 5000 }),
          fetchAllPages<Project>(orgTeamsUrl, { credentials: 'include' }, { ttlMs: 60_000, bypass: true, maxItems: 5000 }),
        ]);

        const merged = mergeUniqueById([...(directResults || []), ...(orgTeamsResults || [])]);
        const list = mergeUniqueById(
          (merged || []).filter((t: Project) => {
            if (!t?.id) return false;
            if (String(t.id) === String(clubIdForDirectoryLists)) return false;
            return isTeamUnderThisClub(t);
          }),
        );

        if (cancelled) return;
        setClubTeamsForSwitcher(list);
      } catch {
        if (cancelled) return;
        setClubTeamsForSwitcher([]);
      } finally {
        if (!cancelled) setClubTeamsForSwitcherLoading(false);
      }
    };

    void loadClubTeams();
    return () => { cancelled = true; };
  }, [apiBaseUrl, clubIdForDirectoryLists, org?.slug, resolvedOrgSlug]);

  // ── Load brand profile ID for Kits tab ──
  useEffect(() => {
    if (!team?.id) return;
    let cancelled = false;

    const loadBrandProfile = async () => {
      try {
        const res = await api.list<BrandProfile>(`/branding/profiles/`, { params: { project: team.id } });
        const results = res.results || [];
        if (results.length > 0 && !cancelled) {
          setBrandProfileId(String(results[0]?.id) || null);
        }
      } catch { /* ignore */ }
    };

    void loadBrandProfile();
    return () => { cancelled = true; };
  }, [apiBaseUrl, team?.id]);

  // ── Navigation memos ──
  const backToClubHref = useMemo(() => {
    if (!orgKeyForRoutes || !clubKeyForRoutes) return '/federations';
    return `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}`;
  }, [clubKeyForRoutes, orgKeyForRoutes]);

  const federationClubsHref = useMemo(() => {
    if (!orgKeyForRoutes) return '/federations';
    return `/${encodeURIComponent(orgKeyForRoutes)}?tab=clubs`;
  }, [orgKeyForRoutes]);

  const teamBreadcrumbOptions: BreadcrumbSwitcherOption[] = useMemo(() => {
    const base = (clubTeamsForSwitcher || []).map((t: Project) => ({
      id: String(t.id),
      label: String(t.name || t.slug || t.id),
      slug: String(t.slug || t.id),
    }));

    if (team && !base.some((t) => String(t.id) === String(team.id))) {
      base.push({
        id: String(team.id),
        label: String(team.name || team.slug || team.id),
        slug: String(team.slug || team.id),
      });
    }

    return base;
  }, [clubTeamsForSwitcher, team]);

  const handleTeamSwitch = (option: BreadcrumbSwitcherOption) => {
    if (!orgKeyForRoutes || !clubKeyForRoutes) return;
    navigate(
      `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(
        String(option.slug || option.id),
      )}${location.search || ''}`,
    );
  };

  return {
    // Core entities
    org, club, team, setTeam, loading, error,
    // Identifiers
    orgIdForDirectoryLists, clubIdForDirectoryLists, teamIdForDirectoryLists,
    orgSlugForDirectoryLists, orgKeyForRoutes, clubKeyForRoutes, teamKeyForRoutes,
    // Active context
    activatingContext, setActivatingContext,
    activeContextState, setActiveContextState,
    // Modal state
    isProjectEditModalOpen, setIsProjectEditModalOpen,
    isProjectDetailModalOpen, setIsProjectDetailModalOpen,
    // Brand
    brandProfileId,
    // Switcher
    clubTeamsForSwitcher, clubTeamsForSwitcherLoading,
    teamBreadcrumbOptions, handleTeamSwitch,
    // Navigation
    backToClubHref, federationClubsHref,
    // Meta
    apiBaseUrl, isPlayer,
    // Refetch
    refetch,
  };
}
