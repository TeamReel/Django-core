/**
 * useMemberDetailData — Core lifecycle hook for the Member Detail page.
 *
 * Responsibilities:
 * - Shadow state synced from SeasonProvider (allows optimistic updates)
 * - Membership data fetch + reset on navigation
 * - Active context management
 * - Breadcrumb computation
 * - Tab navigation helpers
 * - Save handler (PATCH metadata)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { ACTIVE_CONTEXT_CHANGED_EVENT, getActiveContext, setActiveContext } from '../../utils/activeContext';
import { useSeasonContext } from '../../providers/SeasonProvider';
import type { Period, SeasonProject as Project, SeasonOrganisation as Organisation } from '../../types/season';
import { unwrapEnvelope as unwrap } from '../../types/season';
import { projectsApi } from '../../api';
import { UUID_RE, getUserDisplayName, mergeAssetsIntoMetadata } from './memberDetailUtils';
import type { AssetVariantsMap } from './memberDetailUtils';
import type { MemberMediaForm } from '../../constants/mediaSlots';

export interface MemberDetailData {
  // Identity
  membership: any | null;
  setMembership: React.Dispatch<React.SetStateAction<any | null>>;
  membershipId: string;
  user: any;

  // Season hierarchy (shadow state)
  loading: boolean;
  error: string | null;
  org: Organisation | null;
  project: Project | null;
  club: Project | null;
  season: Period | null;
  resolvedSeasonId: string;

  // SeasonProvider pass-through
  isTeamRoute: boolean;
  orgSlugOrId: string;
  clubSlugOrId: string;
  seasonsBasePath: string;
  seasonKeyForLinks: string;
  clubBrand: any;
  teamBrand: any;
  batchBrandKits: Record<string, string | null>;
  isSuperAdmin: boolean;
  userCanEditProject: boolean;
  isPlayer: boolean;
  isSupporter: boolean;
  apiBaseUrl: string;

  // Tab navigation
  activeTab: string;
  navigateToTab: (tabId: string) => void;

  // Active context
  activeContext: any | null;
  activatingContext: boolean;
  handleSetActiveContext: () => Promise<void>;

  // Save
  saving: boolean;
  saveError: string | null;
  save: (form: MemberMediaForm, videoVariants: AssetVariantsMap) => Promise<void>;

  // Breadcrumbs
  breadcrumbs: Array<{ label: string; onClick?: () => void }>;

  // Player access
  isOwnProfile: boolean;
}

export function useMemberDetailData(): MemberDetailData {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { user } = useAuth();

  const {
    org: providerOrg,
    project: providerProject,
    club: providerClub,
    season: providerSeason,
    resolvedSeasonId: providerSeasonId,
    loading: providerLoading,
    error: providerError,
    isTeamRoute,
    isOrgRoute: isOrgRoutes,
    orgSlugOrId,
    clubSlugOrId,
    projectSlugOrId,
    effectiveSeasonId: seasonKeyOrId,
    seasonsBasePath,
    seasonPathKey: seasonKeyForLinksFromProvider,
    clubBrand,
    teamBrand,
    batchBrandKits,
    isSuperAdmin,
    orgForPermissions,
    permissionContext,
    userCanEditProject,
    isPlayer,
    isSupporter,
    apiBaseUrl,
  } = useSeasonContext();

  const membershipId = String(params.memberId || params.competitionId || '').trim();

  // ── Tab navigation ──
  const activeTab = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const raw = String(sp.get('tab') || '').trim() || 'overview';
    /* RBAC: Supporter → overview only, Member → core set, Admin → all */
    const allowed = isSupporter
      ? new Set(['overview'])
      : isPlayer
        ? new Set(['overview', 'input', 'assets', 'identity'])
        : new Set(['overview', 'input', 'assets', 'intro', 'celebration', 'then_vs_now', 'photo_composite', 'walking_composite', 'action_photo', 'identity']);
    return allowed.has(raw) ? raw : 'overview';
  }, [location.search, isPlayer, isSupporter]);

  const navigateToTab = useCallback((tabId: string) => {
    const sp = new URLSearchParams(location.search);
    sp.set('tab', tabId);
    const next = sp.toString();
    navigate(next ? `${location.pathname}?${next}` : location.pathname);
  }, [location.search, location.pathname, navigate]);

  // ── Shadow state synced from provider ──
  const [loading, setLoading] = useState(providerLoading);
  const [error, setError] = useState<string | null>(providerError);
  const [org, setOrg] = useState<Organisation | null>(providerOrg);
  const [project, setProject] = useState<Project | null>(providerProject);
  const [club, setClub] = useState<Project | null>(providerClub);
  const [season, setSeason] = useState<Period | null>(providerSeason);
  const [resolvedSeasonId, setResolvedSeasonId] = useState<string>(providerSeasonId);

  useEffect(() => { setOrg(providerOrg); }, [providerOrg]);
  useEffect(() => { setProject(providerProject); }, [providerProject]);
  useEffect(() => { setClub(providerClub); }, [providerClub]);
  useEffect(() => { setSeason(providerSeason); }, [providerSeason]);
  useEffect(() => { setResolvedSeasonId(providerSeasonId); }, [providerSeasonId]);
  useEffect(() => { setLoading(providerLoading); }, [providerLoading]);
  useEffect(() => { setError(providerError); }, [providerError]);

  const [membership, setMembership] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Active context ──
  const [activeContext, setActiveContextState] = useState<any | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const ctx = await getActiveContext();
        if (!cancelled) setActiveContextState(ctx);
      } catch {
        if (!cancelled) setActiveContextState(null);
      }
    };
    const onChanged = () => { void load(); };
    void load();
    window.addEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, onChanged);
    return () => { cancelled = true; window.removeEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, onChanged); };
  }, []);

  const handleSetActiveContext = useCallback(async () => {
    if (!membership) return;
    try {
      setActivatingContext(true);
      await setActiveContext('membership', String(membership.id));
      const ctx = await getActiveContext();
      setActiveContextState(ctx);
    } finally {
      setActivatingContext(false);
    }
  }, [membership]);

  // ── Reset membership on navigation ──
  useEffect(() => { setMembership(null); }, [membershipId]);

  // ── Fetch member data ──
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!project?.id || !membershipId) return;
        if (!UUID_RE.test(membershipId)) { setError('Member id must be a UUID'); return; }
        const memberJson = await projectsApi.getMember(project.id, membershipId);
        if (!cancelled) setMembership(memberJson);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load member');
      }
    };
    run();
    return () => { cancelled = true; };
  }, [apiBaseUrl, project?.id, membershipId]);

  const seasonKeyForLinks = seasonKeyForLinksFromProvider || resolvedSeasonId;

  // ── Breadcrumbs ──
  const breadcrumbs = useMemo(() => {
    const orgCrumb = org
      ? { label: org.name, onClick: () => navigate(`/organisations/${org.slug || org.id}`) }
      : { label: 'Federation' };
    const clubCrumb = isTeamRoute && club
      ? { label: club.name, onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${club.slug || club.id}`) }
      : null;
    const teamCrumb = project
      ? {
          label: project.name,
          onClick: () => navigate(
            isOrgRoutes
              ? isTeamRoute
                ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${project.slug || project.id}`
                : `/organisations/${orgSlugOrId}/projects/${project.slug || project.id}`
              : isTeamRoute
                ? `/${orgSlugOrId}/${clubSlugOrId}/${project.slug || project.id}`
                : `/organisations/${orgSlugOrId}/projects/${project.slug || project.id}`
          ),
        }
      : { label: 'Team' };
    const seasonLabel = season?.name || 'Season';
    return [
      { label: 'Dashboard', onClick: () => navigate('/dashboard') },
      orgCrumb,
      ...(clubCrumb ? [clubCrumb] : []),
      teamCrumb,
      { label: seasonLabel, onClick: () => { if (seasonKeyForLinks) navigate(`${seasonsBasePath}/${seasonKeyForLinks}`); } },
      { label: 'Member Profile' },
    ];
  }, [club, clubSlugOrId, isOrgRoutes, isTeamRoute, navigate, org, orgSlugOrId, project, season?.name, seasonKeyForLinks, seasonsBasePath]);

  // ── Save ──
  const save = useCallback(async (form: MemberMediaForm, videoVariants: AssetVariantsMap) => {
    if (!membership || !project || !userCanEditProject) return;
    setSaving(true);
    setSaveError(null);
    try {
      const nextMetadata = mergeAssetsIntoMetadata(membership?.metadata, form, videoVariants);
      const updated = await projectsApi.updateMember(project.id, membership.id, { metadata: nextMetadata } as any);
      setMembership(updated ? { ...membership, ...updated } : membership);
    } catch (e) {
      console.error(e);
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [apiBaseUrl, membership, project, userCanEditProject]);

  const isOwnProfile = !!(membership && user && String(membership?.user?.id ?? '') === String(user?.id ?? ''));

  return {
    membership, setMembership, membershipId, user,
    loading, error, org, project, club, season, resolvedSeasonId,
    isTeamRoute, orgSlugOrId, clubSlugOrId, seasonsBasePath, seasonKeyForLinks,
    clubBrand, teamBrand, batchBrandKits, isSuperAdmin, userCanEditProject, isPlayer, isSupporter, apiBaseUrl,
    activeTab, navigateToTab,
    activeContext, activatingContext, handleSetActiveContext,
    saving, saveError, save,
    breadcrumbs,
    isOwnProfile,
  };
}
