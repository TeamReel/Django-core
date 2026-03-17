import { useEffect, useReducer, useMemo } from 'react';
import type { OrgOption, ProjectOption, PeriodOption } from './matchCreateTypes';
import { formReducer, makeSetter, type FormAction } from '../../utils/formReducer';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface MatchFormInitialOpponent {
  organisationId?: string;
  clubId?: string;
  teamId?: string;
}

export interface MatchFormInitialDetails {
  title?: string;
  matchDate?: string;
  matchTime?: string;
  venue?: 'Home' | 'Away';
  location?: string;
  description?: string;
}

export interface UseMatchFormStateProps {
  opened: boolean;
  organisations?: OrgOption[];
  clubs?: ProjectOption[];
  teams?: ProjectOption[];
  initialOrganisationId?: string;
  initialClubId?: string;
  initialTeamId?: string;
  initialSeasonId?: string;
  initialCompetitionId?: string;
  initialOpponent?: MatchFormInitialOpponent;
  initialDetails?: MatchFormInitialDetails;
}

// ─── State interface ─────────────────────────────────────────────────────────

interface MatchCreateFormState {
  title: string;
  titleTouched: boolean;
  titleAutoValue: string;
  matchDate: string;
  matchTime: string;
  venue: 'Home' | 'Away';
  location: string;
  locationTouched: boolean;
  locationAutoValue: string;
  description: string;
  descriptionTouched: boolean;
  descriptionAutoValue: string;
  isSaving: boolean;
  error: string | null;
  selectedOrganisationId: string;
  selectedClubId: string;
  selectedTeamId: string;
  selectedOpponentTeamId: string;
  selectedSeasonId: string;
  selectedCompetitionId: string;
  selectedOpponentOrganisationId: string;
  selectedOpponentClubId: string;
  seasonOptions: PeriodOption[];
  competitionOptions: PeriodOption[];
  loadingSeasons: boolean;
  loadingCompetitions: boolean;
  opponentTeams: ProjectOption[];
  loadingOpponentTeams: boolean;
  opponentClubs: ProjectOption[];
  loadingOpponentClubs: boolean;
  remoteOrganisations: OrgOption[];
  remoteClubs: ProjectOption[];
  remoteTeams: ProjectOption[];
  loadingOrganisations: boolean;
  loadingClubs: boolean;
  loadingTeams: boolean;
  projectDetailsById: Record<string, ProjectOption>;
}

const initialFormState: MatchCreateFormState = {
  title: '', titleTouched: false, titleAutoValue: '',
  matchDate: '', matchTime: '', venue: 'Home',
  location: '', locationTouched: false, locationAutoValue: '',
  description: '', descriptionTouched: false, descriptionAutoValue: '',
  isSaving: false, error: null,
  selectedOrganisationId: '', selectedClubId: '', selectedTeamId: '',
  selectedOpponentTeamId: '', selectedSeasonId: '', selectedCompetitionId: '',
  selectedOpponentOrganisationId: '', selectedOpponentClubId: '',
  seasonOptions: [], competitionOptions: [],
  loadingSeasons: false, loadingCompetitions: false,
  opponentTeams: [], loadingOpponentTeams: false,
  opponentClubs: [], loadingOpponentClubs: false,
  remoteOrganisations: [], remoteClubs: [], remoteTeams: [],
  loadingOrganisations: false, loadingClubs: false, loadingTeams: false,
  projectDetailsById: {},
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useMatchFormState({
  opened,
  organisations = [],
  clubs = [],
  teams = [],
  initialOrganisationId = '',
  initialClubId = '',
  initialTeamId = '',
  initialSeasonId = '',
  initialCompetitionId = '',
  initialOpponent: {
    organisationId: initialOpponentOrganisationId = '',
    clubId: initialOpponentClubId = '',
    teamId: initialOpponentTeamId = '',
  } = {},
  initialDetails: {
    title: initialTitle = '',
    matchDate: initialMatchDate = '',
    matchTime: initialMatchTime = '',
    venue: initialVenue = 'Home',
    location: initialLocation = '',
    description: initialDescription = '',
  } = {},
}: UseMatchFormStateProps) {
  /* ── Reducer state ── */
  const [s, dispatch] = useReducer(formReducer<MatchCreateFormState>, initialFormState);

  /* ── Backward-compatible setters ── */
  const setTitle = useMemo(() => makeSetter<MatchCreateFormState, 'title'>(dispatch, 'title'), [dispatch]);
  const setTitleTouched = useMemo(() => makeSetter<MatchCreateFormState, 'titleTouched'>(dispatch, 'titleTouched'), [dispatch]);
  const setTitleAutoValue = useMemo(() => makeSetter<MatchCreateFormState, 'titleAutoValue'>(dispatch, 'titleAutoValue'), [dispatch]);
  const setMatchDate = useMemo(() => makeSetter<MatchCreateFormState, 'matchDate'>(dispatch, 'matchDate'), [dispatch]);
  const setMatchTime = useMemo(() => makeSetter<MatchCreateFormState, 'matchTime'>(dispatch, 'matchTime'), [dispatch]);
  const setVenue = useMemo(() => makeSetter<MatchCreateFormState, 'venue'>(dispatch, 'venue'), [dispatch]);
  const setLocation = useMemo(() => makeSetter<MatchCreateFormState, 'location'>(dispatch, 'location'), [dispatch]);
  const setLocationTouched = useMemo(() => makeSetter<MatchCreateFormState, 'locationTouched'>(dispatch, 'locationTouched'), [dispatch]);
  const setLocationAutoValue = useMemo(() => makeSetter<MatchCreateFormState, 'locationAutoValue'>(dispatch, 'locationAutoValue'), [dispatch]);
  const setDescription = useMemo(() => makeSetter<MatchCreateFormState, 'description'>(dispatch, 'description'), [dispatch]);
  const setDescriptionTouched = useMemo(() => makeSetter<MatchCreateFormState, 'descriptionTouched'>(dispatch, 'descriptionTouched'), [dispatch]);
  const setDescriptionAutoValue = useMemo(() => makeSetter<MatchCreateFormState, 'descriptionAutoValue'>(dispatch, 'descriptionAutoValue'), [dispatch]);
  const setIsSaving = useMemo(() => makeSetter<MatchCreateFormState, 'isSaving'>(dispatch, 'isSaving'), [dispatch]);
  const setError = useMemo(() => makeSetter<MatchCreateFormState, 'error'>(dispatch, 'error'), [dispatch]);
  const setSelectedOrganisationId = useMemo(() => makeSetter<MatchCreateFormState, 'selectedOrganisationId'>(dispatch, 'selectedOrganisationId'), [dispatch]);
  const setSelectedClubId = useMemo(() => makeSetter<MatchCreateFormState, 'selectedClubId'>(dispatch, 'selectedClubId'), [dispatch]);
  const setSelectedTeamId = useMemo(() => makeSetter<MatchCreateFormState, 'selectedTeamId'>(dispatch, 'selectedTeamId'), [dispatch]);
  const setSelectedOpponentTeamId = useMemo(() => makeSetter<MatchCreateFormState, 'selectedOpponentTeamId'>(dispatch, 'selectedOpponentTeamId'), [dispatch]);
  const setSelectedSeasonId = useMemo(() => makeSetter<MatchCreateFormState, 'selectedSeasonId'>(dispatch, 'selectedSeasonId'), [dispatch]);
  const setSelectedCompetitionId = useMemo(() => makeSetter<MatchCreateFormState, 'selectedCompetitionId'>(dispatch, 'selectedCompetitionId'), [dispatch]);
  const setSelectedOpponentOrganisationId = useMemo(() => makeSetter<MatchCreateFormState, 'selectedOpponentOrganisationId'>(dispatch, 'selectedOpponentOrganisationId'), [dispatch]);
  const setSelectedOpponentClubId = useMemo(() => makeSetter<MatchCreateFormState, 'selectedOpponentClubId'>(dispatch, 'selectedOpponentClubId'), [dispatch]);
  const setSeasonOptions = useMemo(() => makeSetter<MatchCreateFormState, 'seasonOptions'>(dispatch, 'seasonOptions'), [dispatch]);
  const setCompetitionOptions = useMemo(() => makeSetter<MatchCreateFormState, 'competitionOptions'>(dispatch, 'competitionOptions'), [dispatch]);
  const setLoadingSeasons = useMemo(() => makeSetter<MatchCreateFormState, 'loadingSeasons'>(dispatch, 'loadingSeasons'), [dispatch]);
  const setLoadingCompetitions = useMemo(() => makeSetter<MatchCreateFormState, 'loadingCompetitions'>(dispatch, 'loadingCompetitions'), [dispatch]);
  const setOpponentTeams = useMemo(() => makeSetter<MatchCreateFormState, 'opponentTeams'>(dispatch, 'opponentTeams'), [dispatch]);
  const setLoadingOpponentTeams = useMemo(() => makeSetter<MatchCreateFormState, 'loadingOpponentTeams'>(dispatch, 'loadingOpponentTeams'), [dispatch]);
  const setOpponentClubs = useMemo(() => makeSetter<MatchCreateFormState, 'opponentClubs'>(dispatch, 'opponentClubs'), [dispatch]);
  const setLoadingOpponentClubs = useMemo(() => makeSetter<MatchCreateFormState, 'loadingOpponentClubs'>(dispatch, 'loadingOpponentClubs'), [dispatch]);
  const setRemoteOrganisations = useMemo(() => makeSetter<MatchCreateFormState, 'remoteOrganisations'>(dispatch, 'remoteOrganisations'), [dispatch]);
  const setRemoteClubs = useMemo(() => makeSetter<MatchCreateFormState, 'remoteClubs'>(dispatch, 'remoteClubs'), [dispatch]);
  const setRemoteTeams = useMemo(() => makeSetter<MatchCreateFormState, 'remoteTeams'>(dispatch, 'remoteTeams'), [dispatch]);
  const setLoadingOrganisations = useMemo(() => makeSetter<MatchCreateFormState, 'loadingOrganisations'>(dispatch, 'loadingOrganisations'), [dispatch]);
  const setLoadingClubs = useMemo(() => makeSetter<MatchCreateFormState, 'loadingClubs'>(dispatch, 'loadingClubs'), [dispatch]);
  const setLoadingTeams = useMemo(() => makeSetter<MatchCreateFormState, 'loadingTeams'>(dispatch, 'loadingTeams'), [dispatch]);
  const setProjectDetailsById = useMemo(() => makeSetter<MatchCreateFormState, 'projectDetailsById'>(dispatch, 'projectDetailsById'), [dispatch]);

  // ── Merged option lists ──
  const clubsOptions = useMemo(() => (s.remoteClubs.length ? s.remoteClubs : clubs), [s.remoteClubs, clubs]);
  const teamsOptions = useMemo(() => (s.remoteTeams.length ? s.remoteTeams : teams), [s.remoteTeams, teams]);

  // ── Reset on open (single dispatch instead of ~25 setter calls) ──
  useEffect(() => {
    if (!opened) return;
    dispatch({
      type: 'patch',
      payload: {
        error: null,
        title: String(initialTitle || ''),
        titleTouched: false,
        titleAutoValue: '',
        matchDate: String(initialMatchDate || ''),
        matchTime: String(initialMatchTime || '14:30'),
        location: String(initialLocation || ''),
        locationTouched: false,
        locationAutoValue: '',
        description: String(initialDescription || ''),
        descriptionTouched: false,
        descriptionAutoValue: '',
        selectedOrganisationId: String(initialOrganisationId || ''),
        selectedClubId: String(initialClubId || ''),
        selectedTeamId: String(initialTeamId || ''),
        selectedOpponentTeamId: String(initialOpponentTeamId || ''),
        selectedOpponentOrganisationId: String(initialOpponentOrganisationId || initialOrganisationId || ''),
        selectedOpponentClubId: String(initialOpponentClubId || ''),
        venue: initialVenue,
        selectedSeasonId: String(initialSeasonId || ''),
        selectedCompetitionId: String(initialCompetitionId || ''),
        seasonOptions: [],
        competitionOptions: [],
        opponentTeams: [],
        opponentClubs: [],
        remoteOrganisations: [],
        remoteClubs: [],
        remoteTeams: [],
      },
    });
  }, [
    opened,
    initialOrganisationId,
    initialClubId,
    initialTeamId,
    initialSeasonId,
    initialCompetitionId,
    initialOpponentOrganisationId,
    initialOpponentClubId,
    initialOpponentTeamId,
    initialTitle,
    initialMatchDate,
    initialMatchTime,
    initialVenue,
    initialLocation,
    initialDescription,
  ]);

  // Async prefill for season/competition
  useEffect(() => {
    if (!opened) return;
    const next = String(initialSeasonId || '').trim();
    if (!String(s.selectedSeasonId || '').trim() && next) setSelectedSeasonId(next);
  }, [opened, initialSeasonId, s.selectedSeasonId]);

  useEffect(() => {
    if (!opened) return;
    const next = String(initialCompetitionId || '').trim();
    if (!String(s.selectedCompetitionId || '').trim() && next) setSelectedCompetitionId(next);
  }, [opened, initialCompetitionId, s.selectedCompetitionId]);

  return {
    // Form fields
    title: s.title, setTitle,
    titleTouched: s.titleTouched, setTitleTouched,
    titleAutoValue: s.titleAutoValue, setTitleAutoValue,
    matchDate: s.matchDate, setMatchDate,
    matchTime: s.matchTime, setMatchTime,
    venue: s.venue, setVenue,
    location: s.location, setLocation,
    locationTouched: s.locationTouched, setLocationTouched,
    locationAutoValue: s.locationAutoValue, setLocationAutoValue,
    description: s.description, setDescription,
    descriptionTouched: s.descriptionTouched, setDescriptionTouched,
    descriptionAutoValue: s.descriptionAutoValue, setDescriptionAutoValue,
    isSaving: s.isSaving, setIsSaving,
    error: s.error, setError,

    // Selections
    selectedOrganisationId: s.selectedOrganisationId, setSelectedOrganisationId,
    selectedClubId: s.selectedClubId, setSelectedClubId,
    selectedTeamId: s.selectedTeamId, setSelectedTeamId,
    selectedOpponentTeamId: s.selectedOpponentTeamId, setSelectedOpponentTeamId,
    selectedSeasonId: s.selectedSeasonId, setSelectedSeasonId,
    selectedCompetitionId: s.selectedCompetitionId, setSelectedCompetitionId,
    selectedOpponentOrganisationId: s.selectedOpponentOrganisationId, setSelectedOpponentOrganisationId,
    selectedOpponentClubId: s.selectedOpponentClubId, setSelectedOpponentClubId,

    // Remote data + loading
    seasonOptions: s.seasonOptions, setSeasonOptions,
    competitionOptions: s.competitionOptions, setCompetitionOptions,
    opponentTeams: s.opponentTeams, setOpponentTeams,
    loadingOpponentTeams: s.loadingOpponentTeams, setLoadingOpponentTeams,
    opponentClubs: s.opponentClubs, setOpponentClubs,
    loadingOpponentClubs: s.loadingOpponentClubs, setLoadingOpponentClubs,
    remoteOrganisations: s.remoteOrganisations, setRemoteOrganisations,
    remoteClubs: s.remoteClubs, setRemoteClubs,
    remoteTeams: s.remoteTeams, setRemoteTeams,
    loadingOrganisations: s.loadingOrganisations, setLoadingOrganisations,
    loadingClubs: s.loadingClubs, setLoadingClubs,
    loadingTeams: s.loadingTeams, setLoadingTeams,
    loadingSeasons: s.loadingSeasons, setLoadingSeasons,
    loadingCompetitions: s.loadingCompetitions, setLoadingCompetitions,

    // Project detail cache
    projectDetailsById: s.projectDetailsById, setProjectDetailsById,

    // Merged
    clubsOptions,
    teamsOptions,
  };
}
