/**
 * SeasonProvider — shared context for the Season hierarchy pages.
 *
 * Provides org / club / project / season / competitions + brand profiles +
 * permissions so that SeasonDetailPage, CompetitionDetailPage,
 * MatchDetailPage and MemberDetailPage no longer duplicate ~150 lines of
 * identical fetch-and-resolve logic each.
 *
 * Usage:
 *   <SeasonProvider>
 *     <ProjectSeasonDetailPage />
 *   </SeasonProvider>
 *
 * Each page reads shared data via  `useSeasonContext()`.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type PropsWithChildren,
} from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useUserRole } from '../components/PermissionGuards';
import { getApiBaseUrl } from '../utils/apiBase';
import { fetchAllPages } from '../utils/fetchAllPages';
import { canEditProject, canDeleteProject } from '../utils/permissions';
import { looksLikeUuid, periodPathKey } from '../utils/periodPath';
import {
  useBrandProfile,
  getAssetUrl,
  KIT_ROLES,
} from '../hooks/useBrandProfile';
import type {
  Period,
  SeasonProject,
  SeasonOrganisation,
} from '../types/season';

// ── Helpers (previously copy-pasted per page) ──────────────────────────

const getPeriodType = (p: any): string => {
  const t = p?.type ?? p?.data?.type ?? p?.metadata?.type;
  return String(t || '').toLowerCase();
};

const getPeriodParentId = (p: any): string => {
  const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
  return parentId ? String(parentId) : '';
};

/**
 * A root Period with no parent is a Season.
 * Guard against mis-configured root competitions.
 */
export const isSeasonPeriod = (p: any): boolean => {
  const parentId = getPeriodParentId(p);
  if (parentId) return false;

  const type = getPeriodType(p);
  if (type === 'season') return true;
  if (
    ['competition', 'league', 'cup', 'friendly', 'tournament', 'round'].includes(type)
  )
    return false;
  return true;
};

/** Unwrap a generic API envelope `{ status, data }`. */
const unwrap = <T,>(raw: any): T => {
  const candidate = raw?.data?.data;
  if (candidate && typeof candidate === 'object' && candidate.id) return candidate as T;
  return (raw?.data ?? raw) as T;
};

// ── Public context type ────────────────────────────────────────────────

/** Return type of `useBrandProfile` so consuming pages can use it without importing the hook. */
export type BrandProfile = ReturnType<typeof useBrandProfile>;

export interface SeasonContextValue {
  // Core entities
  org: SeasonOrganisation | null;
  project: SeasonProject | null;
  club: SeasonProject | null;
  season: Period | null;
  resolvedSeasonId: string;
  competitions: Period[];
  seasonsForSwitcher: Period[];

  // Loading / error
  loading: boolean;
  error: string | null;
  competitionsLoading: boolean;

  // Route-derived flags
  isTeamRoute: boolean;
  isOrgRoute: boolean;
  orgSlugOrId: string;
  clubSlugOrId: string;
  projectSlugOrId: string;
  effectiveSeasonId: string;

  // Navigation helpers
  seasonsBasePath: string;
  projectDetailPath: string;
  seasonPathKey: string;
  memberDetailHref: (membershipId: string) => string;

  // Brand profiles (club + team level)
  clubBrand: BrandProfile;
  teamBrand: BrandProfile;

  /** Pre-built kit URLs { [kitRoleId]: url | null } for batch modals. */
  batchBrandKits: Record<string, string | null>;
  /** Club logo URL (or null). */
  brandLogoUrl: string | null;
  /** Sponsor logo URL (or null). */
  brandSponsorUrl: string | null;

  // Permissions
  isSuperAdmin: boolean;
  orgForPermissions: any;
  permissionContext: { currentOrganisation: any; isSuperAdmin: boolean };
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;

  // Player-mode flag
  isPlayer: boolean;

  // API helpers
  apiBaseUrl: string;

  // Actions
  /** Force a full re-fetch of season + competitions. */
  reloadSeason: () => void;
}

// ── React Context ──────────────────────────────────────────────────────

const SeasonContext = createContext<SeasonContextValue | null>(null);

/**
 * Hook consumed by season-hierarchy pages.
 * Throws when used outside of `<SeasonProvider>`.
 */
export function useSeasonContext(): SeasonContextValue {
  const ctx = useContext(SeasonContext);
  if (!ctx) {
    throw new Error(
      'useSeasonContext() must be used within a <SeasonProvider>. ' +
        'Wrap your page component with <SeasonProvider>…</SeasonProvider>.'
    );
  }
  return ctx;
}

// ── Provider component ─────────────────────────────────────────────────

export function SeasonProvider({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { context } = useContextSwitcher();
  const { isPlayer } = useUserRole();
  const apiBaseUrl = getApiBaseUrl();

  // ── Route params ───────────────────────────────────────────────────
  const params = useParams<{
    orgId: string;
    projectId: string;
    seasonId: string;
    clubId?: string;
    competitionId?: string;
    matchId?: string;
  }>();

  const orgSlugOrId = String(params.orgId || '').trim();
  const projectSlugOrId = String(params.projectId || '').trim();
  const clubSlugOrId = String(params.clubId || '').trim();
  const effectiveSeasonId = String(params.seasonId || '').trim();
  const isTeamRoute = Boolean(clubSlugOrId);
  const isOrgRoute = location.pathname.startsWith('/organisations/');

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
      if (!orgSlugOrId || !projectSlugOrId || !effectiveSeasonId) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Fetch org + project + club in parallel
        const [orgRes, projectRes, clubRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/`, {
            credentials: 'include',
          }),
          fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(projectSlugOrId)}/`,
            { credentials: 'include' },
          ),
          isTeamRoute
            ? fetch(
                `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
                { credentials: 'include' },
              )
            : Promise.resolve(null),
        ]);

        if (!orgRes.ok) throw new Error('Failed to load organisation');
        if (!projectRes.ok) throw new Error('Failed to load project');

        const orgJson = unwrap<SeasonOrganisation>(await orgRes.json());
        const projectJson = unwrap<SeasonProject>(await projectRes.json());
        setOrg(orgJson);
        setProject(projectJson);

        if (isTeamRoute && clubRes && clubRes.ok) {
          try {
            setClub(unwrap<SeasonProject>(await clubRes.json()));
          } catch {
            // ignore parse error
          }
        } else if (!isTeamRoute) {
          setClub(null);
        }

        // 2. Fetch root periods for season switcher (cached)
        const rootPeriodsUrl = `${apiBaseUrl}/api/v1/periods/?project_id=${encodeURIComponent(
          String(projectJson.id),
        )}&parent_id=null&page_size=500`;
        const rootPeriods = await fetchAllPages<Period>(
          rootPeriodsUrl,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: `periods:root:${projectJson.id}` },
        );

        const seasonOptions = rootPeriods.filter(isSeasonPeriod);
        setSeasonsForSwitcher(seasonOptions);

        // 3. Resolve season UUID from URL param (UUID or slugified name)
        const isUuidParam = looksLikeUuid(effectiveSeasonId);
        const seasonFromList = isUuidParam
          ? seasonOptions.find((p) => String(p.id) === effectiveSeasonId)
          : seasonOptions.find((p) => periodPathKey(p) === effectiveSeasonId);

        const seasonUuid = String(
          seasonFromList?.id || (isUuidParam ? effectiveSeasonId : ''),
        ).trim();
        if (!seasonUuid) throw new Error('Season not found');
        setResolvedSeasonId(seasonUuid);

        // 4. Fetch season detail
        const seasonRes = await fetch(
          `${apiBaseUrl}/api/v1/periods/${encodeURIComponent(seasonUuid)}/`,
          { credentials: 'include' },
        );
        if (!seasonRes.ok) throw new Error('Failed to load season');
        const seasonJson = unwrap<Period>(await seasonRes.json());
        setSeason(seasonJson);

        // 5. Canonicalize URL to slug when possible
        const desiredKey = periodPathKey(seasonJson);
        if (desiredKey && desiredKey !== effectiveSeasonId) {
          // Build the canonical path based on the current pathname structure.
          // We only replace the season segment — child pages append their own
          // segments which we must preserve.
          const seasonSegmentIdx = location.pathname.indexOf(effectiveSeasonId);
          if (seasonSegmentIdx !== -1) {
            const before = location.pathname.slice(0, seasonSegmentIdx);
            const after = location.pathname.slice(
              seasonSegmentIdx + effectiveSeasonId.length,
            );
            const canonical = `${before}${desiredKey}${after}`;
            navigate(`${canonical}${location.search}`, { replace: true });
            // Don't proceed — the navigation will re-trigger this effect.
            return;
          }
        }

        // 6. Load competitions (direct children of this season)
        setCompetitionsLoading(true);
        try {
          const competitionsUrl = `${apiBaseUrl}/api/v1/periods/?parent_id=${encodeURIComponent(
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
        setError(e instanceof Error ? e.message : 'Failed to load season');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [
    apiBaseUrl,
    orgSlugOrId,
    projectSlugOrId,
    effectiveSeasonId,
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

  /** Pre-built kit URLs for batch modals (team takes priority over club). */
  const batchBrandKits = useMemo(() => {
    const kits: Record<string, string | null> = {};
    for (const role of KIT_ROLES) {
      const teamAsset = isTeamRoute
        ? teamBrand.getAsset?.(`kit_${role.id}_combined`) ||
          teamBrand.getAsset?.(`kit_${role.id}`)
        : null;
      const clubAsset =
        clubBrand.getAsset?.(`kit_${role.id}_combined`) ||
        clubBrand.getAsset?.(`kit_${role.id}`);
      const asset = teamAsset || clubAsset;
      kits[role.id] = asset ? getAssetUrl(asset.url) : null;
    }
    return kits;
  }, [clubBrand, teamBrand, isTeamRoute]);

  const brandLogoUrl = useMemo(
    () =>
      clubBrand.getAsset?.('logo_upload')
        ? getAssetUrl(clubBrand.getAsset('logo_upload')!.url)
        : null,
    [clubBrand],
  );

  const brandSponsorUrl = useMemo(
    () =>
      clubBrand.getAsset?.('sponsor_logo_upload')
        ? getAssetUrl(clubBrand.getAsset('sponsor_logo_upload')!.url)
        : null,
    [clubBrand],
  );

  // ── Permissions ────────────────────────────────────────────────────
  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin =
    Boolean((user as any)?.is_superuser) ||
    Boolean((user as any)?.is_staff) ||
    userRole === 'superadmin' ||
    userRole === 'super admin';

  const orgForPermissions = useMemo(() => {
    const contextOrg = context?.organisation as any;
    const orgIdMatches = (candidate: any) => {
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
    const projectOrg = (project as any)?.organisation;
    if (projectOrg?.user_role) return projectOrg;
    if ((org as any)?.user_role) return org;
    if (orgIdMatches(contextOrg)) return contextOrg;
    return projectOrg || org || contextOrg || null;
  }, [context?.organisation, org, orgSlugOrId, project]);

  const permissionContext = useMemo(
    () => ({ currentOrganisation: orgForPermissions as any, isSuperAdmin }),
    [orgForPermissions, isSuperAdmin],
  );

  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

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
      return `${seasonsBasePath}/${seasonPathKey}/${encodeURIComponent(mid)}`;
    },
    [isTeamRoute, seasonsBasePath, seasonPathKey],
  );

  // ── Assemble context value ─────────────────────────────────────────
  const value = useMemo<SeasonContextValue>(
    () => ({
      // Entities
      org,
      project,
      club,
      season,
      resolvedSeasonId,
      competitions,
      seasonsForSwitcher,

      // Loading
      loading,
      error,
      competitionsLoading,

      // Route
      isTeamRoute,
      isOrgRoute,
      orgSlugOrId,
      clubSlugOrId,
      projectSlugOrId,
      effectiveSeasonId,

      // Navigation
      seasonsBasePath,
      projectDetailPath,
      seasonPathKey,
      memberDetailHref,

      // Brand
      clubBrand,
      teamBrand,
      batchBrandKits,
      brandLogoUrl,
      brandSponsorUrl,

      // Permissions
      isSuperAdmin,
      orgForPermissions,
      permissionContext,
      userCanEditProject,
      userCanDeleteProject,

      // Misc
      isPlayer,
      apiBaseUrl,
      reloadSeason,
    }),
    [
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
      orgForPermissions,
      permissionContext,
      userCanEditProject,
      userCanDeleteProject,
      isPlayer,
      apiBaseUrl,
      reloadSeason,
    ],
  );

  return (
    <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>
  );
}

export default SeasonProvider;
