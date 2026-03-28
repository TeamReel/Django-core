/**
 * usePeriodCreateData - Data hook for PeriodCreateModal
 */
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/api';
import { useSports } from '@/hooks/useSports';
import { logger } from '@/utils/logger';
import type {
  OrgOption,
  ProjectOption,
  PeriodOption,
  PeriodCreateModalProps,
  PeriodCreatePayload,
} from './types';

export function usePeriodCreateData({
  opened,
  onClose,
  onCreate,
  organisations = [],
  clubs = [],
  teams = [],
  requirements: {
    requireOrganisation = false,
    requireClub = false,
    requireTeam = false,
    requireSeason = false,
    showSportVariant = false,
  } = {},
  initialOrganisationId = '',
  initialClubId = '',
  initialTeamId = '',
  initialSeasonId = '',
}: PeriodCreateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSportId, setSelectedSportId] = useState('');

  const { variants, loading: sportsLoading } = useSports();

  const [selectedOrganisationId, setSelectedOrganisationId] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');

  const [seasonOptions, setSeasonOptions] = useState<PeriodOption[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);

  const hasOrgSelect = organisations.length > 0;
  const hasClubSelect = clubs.length > 0;
  const hasTeamSelect = teams.length > 0;

  useEffect(() => {
    if (!opened) return;
    setError(null);
    setSelectedOrganisationId(String(initialOrganisationId || ''));
    setSelectedClubId(String(initialClubId || ''));
    setSelectedTeamId(String(initialTeamId || ''));
    setSelectedSeasonId(String(initialSeasonId || ''));
  }, [opened, initialOrganisationId, initialClubId, initialTeamId, initialSeasonId]);

  const sortedOrganisations = useMemo(() => {
    return [...organisations].sort((a, b) => a.name.localeCompare(b.name));
  }, [organisations]);

  const filteredClubs = useMemo(() => {
    const orgId = selectedOrganisationId;
    const list = orgId
      ? clubs.filter((c) => {
          const cOrg = typeof c.organisation === 'string' || typeof c.organisation === 'number' ? c.organisation : c.organisation?.id;
          return String(cOrg) === String(orgId);
        })
      : clubs;
    return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [clubs, selectedOrganisationId]);

  const getClubOrganisationId = (clubId: string): string | null => {
    const club = clubs.find((c) => String(c.id) === String(clubId));
    if (!club) return null;
    const org = typeof club.organisation === 'string' || typeof club.organisation === 'number' ? club.organisation : club.organisation?.id;
    return org ? String(org) : null;
  };

  const getTeamParentId = (t: ProjectOption): string | null => {
    const parent =
      t?.parent_id ??
      t?.parent ??
      t?.parent_project_id ??
      (typeof t?.parent_project === 'object' ? t?.parent_project?.id : t?.parent_project);
    if (parent == null) return null;
    return String(typeof parent === 'object' ? parent.id : parent);
  };

  const filteredTeams = useMemo(() => {
    const clubId = selectedClubId;
    const list = clubId ? teams.filter((t) => getTeamParentId(t) === String(clubId)) : teams;
    return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [teams, selectedClubId]);

  const applyClubSelection = (clubId: string) => {
    setSelectedClubId(clubId);
    setSelectedTeamId('');
    setSelectedSeasonId('');

    const orgId = clubId ? getClubOrganisationId(clubId) : null;
    if (orgId) setSelectedOrganisationId(orgId);
  };

  const applyTeamSelection = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedSeasonId('');

    const team = teams.find((t) => String(t.id) === String(teamId));
    if (!team) return;

    const clubId = getTeamParentId(team);
    if (clubId) {
      setSelectedClubId(String(clubId));
      const orgId = getClubOrganisationId(String(clubId));
      if (orgId) setSelectedOrganisationId(String(orgId));
    }
  };

  const autoFillFromTeamId = (teamId: string) => {
    if (!teamId) return;
    setSelectedTeamId(String(teamId));

    const team = teams.find((t) => String(t.id) === String(teamId));
    if (!team) return;

    const clubId = getTeamParentId(team);
    if (clubId) {
      setSelectedClubId(String(clubId));
      const orgId = getClubOrganisationId(String(clubId));
      if (orgId) setSelectedOrganisationId(String(orgId));
    }
  };

  useEffect(() => {
    if (!opened || !requireSeason) return;

    const load = async () => {
      setSeasonsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('parent_id', 'null');

        if (selectedTeamId) {
          params.set('project_id', String(selectedTeamId));
        } else if (selectedClubId && teams.length > 0) {
          const clubTeams = teams.filter((t) => getTeamParentId(t) === String(selectedClubId));
          if (clubTeams.length === 0) {
            setSeasonOptions([]);
            return;
          }
          params.set('project_id__in', clubTeams.map((t) => String(t.id)).join(','));
        } else if (selectedOrganisationId) {
          params.set('organisation_id', String(selectedOrganisationId));
        }

        const data = await api.get<{ data?: { data?: Record<string, unknown>[]; results?: Record<string, unknown>[] }; results?: Record<string, unknown>[]; [key: string]: unknown }>(`/periods/?${params.toString()}`);
        const results = data.data?.data || data.data?.results || data.results || data.data || [];
        const roots = (Array.isArray(results) ? results : []).filter(
          (p: Record<string, unknown>) => p?.parent_period_id == null && !p?.parent_period
        );
        const unique = [...new Map(roots.map((p: Record<string, unknown>) => [String(p.id), p])).values()];
        const sorted = unique.sort((a: Record<string, unknown>, b: Record<string, unknown>) => String(a?.name || '').localeCompare(String(b?.name || '')));
        setSeasonOptions(sorted as PeriodOption[]);
      } catch {
        setSeasonOptions([]);
      } finally {
        setSeasonsLoading(false);
      }
    };

    load();
  }, [opened, requireSeason, selectedOrganisationId, selectedClubId, selectedTeamId, teams]);

  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeasonId(seasonId);

    // If user picks a season before picking a team, infer team/club/federation.
    if (!selectedTeamId && seasonId) {
      const season = seasonOptions.find((s) => String(s?.id) === String(seasonId));
      const inferredTeamId = season?.project?.id ?? season?.project_id;
      if (inferredTeamId != null) autoFillFromTeamId(String(inferredTeamId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (requireOrganisation && !selectedOrganisationId) {
        throw new Error('Select a federation first.');
      }
      if (requireClub && !selectedClubId) {
        throw new Error('Select a club first.');
      }
      if (requireTeam && !selectedTeamId) {
        throw new Error('Select a team first.');
      }
      if (requireSeason && !selectedSeasonId) {
        throw new Error('Select a season first.');
      }

      await onCreate({
        name,
        description: description || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        organisation_id: selectedOrganisationId || undefined,
        project_id: selectedTeamId || undefined,
        parent_period_id: selectedSeasonId || undefined,
        sport_id: showSportVariant && selectedSportId ? selectedSportId : undefined,
      });
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setSelectedSportId('');
      onClose();
    } catch (err) {
      logger.error('Failed to create period', err);
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return {
    // Form state
    name,
    setName,
    description,
    setDescription,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedSportId,
    setSelectedSportId,

    // Selection state
    selectedOrganisationId,
    setSelectedOrganisationId,
    selectedClubId,
    selectedTeamId,
    selectedSeasonId,

    // Loading/error
    saving,
    error,
    sportsLoading,
    seasonsLoading,

    // Options
    sortedOrganisations,
    filteredClubs,
    filteredTeams,
    seasonOptions,
    variants,

    // Flags
    hasOrgSelect,
    hasClubSelect,
    hasTeamSelect,
    requireOrganisation,
    requireClub,
    requireTeam,
    requireSeason,
    showSportVariant,

    // Handlers
    applyClubSelection,
    applyTeamSelection,
    handleSeasonChange,
    handleSubmit,
  };
}
