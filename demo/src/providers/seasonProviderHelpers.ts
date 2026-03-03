/**
 * Shared helpers, type aliases and the `SeasonContextValue` interface used by
 * SeasonProvider and its consuming pages.
 *
 * Extracted so the provider file stays focused on React wiring.
 */
import type { useBrandProfile } from '../hooks/useBrandProfile';
import type { Period, SeasonProject, SeasonOrganisation } from '../types/season';

export type { Period, SeasonProject, SeasonOrganisation } from '../types/season';

// ── Helpers (previously copy-pasted per page) ──────────────────────────

export const getPeriodType = (p: any): string => {
  const t = p?.type ?? p?.data?.type ?? p?.metadata?.type;
  return String(t || '').toLowerCase();
};

export const getPeriodParentId = (p: any): string => {
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
export const unwrap = <T,>(raw: any): T => {
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
