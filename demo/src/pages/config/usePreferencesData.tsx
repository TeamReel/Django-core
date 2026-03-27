/**
 * PreferencesPage — Orchestrator hook
 *
 * Composes sub-hooks for preferences, channel prefs, audit events,
 * profile modals, and cascading entity selection.
 */
import { useMemo } from 'react';
import { useTheme } from '@django-core/theme-system';
import { useAuth } from '@django-core/auth-ui';

import type {
  UserPreferences,
  I18nEffectivePreferences,
  NotificationPreference,
  EventTypeGroup,
  PreferencesDataReturn,
} from './preferencesTypes';
import { useCascadingEntitySelection } from './useCascadingEntitySelection';
import { usePreferencesState } from './usePreferencesState';
import { useChannelPreferences } from './useChannelPreferences';
import { useAuditEvents } from './useAuditEvents';
import { useProfileModals } from './useProfileModals';

export type { UserPreferences, I18nEffectivePreferences, NotificationPreference, EventTypeGroup, PreferencesDataReturn };

/* ------------------------------------------------------------------ */
/*  Hook implementation                                                */
/* ------------------------------------------------------------------ */

export function usePreferencesData(): PreferencesDataReturn {
  const { resolvedMode } = useTheme();
  const { user, setUser } = useAuth();

  /* --- Sub-hooks --- */
  const entities = useCascadingEntitySelection();
  const prefs = usePreferencesState();
  const channels = useChannelPreferences();
  const audit = useAuditEvents(prefs.activeTab);
  const modals = useProfileModals();

  /* --- Derived label maps (depend on entities + user) --- */
  const organisationLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    const userRec = user as Record<string, unknown> | null;
    const userOrgs: Record<string, unknown>[] = Array.isArray(userRec?.organisations) ? userRec!.organisations as Record<string, unknown>[] : [];
    for (const o of [...entities.organisations, ...userOrgs]) {
      const id = String((o as Record<string, unknown>)?.id || '').trim();
      const slug = String((o as Record<string, unknown>)?.slug || '').trim();
      const label = String((o as Record<string, unknown>)?.name || (o as Record<string, unknown>)?.title || (o as Record<string, unknown>)?.label || (o as Record<string, unknown>)?.slug || (o as Record<string, unknown>)?.id || '').trim();
      if (label) { if (id) map.set(id, label); if (slug) map.set(slug, label); }
    }
    return map;
  }, [entities.organisations, user]);

  const projectLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    const userRec = user as Record<string, unknown> | null;
    const userProjects: Record<string, unknown>[] = Array.isArray(userRec?.projects) ? userRec!.projects as Record<string, unknown>[] : [];
    for (const p of [...entities.clubs, ...entities.teams, ...userProjects]) {
      const id = String((p as Record<string, unknown>)?.id || '').trim();
      const slug = String((p as Record<string, unknown>)?.slug || '').trim();
      const key = String((p as Record<string, unknown>)?.key || '').trim();
      const label = String((p as Record<string, unknown>)?.name || (p as Record<string, unknown>)?.title || (p as Record<string, unknown>)?.label || (p as Record<string, unknown>)?.slug || (p as Record<string, unknown>)?.id || '').trim();
      if (label) { if (id) map.set(id, label); if (slug) map.set(slug, label); if (key) map.set(key, label); }
    }
    return map;
  }, [entities.clubs, entities.teams, user]);

  /* --- Compose return --- */
  return {
    resolvedMode,
    user,
    setUser,

    ...prefs,

    // Cascading entity selection
    activeContext: entities.activeContext,
    activeContextLoading: entities.activeContextLoading,
    activeContextError: entities.activeContextError,
    savingContext: entities.savingContext,
    selectedOrgId: entities.selectedOrgId, setSelectedOrgId: entities.setSelectedOrgId,
    selectedClubId: entities.selectedClubId, setSelectedClubId: entities.setSelectedClubId,
    selectedTeamId: entities.selectedTeamId, setSelectedTeamId: entities.setSelectedTeamId,
    selectedSeasonId: entities.selectedSeasonId, setSelectedSeasonId: entities.setSelectedSeasonId,
    selectedCompetitionId: entities.selectedCompetitionId, setSelectedCompetitionId: entities.setSelectedCompetitionId,
    selectedMatchId: entities.selectedMatchId, setSelectedMatchId: entities.setSelectedMatchId,
    hasEditedContext: entities.hasEditedContext, setHasEditedContext: entities.setHasEditedContext,
    organisations: entities.organisations,
    clubs: entities.clubs,
    teams: entities.teams,
    seasons: entities.seasons,
    competitions: entities.competitions,
    matches: entities.matches,
    loadingOrgs: entities.loadingOrgs,
    loadingClubs: entities.loadingClubs,
    loadingTeams: entities.loadingTeams,
    loadingSeasons: entities.loadingSeasons,
    loadingCompetitions: entities.loadingCompetitions,
    loadingMatches: entities.loadingMatches,
    applyActiveContextSelection: entities.applyActiveContextSelection,

    ...channels,
    ...audit,
    ...modals,

    organisationLabelByKey, projectLabelByKey,
  };
}
