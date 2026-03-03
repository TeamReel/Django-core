import React, { useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { periodPathKey } from '../../utils/periodPath';

import { useSeasonContext, isSeasonPeriod } from '../../providers/SeasonProvider';
import { useSeasonFormState } from './useSeasonFormState';
import { useSeasonDataFetching } from './useSeasonDataFetching';
import { useSeasonDerived } from './useSeasonDerived';
import { useSeasonCrudActions } from './useSeasonCrudActions';
import { useSeasonBulkActions } from './useSeasonBulkActions';

// ─── Orchestrator ────────────────────────────────────────────────────────────

export function useSeasonDetailPageData() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // ── Shared season-hierarchy context ──
  const ctx = useSeasonContext();
  const {
    org, project, club,
    season: providerSeason,
    resolvedSeasonId,
    competitions: providerCompetitions,
    loading: providerLoading,
    error: providerError,
    competitionsLoading: providerCompetitionsLoading,
    isTeamRoute, orgSlugOrId,
    effectiveSeasonId, seasonsBasePath, seasonPathKey, memberDetailHref,
    clubBrand, teamBrand, batchBrandKits, brandLogoUrl, brandSponsorUrl,
    apiBaseUrl, userCanEditProject, userCanDeleteProject, isPlayer,
  } = ctx;

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

  // ── Navigation: active tab ──
  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = String(params.get('tab') || (isPlayer ? 'hierarchy' : 'overview')).trim().toLowerCase();
    const allowed = isPlayer
      ? new Set(['hierarchy', 'competitions', 'matches'])
      : new Set(['overview', 'content', 'hierarchy', 'competitions', 'matches', 'squad', 'team', 'media', 'transactions', 'assets', 'workflow']);
    return allowed.has(raw) ? raw : (isPlayer ? 'hierarchy' : 'overview');
  }, [location.search, isPlayer]);

  // ── Sub-hooks ──

  const formState = useSeasonFormState({
    providerCompetitions,
    providerLoading,
    providerError,
    providerCompetitionsLoading,
    providerSeason,
    projectId: project?.id,
  });

  const { season } = formState;

  // Tab navigation (needs season from formState)
  const navigateToTab = useCallback((tabId: string) => {
    const seasonKeyOrId = periodPathKey(season as any) || String(effectiveSeasonId || resolvedSeasonId || '').trim();
    if (!seasonKeyOrId) return;

    if (tabId === 'overview') {
      navigate(`${seasonsBasePath}/${seasonKeyOrId}`);
      return;
    }

    navigate(`${seasonsBasePath}/${seasonKeyOrId}?tab=${encodeURIComponent(tabId)}`);
  }, [season, effectiveSeasonId, resolvedSeasonId, seasonsBasePath, navigate]);

  const data = useSeasonDataFetching({
    apiBaseUrl,
    project,
    resolvedSeasonId,
    org,
    orgSlugOrId,
    activeTab,
  });

  const currentUserId = String((user as any)?.id || '').trim();

  const derived = useSeasonDerived({
    org, project, club, season, isPlayer,
    members: data.members,
    matches: data.matches,
    teamRoster: data.teamRoster,
    opponentClubNames: data.opponentClubNames,
    currentUserId,
  });

  const crudActions = useSeasonCrudActions({
    apiBaseUrl, org, project, season,
    resolvedSeasonId, effectiveSeasonId, seasonsBasePath, navigate,
    setSeason: formState.setSeason,
    setCompetitions: formState.setCompetitions,
    setMatches: data.setMatches,
    setMembers: data.setMembers,
    setMembersReloadToken: data.setMembersReloadToken,
    setActivatingContext: data.setActivatingContext,
    setActiveContextState: data.setActiveContextState,
  });

  const bulkActions = useSeasonBulkActions({
    apiBaseUrl, org, project, season, resolvedSeasonId, activeTab,
    setCompetitions: formState.setCompetitions,
    setCompetitionsLoading: formState.setCompetitionsLoading,
    setMatches: data.setMatches,
    setMatchesLoading: data.setMatchesLoading,
    setMembersReloadToken: data.setMembersReloadToken,
    setTeamRosterReloadToken: data.setTeamRosterReloadToken,
    setBulkSubmitting: data.setBulkSubmitting,
    getBestRoleForUser: derived.getBestRoleForUser,
  });

  // ── Merged return (preserves original public API) ──

  return {
    // Navigation
    navigate,
    user,

    // Provider data
    org, project, club,
    resolvedSeasonId, effectiveSeasonId,
    seasonsBasePath, seasonPathKey, isTeamRoute, orgSlugOrId,
    memberDetailHref, clubBrand, teamBrand, batchBrandKits,
    brandLogoUrl, brandSponsorUrl, apiBaseUrl,
    userCanEditProject, userCanDeleteProject, isPlayer,

    // Form state (provider-synced + modals + toasts)
    ...formState,

    // Data fetching state
    ...data,

    // Derived computations
    ...derived,

    // Actions
    ...crudActions,
    ...bulkActions,

    // Navigation helpers
    activeTab,
    navigateToTab,

    // Helpers for modals
    isSeasonPeriod,
    organisationSportId: org?.sport?.id ? String(org.sport.id) : null,
  };
}
