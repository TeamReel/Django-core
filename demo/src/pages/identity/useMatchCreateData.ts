import type { MatchCreateModalProps } from './matchCreateTypes';
import { getApiBaseUrl } from '../../utils/apiBase';
import { controlStyle } from './matchCreateHelpers';
import { useMatchFormState } from './useMatchFormState';
import { useMatchSelections } from './useMatchSelections';
import { useMatchDerived } from './useMatchDerived';
import { useMatchSubmit } from './useMatchSubmit';

// Re-export helpers used by other modules
export { getParentProjectId, getProjectIdentity } from './matchCreateHelpers';

// ─── Props ───────────────────────────────────────────────────────────────────

type UseMatchCreateDataProps = Pick<
  MatchCreateModalProps,
  | 'opened'
  | 'onClose'
  | 'onCreate'
  | 'mode'
  | 'apiBaseUrl'
  | 'organisations'
  | 'clubs'
  | 'teams'
  | 'initialOrganisationId'
  | 'initialClubId'
  | 'initialTeamId'
  | 'initialSeasonId'
  | 'initialCompetitionId'
  | 'initialOpponentOrganisationId'
  | 'initialOpponentClubId'
  | 'initialOpponentTeamId'
  | 'initialTitle'
  | 'initialMatchDate'
  | 'initialMatchTime'
  | 'initialVenue'
  | 'initialLocation'
  | 'initialDescription'
  | 'submitText'
>;

// ─── Orchestrator Hook ───────────────────────────────────────────────────────

export function useMatchCreateData({
  opened,
  onClose,
  onCreate,
  mode = 'default',
  apiBaseUrl: apiBaseUrlProp,
  organisations = [],
  clubs = [],
  teams = [],
  initialOrganisationId = '',
  initialClubId = '',
  initialTeamId = '',
  initialSeasonId = '',
  initialCompetitionId = '',
  initialOpponentOrganisationId = '',
  initialOpponentClubId = '',
  initialOpponentTeamId = '',
  initialTitle = '',
  initialMatchDate = '',
  initialMatchTime = '',
  initialVenue = 'Home',
  initialLocation = '',
  initialDescription = '',
  submitText,
}: UseMatchCreateDataProps) {
  const apiBaseUrl = apiBaseUrlProp || getApiBaseUrl();
  const isSeasonDetailMode = mode === 'season-detail';
  const isTeamContextMode = mode === 'team-context';
  const requireOpponent = !isSeasonDetailMode;

  // 1. Form state (all useState + reset)
  const form = useMatchFormState({
    opened, organisations, clubs, teams,
    initialOrganisationId, initialClubId, initialTeamId,
    initialSeasonId, initialCompetitionId,
    initialOpponentOrganisationId, initialOpponentClubId, initialOpponentTeamId,
    initialTitle, initialMatchDate, initialMatchTime,
    initialVenue, initialLocation, initialDescription,
  });

  // 2. Cascading selections (load orgs/clubs/teams/seasons/competitions)
  const selections = useMatchSelections({ opened, apiBaseUrl, mode: mode || 'default', form });

  // 3. Derived data (project details, metadata, auto-fill)
  const derivedState = useMatchDerived({ opened, apiBaseUrl, form });

  // 4. Submit handler
  const { handleCreate } = useMatchSubmit({
    form, derivedState, requireOpponent,
    initialSeasonId, initialCompetitionId,
    onCreate, onClose,
  });

  // ── Name lookups ──
  const orgNameById = (id: string): string | null => {
    const key = String(id || '').trim();
    if (!key) return null;
    const found = (selections.sortedOrganisations || []).find((o) => String(o.id) === key);
    return found?.name ? String(found.name) : null;
  };

  const periodNameById = (id: string): string | null => {
    const key = String(id || '').trim();
    if (!key) return null;
    const foundSeason = (form.seasonOptions || []).find((p) => String(p.id) === key);
    if (foundSeason?.name) return String(foundSeason.name);
    const foundCompetition = (form.competitionOptions || []).find((p) => String(p.id) === key);
    if (foundCompetition?.name) return String(foundCompetition.name);
    return null;
  };

  return {
    // Mode flags
    isSeasonDetailMode,
    isTeamContextMode,
    requireOpponent,

    // Form state
    effectiveTitle: derivedState.effectiveTitle,
    setTitle: form.setTitle,
    setTitleTouched: form.setTitleTouched,
    matchDate: form.matchDate,
    setMatchDate: form.setMatchDate,
    matchTime: form.matchTime,
    setMatchTime: form.setMatchTime,
    venue: form.venue,
    setVenue: form.setVenue,
    location: form.location,
    setLocation: form.setLocation,
    setLocationTouched: form.setLocationTouched,
    description: form.description,
    setDescription: form.setDescription,
    setDescriptionTouched: form.setDescriptionTouched,
    isSaving: form.isSaving,
    error: form.error,

    // Selection state
    selectedOrganisationId: form.selectedOrganisationId,
    setSelectedOrganisationId: form.setSelectedOrganisationId,
    selectedClubId: form.selectedClubId,
    selectedTeamId: form.selectedTeamId,
    selectedOpponentTeamId: form.selectedOpponentTeamId,
    setSelectedOpponentTeamId: form.setSelectedOpponentTeamId,
    selectedSeasonId: form.selectedSeasonId,
    setSelectedSeasonId: form.setSelectedSeasonId,
    selectedCompetitionId: form.selectedCompetitionId,
    setSelectedCompetitionId: form.setSelectedCompetitionId,
    selectedOpponentOrganisationId: form.selectedOpponentOrganisationId,
    setSelectedOpponentOrganisationId: form.setSelectedOpponentOrganisationId,
    selectedOpponentClubId: form.selectedOpponentClubId,
    setSelectedOpponentClubId: form.setSelectedOpponentClubId,

    // Loading states
    loadingSeasons: form.loadingSeasons,
    loadingCompetitions: form.loadingCompetitions,
    loadingOpponentTeams: form.loadingOpponentTeams,
    loadingOpponentClubs: form.loadingOpponentClubs,

    // Option lists
    sortedOrganisations: selections.sortedOrganisations,
    filteredClubs: selections.filteredClubs,
    filteredTeams: selections.filteredTeams,
    seasonOptions: form.seasonOptions,
    competitionOptions: form.competitionOptions,
    opponentTeamOptions: selections.opponentTeamOptions,
    filteredOpponentClubs: selections.filteredOpponentClubs,

    // Derived
    derived: derivedState.derived,
    resolvedClubId: derivedState.resolvedClubId,
    initialSeasonId,
    initialCompetitionId,

    // Handlers
    handleOrganisationChange: selections.handleOrganisationChange,
    applyClubSelection: selections.applyClubSelection,
    applyTeamSelection: selections.applyTeamSelection,
    handleCreate,
    controlStyle,

    // Name lookups
    projectNameById: derivedState.projectNameById,
    orgNameById,
    periodNameById,
  };
}
