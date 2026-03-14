import { useEffect, useMemo } from 'react';
import { api } from '@/api/client';
import type { OrgOption, ProjectOption, PeriodOption } from './matchCreateTypes';
import {
  getParentProjectId,
  getClubOrganisationId,
  getTeamParentId,
  getProjectOrganisationId,
} from './matchCreateHelpers';
import type { useMatchFormState } from './useMatchFormState';

// ─── Props ───────────────────────────────────────────────────────────────────

type FormState = ReturnType<typeof useMatchFormState>;

export interface UseMatchSelectionsProps {
  opened: boolean;
  apiBaseUrl: string;
  mode: 'default' | 'season-detail' | 'team-context';
  form: FormState;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useMatchSelections({ opened, apiBaseUrl, mode, form }: UseMatchSelectionsProps) {
  const isSeasonDetailMode = mode === 'season-detail';
  const isTeamContextMode = mode === 'team-context';

  const {
    selectedOrganisationId, setSelectedOrganisationId,
    selectedClubId, setSelectedClubId,
    selectedTeamId, setSelectedTeamId,
    selectedOpponentTeamId, setSelectedOpponentTeamId,
    selectedSeasonId, setSelectedSeasonId,
    selectedCompetitionId, setSelectedCompetitionId,
    selectedOpponentOrganisationId, setSelectedOpponentOrganisationId,
    selectedOpponentClubId, setSelectedOpponentClubId,

    seasonOptions, setSeasonOptions,
    competitionOptions, setCompetitionOptions,
    opponentTeams, setOpponentTeams,
    setLoadingOpponentTeams,
    opponentClubs, setOpponentClubs,
    setLoadingOpponentClubs,
    remoteOrganisations, setRemoteOrganisations,
    setRemoteClubs,
    setRemoteTeams,
    setLoadingOrganisations,
    setLoadingClubs,
    setLoadingTeams,
    setLoadingSeasons,
    setLoadingCompetitions,

    clubsOptions,
    teamsOptions,
  } = form;

  // ── Load federations ──
  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    const abortController = new AbortController();

    const load = async () => {
      setLoadingOrganisations(true);
      try {
        const { results } = await api.list<OrgOption>('/organisations/', { pageSize: 500, signal: abortController.signal });
        const list = results
          .map((o) => ({ id: String(o.id), name: String(o.name || o.slug || o.id), slug: o.slug }))
          .filter((o) => o.id);
        const unique = [...new Map(list.map((o) => [String(o.id), o])).values()];
        if (!cancelled) setRemoteOrganisations(unique);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingOrganisations(false);
      }
    };

    load();
    return () => { cancelled = true; abortController.abort(); };
  }, [opened, apiBaseUrl]);

  const organisationsOptions = useMemo(
    () => (remoteOrganisations.length ? remoteOrganisations : ((form as unknown as Record<string, unknown>).organisations || [])) as OrgOption[],
    [remoteOrganisations]
  );

  const selectedOrganisationSlug = useMemo(() => {
    const orgId = String(selectedOrganisationId || '').trim();
    if (!orgId) return '';
    const org = organisationsOptions.find((o) => String(o.id) === String(orgId));
    return String(org?.slug || '').trim();
  }, [organisationsOptions, selectedOrganisationId]);

  // ── Load clubs ──
  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    const abortController = new AbortController();
    const orgId = String(selectedOrganisationId || '').trim();

    const load = async () => {
      setLoadingClubs(true);
      try {
        const params: Record<string, string> = {
          parent_project__isnull: 'true',
        };
        if (orgId) params.organisation_id = orgId;

        const list = await api.listAll<ProjectOption>('/projects/', {
          params,
          pageSize: 200,
          maxItems: 3000,
          signal: abortController.signal,
        });
        const unique = [...new Map((list || []).map((p) => [String(p.id), p])).values()];
        if (!cancelled) setRemoteClubs(unique);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingClubs(false);
      }
    };

    load();
    return () => { cancelled = true; abortController.abort(); };
  }, [opened, apiBaseUrl, selectedOrganisationId]);

  // ── Load teams ──
  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    const abortController = new AbortController();
    const orgId = String(selectedOrganisationId || '').trim();
    const clubId = String(selectedClubId || '').trim();
    const orgSlug = String(selectedOrganisationSlug || '').trim();

    const load = async () => {
      setLoadingTeams(true);
      try {
        let rawList: ProjectOption[];
        if (clubId) {
          rawList = await api.listAll<ProjectOption>('/projects/', {
            params: { parent_project: clubId },
            pageSize: 200, maxItems: 3000,
            signal: abortController.signal,
          });
        } else if (orgId && orgSlug) {
          rawList = await api.listAll<ProjectOption>(`/organisations/${encodeURIComponent(orgSlug)}/projects/`, {
            params: { parent_project__isnull: 'false' },
            pageSize: 200, maxItems: 3000,
            signal: abortController.signal,
          });
        } else if (orgId) {
          rawList = await api.listAll<ProjectOption>('/projects/', {
            params: { organisation_id: orgId, parent_project__isnull: 'false' },
            pageSize: 200, maxItems: 3000,
            signal: abortController.signal,
          });
        } else {
          rawList = await api.listAll<ProjectOption>('/projects/', {
            params: { parent_project__isnull: 'false' },
            pageSize: 200, maxItems: 3000,
            signal: abortController.signal,
          });
        }
        const list = rawList.map((p) => ({ ...p, id: p.id, name: p.name, slug: p.slug }));
        const unique = [...new Map(list.map((p) => [String(p.id), p])).values()];
        if (!cancelled) setRemoteTeams(unique);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    };

    load();
    return () => { cancelled = true; abortController.abort(); };
  }, [opened, apiBaseUrl, selectedClubId, selectedOrganisationId, selectedOrganisationSlug]);

  // ── Load opponent clubs ──
  useEffect(() => {
    if (!opened) return;
    if (!isSeasonDetailMode && !isTeamContextMode) return;
    const orgId = String(selectedOpponentOrganisationId || '').trim();
    if (!orgId) { setOpponentClubs([]); setSelectedOpponentClubId(''); return; }

    let cancelled = false;
    const abortController = new AbortController();

    const load = async () => {
      setLoadingOpponentClubs(true);
      try {
        const list = await api.listAll<ProjectOption>('/projects/', {
          params: {
            parent_project__isnull: 'true',
            organisation_id: orgId,
          },
          pageSize: 200, maxItems: 3000,
          signal: abortController.signal,
        });
        const unique = [...new Map((list || []).map((p) => [String(p.id), p])).values()];
        if (!cancelled) setOpponentClubs(unique);
      } catch {
        if (!cancelled) setOpponentClubs([]);
      } finally {
        if (!cancelled) setLoadingOpponentClubs(false);
      }
    };

    load();
    return () => { cancelled = true; abortController.abort(); };
  }, [opened, isSeasonDetailMode, isTeamContextMode, apiBaseUrl, selectedOpponentOrganisationId]);

  // ── Load opponent teams ──
  useEffect(() => {
    if (!opened) return;
    const orgId = String((selectedOpponentOrganisationId || selectedOrganisationId) || '').trim();
    if (!orgId) { setOpponentTeams([]); return; }

    let cancelled = false;
    const abortController = new AbortController();

    const load = async () => {
      setLoadingOpponentTeams(true);
      try {
        const params: Record<string, string> = {
          organisation_id: orgId,
          parent_project__isnull: 'false',
        };
        // When a specific opponent club is selected, filter server-side
        // to avoid fetching thousands of teams across the entire org.
        if (selectedOpponentClubId) {
          params.parent_project_id = String(selectedOpponentClubId);
        }
        const results = await api.listAll<ProjectOption>('/projects/', {
          params,
          pageSize: 250,
          maxItems: selectedOpponentClubId ? 500 : 3000,
          signal: abortController.signal,
        });
        if (!cancelled) setOpponentTeams(Array.isArray(results) ? results : []);
      } catch {
        if (!cancelled) setOpponentTeams([]);
      } finally {
        if (!cancelled) setLoadingOpponentTeams(false);
      }
    };

    load();
    return () => { cancelled = true; abortController.abort(); };
  }, [opened, selectedOrganisationId, selectedOpponentOrganisationId, selectedOpponentClubId]);

  // ── Load seasons ──
  useEffect(() => {
    if (!opened) return;
    if (!selectedOrganisationId || !selectedTeamId) {
      setSeasonOptions([]); setSelectedSeasonId('');
      setCompetitionOptions([]); setSelectedCompetitionId('');
      return;
    }

    const load = async () => {
      setLoadingSeasons(true);
      try {
        const { results } = await api.list<PeriodOption>('/periods/', {
          params: {
            parent_id: 'null',
            organisation_id: String(selectedOrganisationId),
            project_id: String(selectedTeamId),
          },
          pageSize: 250,
        });
        const roots = (Array.isArray(results) ? results : [] as PeriodOption[]).filter(
          (p: PeriodOption) => p?.parent_period_id == null && !p?.parent_period
        );
        const unique = [...new Map(roots.map((p) => [String(p.id), p])).values()];
        const sorted = unique.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
        setSeasonOptions(sorted);
      } catch { setSeasonOptions([]); } finally { setLoadingSeasons(false); }
    };

    load();
  }, [opened, selectedOrganisationId, selectedTeamId]);

  // Auto-select season: prefer last alphabetically (most recent, e.g. "2025/2026" > "2024/2025")
  useEffect(() => {
    if (!opened) return;
    if (!selectedSeasonId && seasonOptions.length > 0 && !isSeasonDetailMode) {
      const last = seasonOptions[seasonOptions.length - 1];
      setSelectedSeasonId(String(last?.id || ''));
    }
  }, [opened, selectedSeasonId, seasonOptions, isSeasonDetailMode]);

  // ── Load competitions ──
  useEffect(() => {
    if (!opened) return;
    if (!selectedSeasonId || !selectedOrganisationId || !selectedTeamId) {
      setCompetitionOptions([]); setSelectedCompetitionId('');
      return;
    }

    const load = async () => {
      setLoadingCompetitions(true);
      try {
        const { results } = await api.list<PeriodOption>('/periods/', {
          params: {
            parent_id: String(selectedSeasonId),
            organisation_id: String(selectedOrganisationId),
            project_id: String(selectedTeamId),
          },
          pageSize: 250,
        });
        const list = Array.isArray(results) ? results : [];
        const unique = [...new Map(list.map((p: PeriodOption) => [String(p.id), p])).values()];
        const sorted = unique.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
        setCompetitionOptions(sorted);
      } catch { setCompetitionOptions([]); } finally { setLoadingCompetitions(false); }
    };

    load();
  }, [opened, selectedSeasonId, selectedOrganisationId, selectedTeamId]);

  // Auto-select competition: pick first available (sorted alphabetically)
  useEffect(() => {
    if (!opened) return;
    if (!selectedCompetitionId && competitionOptions.length > 0) {
      setSelectedCompetitionId(String(competitionOptions[0]?.id || ''));
    }
  }, [opened, selectedCompetitionId, competitionOptions]);

  // ── Sorted / filtered collections ──
  const sortedOrganisations = useMemo(
    () => [...organisationsOptions].sort((a, b) => a.name.localeCompare(b.name)),
    [organisationsOptions]
  );

  const filteredClubs = useMemo(() => {
    const orgId = selectedOrganisationId;
    const list = orgId
      ? clubsOptions.filter((c) => {
          const cOrg = typeof c.organisation === 'string' || typeof c.organisation === 'number' ? c.organisation : c.organisation?.id;
          return String(cOrg) === String(orgId);
        })
      : clubsOptions;
    return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [clubsOptions, selectedOrganisationId]);

  const filteredTeams = useMemo(() => {
    const clubId = selectedClubId;
    const list = clubId ? teamsOptions.filter((t) => getTeamParentId(t) === String(clubId)) : teamsOptions;
    return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [teamsOptions, selectedClubId]);

  const opponentTeamOptions = useMemo(() => {
    const orgId = String((selectedOpponentOrganisationId || selectedOrganisationId) || '').trim();
    const list = (opponentTeams || []).filter((t) => {
      const tOrg = getProjectOrganisationId(t);
      if (orgId && tOrg && String(tOrg) !== String(orgId)) return false;
      if (selectedOpponentClubId) {
        const parentId = getTeamParentId(t);
        if (!parentId || String(parentId) !== String(selectedOpponentClubId)) return false;
      }
      if (selectedTeamId && String(t.id) === String(selectedTeamId)) return false;
      return true;
    });
    const unique = [...new Map(list.map((t) => [String(t.id), t])).values()];
    return unique.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [opponentTeams, selectedOrganisationId, selectedOpponentOrganisationId, selectedOpponentClubId, selectedTeamId]);

  const filteredOpponentClubs = useMemo(() => {
    const orgId = String(selectedOpponentOrganisationId || '').trim();
    const list = orgId
      ? (opponentClubs || []).filter((c) => {
          const cOrg = typeof c.organisation === 'string' || typeof c.organisation === 'number' ? c.organisation : c.organisation?.id;
          return !cOrg || String(cOrg) === String(orgId);
        })
      : opponentClubs || [];
    return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [opponentClubs, selectedOpponentOrganisationId]);

  // ── Selection cascade handlers ──
  const handleOrganisationChange = (orgId: string) => {
    setSelectedOrganisationId(orgId);
    setSelectedOpponentOrganisationId(orgId);
    setSelectedOpponentClubId('');
    setSelectedClubId('');
    setSelectedTeamId('');
    setSelectedOpponentTeamId('');
    setSelectedSeasonId('');
    setSelectedCompetitionId('');
    setOpponentTeams([]);
  };

  const applyClubSelection = (clubId: string) => {
    setSelectedClubId(clubId);
    setSelectedTeamId('');
    setSelectedOpponentTeamId('');
    setSelectedSeasonId('');
    setSelectedCompetitionId('');

    const orgId = clubId ? getClubOrganisationId(clubId, clubsOptions) : null;
    if (orgId) {
      setSelectedOrganisationId(orgId);
      setSelectedOpponentOrganisationId(orgId);
    }
  };

  const applyTeamSelection = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedOpponentTeamId((prev) => (prev && String(prev) === String(teamId) ? '' : prev));
    setSelectedSeasonId('');
    setSelectedCompetitionId('');

    const team = teamsOptions.find((t) => String(t.id) === String(teamId));
    if (!team) return;

    const clubId = getTeamParentId(team);
    if (clubId) {
      setSelectedClubId(String(clubId));
      const orgId = getClubOrganisationId(String(clubId), clubsOptions);
      if (orgId) {
        setSelectedOrganisationId(String(orgId));
        setSelectedOpponentOrganisationId(String(orgId));
      }
    }
  };

  return {
    sortedOrganisations,
    filteredClubs,
    filteredTeams,
    opponentTeamOptions,
    filteredOpponentClubs,
    handleOrganisationChange,
    applyClubSelection,
    applyTeamSelection,
  };
}
