import { useEffect, useMemo } from 'react';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { getApiBaseUrl } from '../../utils/apiBase';
import type { OrgOption, ProjectOption, PeriodOption } from './matchCreateTypes';
import {
  extractList,
  fetchAllPagesLocal,
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
        const res = await fetch(`${apiBaseUrl}/api/v1/organisations/?page_size=500`, {
          credentials: 'include',
          signal: abortController.signal,
        });
        if (!res.ok) return;
        const raw = await res.json().catch(() => null);
        const list = extractList(raw)
          .map((o: any) => ({ id: String(o.id), name: String(o.name || o.slug || o.id), slug: o.slug }))
          .filter((o: any) => o.id);
        const unique = [...new Map(list.map((o: any) => [String(o.id), o])).values()];
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
    () => (remoteOrganisations.length ? remoteOrganisations : (form as any).organisations || []) as OrgOption[],
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
        const params = new URLSearchParams();
        params.set('page_size', '200');
        params.set('parent_project__isnull', 'true');
        if (orgId) params.set('organisation_id', orgId);

        const list = await fetchAllPages<ProjectOption>(
          `${apiBaseUrl}/api/v1/projects/?${params.toString()}`,
          { credentials: 'include', signal: abortController.signal },
          { ttlMs: 10_000, cacheKey: `projects:clubs:${orgId || 'all'}`, maxItems: 3000 }
        );
        const unique = [...new Map((list || []).map((p: any) => [String(p.id), p])).values()];
        if (!cancelled) setRemoteClubs(unique as any);
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
        const baseUrl = clubId
          ? `${apiBaseUrl}/api/v1/projects/?parent_project=${encodeURIComponent(clubId)}&page_size=200`
          : orgId
            ? orgSlug
              ? `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=200&parent_project__isnull=false`
              : `${apiBaseUrl}/api/v1/projects/?organisation_id=${encodeURIComponent(orgId)}&page_size=200&parent_project__isnull=false`
            : `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=false`;

        const rawList = await fetchAllPagesLocal(baseUrl, { credentials: 'include', signal: abortController.signal }, 3000);
        const list = rawList.map((p: any) => ({ ...p, id: p.id, name: p.name, slug: p.slug }));
        const unique = [...new Map(list.map((p: any) => [String(p.id), p])).values()];
        if (!cancelled) setRemoteTeams(unique as any);
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
        const params = new URLSearchParams();
        params.set('page_size', '200');
        params.set('parent_project__isnull', 'true');
        params.set('organisation_id', orgId);

        const list = await fetchAllPages<ProjectOption>(
          `${apiBaseUrl}/api/v1/projects/?${params.toString()}`,
          { credentials: 'include', signal: abortController.signal },
          { ttlMs: 10_000, cacheKey: `projects:clubs:opponent:${orgId}`, maxItems: 3000 }
        );
        const unique = [...new Map((list || []).map((p: any) => [String(p.id), p])).values()];
        if (!cancelled) setOpponentClubs(unique as any);
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

    const load = async () => {
      setLoadingOpponentTeams(true);
      try {
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('organisation_id', orgId);
        params.set('parent_project__isnull', 'false');

        const results = await fetchAllPages<ProjectOption>(
          `${apiBaseUrl}/api/v1/projects/?${params.toString()}`,
          { credentials: 'include' },
          { ttlMs: 10_000, cacheKey: `projects:teams:org:${orgId}`, maxItems: 3000 }
        );
        setOpponentTeams(Array.isArray(results) ? results : []);
      } catch {
        setOpponentTeams([]);
      } finally {
        setLoadingOpponentTeams(false);
      }
    };

    load();
  }, [opened, selectedOrganisationId, selectedOpponentOrganisationId]);

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
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('parent_id', 'null');
        params.set('organisation_id', String(selectedOrganisationId));
        params.set('project_id', String(selectedTeamId));

        const res = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
        if (!res.ok) { setSeasonOptions([]); return; }
        const data = await res.json();
        const results = data.data?.data || data.data?.results || data.results || data.data || [];
        const roots = (Array.isArray(results) ? results : []).filter(
          (p: any) => p?.parent_period_id == null && !p?.parent_period
        );
        const unique = [...new Map(roots.map((p: any) => [String(p.id), p])).values()];
        const sorted = unique.sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || '')));
        setSeasonOptions(sorted as any);
      } catch { setSeasonOptions([]); } finally { setLoadingSeasons(false); }
    };

    load();
  }, [opened, selectedOrganisationId, selectedTeamId]);

  // Auto-select single season
  useEffect(() => {
    if (!opened) return;
    if (!selectedSeasonId && seasonOptions.length === 1 && !isSeasonDetailMode) {
      setSelectedSeasonId(String(seasonOptions[0]?.id || ''));
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
        const apiBase = getApiBaseUrl();
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('parent_id', String(selectedSeasonId));
        params.set('organisation_id', String(selectedOrganisationId));
        params.set('project_id', String(selectedTeamId));

        const res = await fetch(`${apiBase}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
        if (!res.ok) { setCompetitionOptions([]); return; }
        const data = await res.json();
        const results = data.data?.data || data.data?.results || data.results || data.data || [];
        const list = Array.isArray(results) ? results : [];
        const unique = [...new Map(list.map((p: any) => [String(p.id), p])).values()];
        const sorted = unique.sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || '')));
        setCompetitionOptions(sorted as any);
      } catch { setCompetitionOptions([]); } finally { setLoadingCompetitions(false); }
    };

    load();
  }, [opened, selectedSeasonId, selectedOrganisationId, selectedTeamId]);

  // Auto-select single competition
  useEffect(() => {
    if (!opened) return;
    if (!selectedCompetitionId && competitionOptions.length === 1) {
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
          const cOrg = typeof c.organisation === 'string' ? c.organisation : c.organisation?.id;
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
          const cOrg = typeof (c as any).organisation === 'string' ? (c as any).organisation : (c as any).organisation?.id;
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
