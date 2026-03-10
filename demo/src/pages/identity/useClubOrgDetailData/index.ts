/**
 * useClubOrgDetailData/index.ts
 * Orchestrator hook for ClubOrganisationDetailPage.
 *
 * All state, data-loading effects & computed values.
 */

import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getApiBaseUrl } from '../../../utils/apiBase';
import type { Organisation, Project, Period, OverviewMember } from '../clubOrgDetailHelpers';
import { useClubOrgHierarchy } from '../useClubOrgHierarchy';
import type { UseClubOrgDetailDataReturn } from './types';
import { useDerivedClubOrg } from './derived';
import { useClubOrgEffects } from './effects';
import { useClubOrgHandlers } from './handlers';

// Re-export types
export type { UseClubOrgDetailDataReturn } from './types';

export function useClubOrgDetailData(): UseClubOrgDetailDataReturn {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const apiBaseUrl = getApiBaseUrl();

  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(projectId || '').trim();

  // ── Slug resolution ──
  const [resolvedOrgSlug, setResolvedOrgSlug] = useState<string>('');

  // ── Core entities ──
  const [org, setOrg] = useState<Organisation | null>(null);
  const [club, setClub] = useState<Project | null>(null);
  const [activeContext, setActiveContextState] = useState<Record<string, unknown> | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState(false);
  const [isProjectDetailModalOpen, setIsProjectDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Overview tab ──
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewTeams, setOverviewTeams] = useState<Project[]>([]);
  const [overviewSeasons, setOverviewSeasons] = useState<Period[]>([]);
  const [overviewMembers, setOverviewMembers] = useState<OverviewMember[]>([]);
  const [overviewCounts, setOverviewCounts] = useState<{ teams: number; seasons: number; members: number } | null>(null);

  // ── Brand ──
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandProfileId, setBrandProfileId] = useState<string | null>(null);

  // ── Club switcher ──
  const [orgClubsForSwitcher, setOrgClubsForSwitcher] = useState<Project[]>([]);
  const [orgClubsForSwitcherLoading, setOrgClubsForSwitcherLoading] = useState(false);

  // ── Derived state ──
  const derived = useDerivedClubOrg({
    orgSlugOrId,
    resolvedOrgSlug,
    org,
    club,
    clubSlugOrId,
    orgClubsForSwitcher,
    locationSearch: location.search,
  });

  // ── Hierarchy tab (sub-hook) ──
  const hierarchy = useClubOrgHierarchy({
    activeTabFromUrl: derived.activeTabFromUrl,
    apiBaseUrl,
    orgSlugForDirectoryLists: derived.orgSlugForDirectoryLists,
    clubIdForDirectoryLists: derived.clubIdForDirectoryLists,
  });

  // ── Handlers ──
  const { makeTabHref, handleClubSwitch } = useClubOrgHandlers({
    org,
    orgSlugOrId,
    locationPathname: location.pathname,
    locationSearch: location.search,
    navigate,
  });

  // ── Effects ──
  useClubOrgEffects({
    orgSlugOrId,
    clubSlugOrId,
    effectiveOrgSlug: derived.effectiveOrgSlug,
    activeTabFromUrl: derived.activeTabFromUrl,
    orgSlugForDirectoryLists: derived.orgSlugForDirectoryLists,
    clubIdForDirectoryLists: derived.clubIdForDirectoryLists,
    org,
    club,
    resolvedOrgSlug,
    shouldResolveOrg: derived.shouldResolveOrg,
    shouldResolveClub: derived.shouldResolveClub,
    locationSearch: location.search,
    navigate,
    setActiveContextState,
    setResolvedOrgSlug,
    setOrg,
    setClub,
    setLoading,
    setError,
    setOverviewLoading,
    setOverviewError,
    setOverviewTeams,
    setOverviewSeasons,
    setOverviewMembers,
    setOverviewCounts,
    setBrandLogoUrl,
    setBrandProfileId,
    setOrgClubsForSwitcher,
    setOrgClubsForSwitcherLoading,
  });

  return {
    // Core
    org, club, loading, error, navigate, apiBaseUrl,
    activeContext, setActiveContextState, activatingContext, setActivatingContext,

    // Modals
    isProjectEditModalOpen, setIsProjectEditModalOpen,
    isProjectDetailModalOpen, setIsProjectDetailModalOpen,

    // Tabs
    activeTabFromUrl: derived.activeTabFromUrl, makeTabHref,

    // IDs / keys
    orgIdForDirectoryLists: derived.orgIdForDirectoryLists,
    orgSlugForDirectoryLists: derived.orgSlugForDirectoryLists,
    clubIdForDirectoryLists: derived.clubIdForDirectoryLists,
    orgKeyForRoutes: derived.orgKeyForRoutes,
    clubKeyForRoutes: derived.clubKeyForRoutes,
    backToOrgHref: derived.backToOrgHref,

    // Club switcher
    clubBreadcrumbOptions: derived.clubBreadcrumbOptions,
    orgClubsForSwitcherLoading, handleClubSwitch,

    // Overview
    overviewLoading, overviewError, overviewTeams, overviewSeasons, overviewMembers, overviewCounts,

    // Hierarchy
    ...hierarchy,

    // Brand
    brandLogoUrl, brandProfileId,
  };
}
