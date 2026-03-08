import { useEffect, useMemo } from 'react';
import type { ProjectOption } from './matchCreateTypes';
import { getParentProjectId, getProjectIdentity } from './matchCreateHelpers';
import type { useMatchFormState } from './useMatchFormState';

// ─── Props ───────────────────────────────────────────────────────────────────

type FormState = ReturnType<typeof useMatchFormState>;

export interface UseMatchDerivedProps {
  opened: boolean;
  apiBaseUrl: string;
  form: FormState;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useMatchDerived({ opened, apiBaseUrl, form }: UseMatchDerivedProps) {
  const {
    title, titleTouched, setTitle,
    matchDate, matchTime,
    venue,
    location, locationTouched, locationAutoValue, setLocation, setLocationAutoValue,
    description, descriptionTouched, descriptionAutoValue, setDescription, setDescriptionAutoValue,

    selectedOrganisationId, setSelectedOrganisationId,
    selectedClubId, setSelectedClubId,
    selectedTeamId,
    selectedOpponentTeamId,
    selectedSeasonId,
    selectedCompetitionId,
    selectedOpponentOrganisationId, setSelectedOpponentOrganisationId,
    selectedOpponentClubId, setSelectedOpponentClubId,

    seasonOptions,
    competitionOptions,
    opponentTeams,
    projectDetailsById, setProjectDetailsById,
    teamsOptions,
  } = form;

  // ── Fetch project details for selected IDs ──
  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    const abortController = new AbortController();

    const load = async (projectId: string) => {
      const key = String(projectId || '').trim();
      if (!key) return;
      if (projectDetailsById[key]) return;
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(key)}/`, {
          credentials: 'include',
          signal: abortController.signal,
        });
        if (!res.ok) return;
        const raw = await res.json().catch(() => null);
        const data = raw?.data?.data || raw?.data || raw;
        if (!cancelled && data && typeof data === 'object') {
          setProjectDetailsById((prev) => ({ ...prev, [key]: data }));
        }
      } catch { /* ignore */ }
    };

    const resolvedOpponentClubIdLocal =
      String(selectedOpponentClubId || '').trim() ||
      (() => {
        const oppTeam = (opponentTeams || []).find((t) => String(t?.id) === String(selectedOpponentTeamId));
        return oppTeam ? String(getParentProjectId(oppTeam) || '') : '';
      })();

    const resolvedClubIdLocal =
      String(selectedClubId || '').trim() ||
      (() => {
        const teamFromList = (teamsOptions || []).find((t) => String(t?.id) === String(selectedTeamId));
        return teamFromList ? String(getParentProjectId(teamFromList) || '') : '';
      })();

    void load(String(selectedTeamId || ''));
    void load(String(selectedOpponentTeamId || ''));
    void load(String(resolvedClubIdLocal || ''));
    void load(String(resolvedOpponentClubIdLocal || ''));

    return () => { cancelled = true; abortController.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, apiBaseUrl, selectedTeamId, selectedOpponentTeamId, selectedClubId, selectedOpponentClubId, opponentTeams, teamsOptions]);

  // ── Detail memos ──
  const selectedTeamDetail = useMemo(() => {
    const key = String(selectedTeamId || '').trim();
    return key ? projectDetailsById[key] : null;
  }, [projectDetailsById, selectedTeamId]);

  const selectedOpponentDetail = useMemo(() => {
    const key = String(selectedOpponentTeamId || '').trim();
    return key ? projectDetailsById[key] : null;
  }, [projectDetailsById, selectedOpponentTeamId]);

  // ── Resolve club/org from team detail ──
  useEffect(() => {
    if (!opened) return;

    const resolvedClubIdLocal =
      !String(selectedClubId || '').trim()
        ? ((): string | null => {
            const fromList = (teamsOptions || []).find((t) => String(t?.id) === String(selectedTeamId));
            return getParentProjectId(fromList || selectedTeamDetail);
          })()
        : null;
    if (resolvedClubIdLocal && String(resolvedClubIdLocal) !== String(selectedClubId || '')) {
      setSelectedClubId(String(resolvedClubIdLocal));
    }

    const resolvedOppClubId = !String(selectedOpponentClubId || '').trim() ? getParentProjectId(selectedOpponentDetail) : null;
    if (resolvedOppClubId && String(resolvedOppClubId) !== String(selectedOpponentClubId || '')) {
      setSelectedOpponentClubId(String(resolvedOppClubId));
    }

    const resolvedOrgId =
      !String(selectedOrganisationId || '').trim() && selectedTeamDetail
        ? String(
            typeof selectedTeamDetail?.organisation === 'string'
              ? selectedTeamDetail.organisation
              : selectedTeamDetail?.organisation?.id || ''
          ).trim()
        : '';

    if (resolvedOrgId) {
      setSelectedOrganisationId(resolvedOrgId);
      if (!String(selectedOpponentOrganisationId || '').trim()) setSelectedOpponentOrganisationId(resolvedOrgId);
    }
  }, [
    opened, selectedTeamDetail, selectedOpponentDetail,
    selectedTeamId, selectedClubId, selectedOpponentClubId,
    selectedOrganisationId, selectedOpponentOrganisationId, teamsOptions,
  ]);

  // ── Resolved club IDs ──
  const resolvedClubId = useMemo(() => {
    const explicit = String(selectedClubId || '').trim();
    if (explicit) return explicit;
    const fromList = (teamsOptions || []).find((t) => String(t?.id) === String(selectedTeamId));
    const from = fromList || selectedTeamDetail;
    return from ? String(getParentProjectId(from) || '').trim() : '';
  }, [selectedClubId, teamsOptions, selectedTeamId, selectedTeamDetail]);

  const resolvedOpponentClubId = useMemo(() => {
    const explicit = String(selectedOpponentClubId || '').trim();
    if (explicit) return explicit;
    const oppTeam = (opponentTeams || []).find((t) => String(t?.id) === String(selectedOpponentTeamId));
    return oppTeam ? String(getParentProjectId(oppTeam) || '').trim() : '';
  }, [selectedOpponentClubId, opponentTeams, selectedOpponentTeamId]);

  const selectedClubDetail = useMemo(() => {
    const key = String(resolvedClubId || '').trim();
    return key ? projectDetailsById[key] : null;
  }, [projectDetailsById, resolvedClubId]);

  const selectedOpponentClubDetail = useMemo(() => {
    const key = String(resolvedOpponentClubId || '').trim();
    return key ? projectDetailsById[key] : null;
  }, [projectDetailsById, resolvedOpponentClubId]);

  // ── Derived metadata ──
  const derived = useMemo(() => {
    const our = getProjectIdentity(selectedTeamDetail);
    const opp = getProjectIdentity(selectedOpponentDetail);
    const ourClub = getProjectIdentity(selectedClubDetail);
    const oppClub = getProjectIdentity(selectedOpponentClubDetail);

    const home = venue === 'Home' ? our : opp;
    const away = venue === 'Home' ? opp : our;
    const homeClub = venue === 'Home' ? ourClub : oppClub;
    const awayClub = venue === 'Home' ? oppClub : ourClub;

    const homeDisplayName = homeClub.name || home.name;
    const awayDisplayName = awayClub.name || away.name;
    const titleDefault = homeDisplayName && awayDisplayName ? `${homeDisplayName} vs ${awayDisplayName}` : '';
    const locationDefault = (homeClub.defaultLocation || home.defaultLocation || '').trim();

    const season = (seasonOptions || []).find((s: any) => String(s?.id) === String(selectedSeasonId));
    const competition = (competitionOptions || []).find((c: any) => String(c?.id) === String(selectedCompetitionId));

    const metadataBase = {
      identity: {
        home_team_name: home.name || null,
        home_team_logo_url: home.logoUrl || null,
        away_team_name: away.name || null,
        away_team_logo_url: away.logoUrl || null,
        season_id: season?.id ? String(season.id) : null,
        season_name: season?.name ? String(season.name) : null,
        competition_id: competition?.id ? String(competition.id) : null,
        competition_name: competition?.name ? String(competition.name) : null,
      },
      teamreel: {
        match_context: {
          organisation_id: selectedOrganisationId ? String(selectedOrganisationId) : null,
          club_id: resolvedClubId ? String(resolvedClubId) : null,
          team_id: selectedTeamId ? String(selectedTeamId) : null,
          opponent_organisation_id: (selectedOpponentOrganisationId || selectedOrganisationId)
            ? String(selectedOpponentOrganisationId || selectedOrganisationId) : null,
          opponent_club_id: resolvedOpponentClubId ? String(resolvedOpponentClubId) : null,
          opponent_team_id: selectedOpponentTeamId ? String(selectedOpponentTeamId) : null,
          season_id: season?.id ? String(season.id) : null,
          season_name: season?.name ? String(season.name) : null,
          competition_id: competition?.id ? String(competition.id) : null,
          competition_name: competition?.name ? String(competition.name) : null,
          home_team_name: home.name || null,
          away_team_name: away.name || null,
          home_club_name: homeDisplayName || null,
          away_club_name: awayDisplayName || null,
          home_club_default_location: homeClub.defaultLocation || null,
          title: titleDefault || null,
        },
        vars: {
          season_name: season?.name ? String(season.name) : null,
          competition_name: competition?.name ? String(competition.name) : null,
          home_team_name: home.name || null,
          away_team_name: away.name || null,
          home_club_name: homeDisplayName || null,
          away_club_name: awayDisplayName || null,
          match_title: titleDefault || null,
        },
      },
    };

    const descriptionLines: string[] = [];
    if (metadataBase.identity.competition_name || metadataBase.identity.season_name) {
      const comp = metadataBase.identity.competition_name || '';
      const seas = metadataBase.identity.season_name || '';
      descriptionLines.push([comp, seas].filter(Boolean).join(' — '));
    }
    if (homeDisplayName && awayDisplayName) descriptionLines.push(`${homeDisplayName} vs ${awayDisplayName}`);
    if (matchDate || matchTime) {
      const dt = [matchDate, matchTime].filter(Boolean).join(' ');
      if (dt) descriptionLines.push(`Datum/tijd: ${dt}`);
    }
    if (locationDefault) descriptionLines.push(`Locatie: ${locationDefault}`);
    const descriptionDefault = descriptionLines.filter(Boolean).join('\n');

    return { titleDefault, locationDefault, descriptionDefault, metadataBase };
  }, [
    venue, selectedTeamDetail, selectedOpponentDetail, selectedClubDetail, selectedOpponentClubDetail,
    seasonOptions, competitionOptions, selectedSeasonId, selectedCompetitionId,
    matchDate, matchTime, selectedOrganisationId, selectedClubId, selectedTeamId,
    selectedOpponentOrganisationId, selectedOpponentTeamId, resolvedOpponentClubId, resolvedClubId,
  ]);

  const effectiveTitle = titleTouched ? title : (derived.titleDefault || title);

  // ── Auto-fill effects ──
  useEffect(() => {
    if (!opened || locationTouched || !derived.locationDefault) return;
    if (!location.trim() || location === locationAutoValue) {
      setLocation(derived.locationDefault);
      setLocationAutoValue(derived.locationDefault);
    }
  }, [opened, locationTouched, location, locationAutoValue, derived.locationDefault]);

  useEffect(() => {
    if (!opened || descriptionTouched || !derived.descriptionDefault) return;
    if (!description.trim() || description === descriptionAutoValue) {
      setDescription(derived.descriptionDefault);
      setDescriptionAutoValue(derived.descriptionDefault);
    }
  }, [opened, descriptionTouched, description, descriptionAutoValue, derived.descriptionDefault]);

  // Auto-title from teams
  useEffect(() => {
    if (!opened || titleTouched) return;
    if (!selectedTeamId || !selectedOpponentTeamId) return;
    const homeId = venue === 'Home' ? String(selectedTeamId) : String(selectedOpponentTeamId);
    const awayId = venue === 'Home' ? String(selectedOpponentTeamId) : String(selectedTeamId);
    const homeName = projectNameById(homeId) || 'Home';
    const awayName = projectNameById(awayId) || 'Opponent';
    const nextTitle = `${homeName} vs ${awayName}`;
    if (nextTitle && nextTitle !== title) setTitle(nextTitle);
  }, [opened, selectedTeamId, selectedOpponentTeamId, title, titleTouched, venue]);

  // Resolve opponent club from team
  useEffect(() => {
    if (!opened) return;
    if (selectedOpponentTeamId && !selectedOpponentClubId) {
      const oppTeam = (opponentTeams || []).find((t) => String(t?.id) === String(selectedOpponentTeamId));
      const parentId = oppTeam ? getParentProjectId(oppTeam) : null;
      if (parentId) setSelectedOpponentClubId(String(parentId));
    }
  }, [opened, selectedOpponentTeamId, selectedOpponentClubId, opponentTeams]);

  // ── Name lookups ──
  function projectNameById(id: string): string | null {
    if (!id) return null;
    const fromTeams = (teamsOptions || []).find((t) => String(t.id) === String(id));
    if (fromTeams?.name) return String(fromTeams.name);
    const fromOpponents = (opponentTeams || []).find((t) => String(t.id) === String(id));
    if (fromOpponents?.name) return String(fromOpponents.name);
    return null;
  }

  return {
    derived,
    effectiveTitle,
    resolvedClubId,
    resolvedOpponentClubId,
    projectNameById,
  };
}
