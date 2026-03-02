import { useEffect, useState, useMemo } from 'react';
import type { OrgOption, ProjectOption, PeriodOption, MatchCreateModalProps } from './matchCreateTypes';

// ─── Props ───────────────────────────────────────────────────────────────────

export type UseMatchFormStateProps = Pick<
  MatchCreateModalProps,
  | 'opened'
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
>;

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
  initialOpponentOrganisationId = '',
  initialOpponentClubId = '',
  initialOpponentTeamId = '',
  initialTitle = '',
  initialMatchDate = '',
  initialMatchTime = '',
  initialVenue = 'Home',
  initialLocation = '',
  initialDescription = '',
}: UseMatchFormStateProps) {
  // ── Form fields ──
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [titleAutoValue, setTitleAutoValue] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [venue, setVenue] = useState<'Home' | 'Away'>('Home');
  const [location, setLocation] = useState('');
  const [locationTouched, setLocationTouched] = useState(false);
  const [locationAutoValue, setLocationAutoValue] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [descriptionAutoValue, setDescriptionAutoValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Selection state ──
  const [selectedOrganisationId, setSelectedOrganisationId] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedOpponentTeamId, setSelectedOpponentTeamId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('');
  const [selectedOpponentOrganisationId, setSelectedOpponentOrganisationId] = useState('');
  const [selectedOpponentClubId, setSelectedOpponentClubId] = useState('');

  // ── Remote data ──
  const [seasonOptions, setSeasonOptions] = useState<PeriodOption[]>([]);
  const [competitionOptions, setCompetitionOptions] = useState<PeriodOption[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);

  const [opponentTeams, setOpponentTeams] = useState<ProjectOption[]>([]);
  const [loadingOpponentTeams, setLoadingOpponentTeams] = useState(false);

  const [opponentClubs, setOpponentClubs] = useState<ProjectOption[]>([]);
  const [loadingOpponentClubs, setLoadingOpponentClubs] = useState(false);

  const [remoteOrganisations, setRemoteOrganisations] = useState<OrgOption[]>([]);
  const [remoteClubs, setRemoteClubs] = useState<ProjectOption[]>([]);
  const [remoteTeams, setRemoteTeams] = useState<ProjectOption[]>([]);
  const [loadingOrganisations, setLoadingOrganisations] = useState(false);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // ── Project detail cache ──
  const [projectDetailsById, setProjectDetailsById] = useState<Record<string, any>>({});

  // ── Merged option lists ──
  const clubsOptions = useMemo(() => (remoteClubs.length ? remoteClubs : clubs), [remoteClubs, clubs]);
  const teamsOptions = useMemo(() => (remoteTeams.length ? remoteTeams : teams), [remoteTeams, teams]);

  // ── Reset on open ──
  useEffect(() => {
    if (!opened) return;
    setError(null);
    setTitle(String(initialTitle || ''));
    setTitleTouched(false);
    setTitleAutoValue('');
    setMatchDate(String(initialMatchDate || ''));
    setMatchTime(String(initialMatchTime || '14:30'));
    setLocation(String(initialLocation || ''));
    setLocationTouched(false);
    setLocationAutoValue('');
    setDescription(String(initialDescription || ''));
    setDescriptionTouched(false);
    setDescriptionAutoValue('');
    setSelectedOrganisationId(String(initialOrganisationId || ''));
    setSelectedClubId(String(initialClubId || ''));
    setSelectedTeamId(String(initialTeamId || ''));
    setSelectedOpponentTeamId(String(initialOpponentTeamId || ''));
    setSelectedOpponentOrganisationId(String(initialOpponentOrganisationId || initialOrganisationId || ''));
    setSelectedOpponentClubId(String(initialOpponentClubId || ''));
    setVenue(initialVenue);
    setSelectedSeasonId(String(initialSeasonId || ''));
    setSelectedCompetitionId(String(initialCompetitionId || ''));
    setSeasonOptions([]);
    setCompetitionOptions([]);
    setOpponentTeams([]);
    setOpponentClubs([]);
    setRemoteOrganisations([]);
    setRemoteClubs([]);
    setRemoteTeams([]);
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
    if (!String(selectedSeasonId || '').trim() && next) setSelectedSeasonId(next);
  }, [opened, initialSeasonId, selectedSeasonId]);

  useEffect(() => {
    if (!opened) return;
    const next = String(initialCompetitionId || '').trim();
    if (!String(selectedCompetitionId || '').trim() && next) setSelectedCompetitionId(next);
  }, [opened, initialCompetitionId, selectedCompetitionId]);

  return {
    // Form fields
    title, setTitle,
    titleTouched, setTitleTouched,
    titleAutoValue, setTitleAutoValue,
    matchDate, setMatchDate,
    matchTime, setMatchTime,
    venue, setVenue,
    location, setLocation,
    locationTouched, setLocationTouched,
    locationAutoValue, setLocationAutoValue,
    description, setDescription,
    descriptionTouched, setDescriptionTouched,
    descriptionAutoValue, setDescriptionAutoValue,
    isSaving, setIsSaving,
    error, setError,

    // Selections
    selectedOrganisationId, setSelectedOrganisationId,
    selectedClubId, setSelectedClubId,
    selectedTeamId, setSelectedTeamId,
    selectedOpponentTeamId, setSelectedOpponentTeamId,
    selectedSeasonId, setSelectedSeasonId,
    selectedCompetitionId, setSelectedCompetitionId,
    selectedOpponentOrganisationId, setSelectedOpponentOrganisationId,
    selectedOpponentClubId, setSelectedOpponentClubId,

    // Remote data + loading
    seasonOptions, setSeasonOptions,
    competitionOptions, setCompetitionOptions,
    opponentTeams, setOpponentTeams,
    loadingOpponentTeams, setLoadingOpponentTeams,
    opponentClubs, setOpponentClubs,
    loadingOpponentClubs, setLoadingOpponentClubs,
    remoteOrganisations, setRemoteOrganisations,
    remoteClubs, setRemoteClubs,
    remoteTeams, setRemoteTeams,
    loadingOrganisations, setLoadingOrganisations,
    loadingClubs, setLoadingClubs,
    loadingTeams, setLoadingTeams,
    loadingSeasons, setLoadingSeasons,
    loadingCompetitions, setLoadingCompetitions,

    // Project detail cache
    projectDetailsById, setProjectDetailsById,

    // Merged
    clubsOptions,
    teamsOptions,
  };
}
