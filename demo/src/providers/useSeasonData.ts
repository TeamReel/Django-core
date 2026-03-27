/**
 * useSeasonData — all data fetching, state, brand profiles,
 * permissions and navigation helpers for SeasonProvider.
 *
 * Returns the complete SeasonContextValue so the provider
 * stays as a thin context wrapper.
 */

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { logger } from '@/utils/logger';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useUserRole } from '../components/PermissionGuards';
import { getApiBaseUrl } from '../utils/apiBase';
import { getApiV1BaseUrl } from '../utils/apiFetch';
import { api } from '@/api';
import { fetchAllPages } from '../utils/fetchAllPages';
import { canEditProject, canDeleteProject, type PermissionContext } from '../utils/permissions';
import { looksLikeUuid, periodPathKey } from '../utils/periodPath';
import {
  useBrandProfile,
  getAssetUrl,
  KIT_ROLES,
} from '../hooks/useBrandProfile';
import {
  isSeasonPeriod,
  unwrap,
  type SeasonContextValue,
} from './seasonProviderHelpers';
import { getActiveContext, setActiveContext } from '../utils/activeContext';
import type {
  Period,
  SeasonProject,
  SeasonOrganisation,
} from '../types/season';
import type { Organisation } from '../types';

export function useSeasonData(): SeasonContextValue {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { context } = useContextSwitcher();
  const { isPlayer, isSupporter } = useUserRole();
  const apiBaseUrl = getApiBaseUrl();
  const apiV1 = getApiV1BaseUrl();

  // ── Route params ───────────────────────────────────────────────────
  const params = useParams<{
    orgId: string;
    projectId: string;
    seasonId?: string;
    clubId?: string;
    competitionId?: string;
    matchId?: string;
  }>();

  const orgSlugOrId = String(params.orgId || '').trim();
  const projectSlugOrId = String(params.projectId || '').trim();
  const clubSlugOrId = String(params.clubId || '').trim();
  const seasonIdFromUrl = String(params.seasonId || '').trim();
  const isTeamRoute = Boolean(clubSlugOrId);
  const isOrgRoute = location.pathname.startsWith('/organisations/');

  // F24: Read ?season= query param as hint (for deep-links & redirects)
  const searchParams = new URLSearchParams(location.search);
  const seasonHint = searchParams.get('season') || '';

  // F24: Internal season state for 3-seg hub (no season in URL)
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');

  // Effective season: URL param > internal state > query hint
  const effectiveSeasonId = seasonIdFromUrl || selectedSeasonId || seasonHint;

  // ── Core state ─────────────────────────────────────────────────────
  const [org, setOrg] = useState<SeasonOrganisation | null>(null);
  const [project, setProject] = useState<SeasonProject | null>(null);
  const [club, setClub] = useState<SeasonProject | null>(null);
  const [season, setSeason] = useState<Period | null>(null);
  const [resolvedSeasonId, setResolvedSeasonId] = useState<string>('');
  const [seasonsForSwitcher, setSeasonsForSwitcher] = useState<Period[]>([]);
  const [competitions, setCompetitions] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [competitionsLoading, setCompetitionsLoading] = useState(false);

  /** Bump to force a re-fetch. */
  const [reloadToken, setReloadToken] = useState(0);
  const reloadSeason = useCallback(() => setReloadToken((t) => t + 1), []);

  // ── Main data fetch ────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      if (!orgSlugOrId || !projectSlugOrId) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Fetch org + project + club in parallel
        const [orgJson, projectJson, clubJson] = await Promise.all([
          api.get<SeasonOrganisation>(`/organisations/${encodeURIComponent(orgSlugOrId)}/`),
          api.get<SeasonProject>(
            `/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(projectSlugOrId)}/`,
          ),
          isTeamRoute
            ? api.get<SeasonProject>(
                `/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
              ).catch(() => null)
            : Promise.resolve(null),
        ]);

        setOrg(orgJson);
        setProject(projectJson);

        if (isTeamRoute && clubJson) {
          setClub(clubJson);
        } else if (!isTeamRoute) {
          setClub(null);
        }

        // 2. Fetch root periods for season switcher (cached)
        const rootPeriodsUrl = `${apiV1}/periods/?project_id=${encodeURIComponent(
          String(projectJson.id),
        )}&parent_id=null&page_size=500`;
        const rootPeriods = await fetchAllPages<Period>(
          rootPeriodsUrl,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: `periods:root:${projectJson.id}` },
        );

        const seasonOptions = rootPeriods.filter(isSeasonPeriod);
        setSeasonsForSwitcher(seasonOptions);

        // 3. Resolve season — from URL, hint, active context, or auto-pick most recent
        let resolvedSeason: Period | undefined;

        if (effectiveSeasonId) {
          // Explicit season (from URL param, internal state, or ?season= hint)
          const isUuidParam = looksLikeUuid(effectiveSeasonId);
          resolvedSeason = isUuidParam
            ? seasonOptions.find((p) => String(p.id) === effectiveSeasonId)
            : seasonOptions.find((p) => periodPathKey(p) === effectiveSeasonId);
        }

        // H1: Try active context season if no explicit season resolved
        if (!resolvedSeason && seasonOptions.length > 0) {
          try {
            const ctx = await getActiveContext();
            const ctxSeasonId = String(ctx?.season?.id || '').trim();
            if (ctxSeasonId) {
              resolvedSeason = seasonOptions.find((p) => String(p.id) === ctxSeasonId);
            }
          } catch {
            // Active context unavailable — fall through to default
          }
        }

        // Fallback: pick most recent season (first in list)
        if (!resolvedSeason && seasonOptions.length > 0) {
          resolvedSeason = seasonOptions[0];
        }

        if (!resolvedSeason) {
          // No seasons at all — will render HubTeamOnlyView
          setLoading(false);
          return;
        }

        const seasonUuid = String(resolvedSeason.id).trim();
        setResolvedSeasonId(seasonUuid);

        // F24: Update internal state for 3-seg hub (so subsequent fetches use it)
        if (!seasonIdFromUrl) {
          setSelectedSeasonId(periodPathKey(resolvedSeason) || seasonUuid);
        }

        // 4. Fetch season detail
        const seasonJson = await api.get<Period>(`/periods/${encodeURIComponent(seasonUuid)}/`);
        setSeason(seasonJson);

        // 5. Canonicalize URL to slug when possible (only for 4-seg URLs with season in path)
        if (seasonIdFromUrl) {
          const desiredKey = periodPathKey(seasonJson);
          if (desiredKey && desiredKey !== seasonIdFromUrl) {
            const seasonSegmentIdx = location.pathname.indexOf(seasonIdFromUrl);
            if (seasonSegmentIdx !== -1) {
              const before = location.pathname.slice(0, seasonSegmentIdx);
              const after = location.pathname.slice(seasonSegmentIdx + seasonIdFromUrl.length);
              const canonical = `${before}${desiredKey}${after}`;
              navigate(`${canonical}${location.search}`, { replace: true });
              return;
            }
          }
        }

        // F24: Clean up ?season= query param after processing (3-seg hub only)
        if (!seasonIdFromUrl && seasonHint) {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('season');
          navigate(`${cleanUrl.pathname}${cleanUrl.search}`, { replace: true });
        }

        // H1: Update active context with resolved season (fire-and-forget)
        if (seasonUuid) {
          setActiveContext('season', seasonUuid).catch(() => {/* ignore */});
        }

        // 6. Load competitions (direct children of this season)
        setCompetitionsLoading(true);
        try {
          const competitionsUrl = `${apiV1}/periods/?parent_id=${encodeURIComponent(
            seasonUuid,
          )}&page_size=500`;
          const competitionResults = await fetchAllPages<Period>(
            competitionsUrl,
            { credentials: 'include' },
            { ttlMs: 60_000, cacheKey: `periods:children:${seasonUuid}` },
          );
          setCompetitions(competitionResults);
        } finally {
          setCompetitionsLoading(false);
        }
      } catch (e) {
        logger.error('Failed to load season', e);
        setError(e instanceof Error ? e.message : 'Failed to load season');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [
    apiBaseUrl,
    apiV1,
    orgSlugOrId,
    projectSlugOrId,
    effectiveSeasonId,
    seasonIdFromUrl,
    seasonHint,
    isTeamRoute,
    clubSlugOrId,
    reloadToken,
    // NOTE: navigate & location intentionally omitted to prevent
    // fetch loops caused by slug-canonicalization.
  ]);

  // ── Brand profiles ─────────────────────────────────────────────────
  const clubProjectId = isTeamRoute ? club?.id : project?.id;
  const clubBrand = useBrandProfile({
    projectId: clubProjectId ? String(clubProjectId) : undefined,
    organisationId: String(org?.id || ''),
    autoFetch: !!clubProjectId,
  });

  const teamProjectId = isTeamRoute ? project?.id : null;
  const teamBrand = useBrandProfile({
    projectId: teamProjectId ? String(teamProjectId) : undefined,
    organisationId: String(org?.id || ''),
    autoFetch: !!teamProjectId,
  });

  const batchBrandKits = useMemo(() => {
    const kits: Record<string, string | null> = {};
    for (const role of KIT_ROLES) {
      const teamAsset = isTeamRoute
        ? teamBrand.getAsset?.(`kit_${role.id}_combined`) ||
          teamBrand.getAsset?.(`kit_${role.id}`) ||
          teamBrand.getAsset?.(`kit_${role.id}_upload`)
        : null;
      const clubAsset =
        clubBrand.getAsset?.(`kit_${role.id}_combined`) ||
        clubBrand.getAsset?.(`kit_${role.id}`) ||
        clubBrand.getAsset?.(`kit_${role.id}_upload`);
      const asset = teamAsset || clubAsset;
      kits[role.id] = asset ? getAssetUrl(asset.url) : null;
    }
    return kits;
  }, [clubBrand, teamBrand, isTeamRoute]);

  const brandLogoUrl = useMemo(() => {
    const clubAsset = clubBrand.getAsset?.('logo_upload');
    if (clubAsset?.url) return getAssetUrl(clubAsset.url);
    const teamAsset = teamBrand.getAsset?.('logo_upload');
    return teamAsset?.url ? getAssetUrl(teamAsset.url) : null;
  }, [clubBrand, teamBrand]);

  const brandSponsorUrl = useMemo(() => {
    const clubAsset = clubBrand.getAsset?.('sponsor_logo_upload');
    if (clubAsset?.url) return getAssetUrl(clubAsset.url);
    const teamAsset = teamBrand.getAsset?.('sponsor_logo_upload');
    return teamAsset?.url ? getAssetUrl(teamAsset.url) : null;
  }, [clubBrand, teamBrand]);

  // ── Permissions ────────────────────────────────────────────────────
  const userRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin =
    Boolean(user?.is_superuser) ||
    Boolean(user?.is_staff) ||
    userRole === 'superadmin' ||
    userRole === 'super admin';

  const orgForPermissions = useMemo(() => {
    const contextOrg = context?.organisation as unknown as Organisation | null;
    const orgIdMatches = (candidate: { id?: unknown; slug?: unknown } | null | undefined) => {
      if (!candidate) return false;
      const cid = String(candidate.id || '').trim();
      const cslug = String(candidate.slug || '').trim();
      const oid = String(org?.id || '').trim();
      const oslug = String(org?.slug || '').trim();
      const route = orgSlugOrId;
      return (
        (cid && oid && cid === oid) ||
        (cslug && oslug && cslug === oslug) ||
        (cid && route && cid === route) ||
        (cslug && route && cslug === route)
      );
    };

    if (orgIdMatches(contextOrg) && contextOrg?.user_role) return contextOrg;
    const projectOrg = project?.organisation;
    if (projectOrg && typeof projectOrg === 'object' && 'user_role' in projectOrg && projectOrg.user_role) return projectOrg as unknown as Organisation;
    if (org?.user_role) return org;
    if (orgIdMatches(contextOrg)) return contextOrg;
    return (projectOrg as unknown as Organisation) || org || contextOrg || null;
  }, [context?.organisation, org, orgSlugOrId, project]);

  const permissionContext = useMemo(
    () => ({ currentOrganisation: orgForPermissions, isSuperAdmin }),
    [orgForPermissions, isSuperAdmin],
  );

  const userCanEditProject = canEditProject(permissionContext as PermissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext as PermissionContext);

  // ── Navigation helpers ─────────────────────────────────────────────
  const seasonsBasePath = isTeamRoute
    ? `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}`
    : `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons`;

  const projectDetailPath = isTeamRoute
    ? `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}`
    : `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}`;

  const seasonPathKey =
    periodPathKey(season) || String(effectiveSeasonId || resolvedSeasonId).trim();

  const memberDetailHref = useCallback(
    (membershipId: string): string => {
      const mid = String(membershipId || '').trim();
      if (!mid || !isTeamRoute || !seasonPathKey) return '';
      return `${seasonsBasePath}/${seasonPathKey}/members/${encodeURIComponent(mid)}`;
    },
    [isTeamRoute, seasonsBasePath, seasonPathKey],
  );

  // ── Assemble context value ─────────────────────────────────────────
  return useMemo<SeasonContextValue>(
    () => ({
      org,
      project,
      club,
      season,
      resolvedSeasonId,
      competitions,
      seasonsForSwitcher,
      loading,
      error,
      competitionsLoading,
      isTeamRoute,
      isOrgRoute,
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
      orgForPermissions: orgForPermissions as Organisation | null,
      permissionContext: permissionContext as PermissionContext,
      userCanEditProject,
      userCanDeleteProject,
      isPlayer,
      isSupporter,
      apiBaseUrl,
      reloadSeason,
      setSelectedSeasonId,
    }),
    [
      org, project, club, season, resolvedSeasonId, competitions, seasonsForSwitcher,
      loading, error, competitionsLoading,
      isTeamRoute, isOrgRoute, orgSlugOrId, clubSlugOrId, projectSlugOrId, effectiveSeasonId,
      seasonsBasePath, projectDetailPath, seasonPathKey, memberDetailHref,
      clubBrand, teamBrand, batchBrandKits, brandLogoUrl, brandSponsorUrl,
      isSuperAdmin, orgForPermissions, permissionContext, userCanEditProject, userCanDeleteProject,
      isPlayer, isSupporter, apiBaseUrl, reloadSeason, setSelectedSeasonId,
    ],
  );
}
