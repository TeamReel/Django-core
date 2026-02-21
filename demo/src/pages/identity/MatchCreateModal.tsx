import { useEffect, useMemo, useState } from 'react';

import { fetchAllPages } from '../../utils/fetchAllPages';
import { getApiBaseUrl } from '../../utils/apiBase';

type OrgOption = { id: string; name: string; slug?: string };
type ProjectOption = {
  id: string | number;
  name: string;
  slug?: string;
  organisation?: any;
  parent_id?: any;
  parent_project_id?: any;
  parent_project?: any;
};

type PeriodOption = { id: string; name: string; slug?: string; parent_period?: any; parent_period_id?: any };

export interface MatchCreatePayload {
  title: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;

  metadata?: any;

  venue?: 'Home' | 'Away';

  opponent_project_id?: string;

  organisation_id?: string;
  project_id?: string;
  season_id?: string;
  period_id?: string;
}

interface MatchCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onCreate: (payload: MatchCreatePayload) => Promise<void>;

  headerText?: string;
  submitText?: string;

  mode?: 'default' | 'season-detail' | 'team-context';

  apiBaseUrl?: string;

  organisations?: OrgOption[];
  clubs?: ProjectOption[];
  teams?: ProjectOption[];

  initialOrganisationId?: string;
  initialClubId?: string;
  initialTeamId?: string;
  initialSeasonId?: string;
  initialCompetitionId?: string;

  initialOpponentOrganisationId?: string;
  initialOpponentClubId?: string;
  initialOpponentTeamId?: string;

  initialTitle?: string;
  initialMatchDate?: string;
  initialMatchTime?: string;
  initialVenue?: 'Home' | 'Away';
  initialLocation?: string;
  initialDescription?: string;
}

export default function MatchCreateModal({
  opened,
  onClose,
  onCreate,
  headerText,
  submitText,
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
}: MatchCreateModalProps) {
  const apiBaseUrl = apiBaseUrlProp || getApiBaseUrl();
  const isSeasonDetailMode = mode === 'season-detail';
  const isTeamContextMode = mode === 'team-context';
  const requireOpponent = !isSeasonDetailMode;

  const controlStyle = (disabled: boolean) => ({
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid var(--app-border)',
    backgroundColor: disabled ? 'var(--app-surface-3, #e9eef5)' : 'var(--app-surface-2)',
    color: disabled ? 'var(--app-text-muted, #667085)' : 'var(--app-text)',
    opacity: disabled ? 0.9 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  } as const);

  const extractList = (raw: any): any[] => {
    const list = raw?.data?.data || raw?.data?.results || raw?.results || raw?.data || raw;
    return Array.isArray(list) ? list : [];
  };

  const getNextUrl = (raw: any): string => {
    const next = raw?.data?.next ?? raw?.next;
    return typeof next === 'string' ? next : '';
  };

  const fetchAllPagesLocal = async (url: string, opts: RequestInit, maxItems = 2000): Promise<any[]> => {
    const all: any[] = [];
    let nextUrl = url;
    const seen = new Set<string>();

    while (nextUrl && all.length < maxItems && !seen.has(nextUrl)) {
      seen.add(nextUrl);
      const res = await fetch(nextUrl, opts);
      if (!res.ok) break;
      const raw = await res.json().catch(() => null);
      all.push(...extractList(raw));
      nextUrl = getNextUrl(raw);
    }

    return all.slice(0, maxItems);
  };

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

  const [selectedOrganisationId, setSelectedOrganisationId] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedOpponentTeamId, setSelectedOpponentTeamId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('');

  const [selectedOpponentOrganisationId, setSelectedOpponentOrganisationId] = useState('');
  const [selectedOpponentClubId, setSelectedOpponentClubId] = useState('');

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

  const clubsOptions = useMemo(() => {
    return remoteClubs.length ? remoteClubs : clubs;
  }, [remoteClubs, clubs]);

  const teamsOptions = useMemo(() => {
    return remoteTeams.length ? remoteTeams : teams;
  }, [remoteTeams, teams]);

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

  // If the page resolves season/competition ids asynchronously (slug -> UUID),
  // the modal may open before initialSeasonId/initialCompetitionId are available.
  // In team-context we still want these to be prefilled.
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

  useEffect(() => {
    if (!opened) return;
    if (titleTouched) return;
    if (!selectedTeamId || !selectedOpponentTeamId) return;
    const homeId = venue === 'Home' ? String(selectedTeamId) : String(selectedOpponentTeamId);
    const awayId = venue === 'Home' ? String(selectedOpponentTeamId) : String(selectedTeamId);
    const home = projectNameById(homeId) || 'Home';
    const away = projectNameById(awayId) || 'Opponent';
    const nextTitle = `${home} vs ${away}`;
    if (nextTitle && nextTitle !== title) setTitle(nextTitle);
  }, [opened, selectedTeamId, selectedOpponentTeamId, title, titleTouched, venue]);

  const [projectDetailsById, setProjectDetailsById] = useState<Record<string, any>>({});

  const getParentProjectId = (p: any): string | null => {
    const parent =
      p?.parent_id ??
      p?.parent ??
      p?.parent_project_id ??
      (typeof p?.parent_project === 'object' ? p?.parent_project?.id : p?.parent_project);
    if (parent == null) return null;
    return String(typeof parent === 'object' ? parent.id : parent);
  };

  const getProjectIdentity = (p: any) => {
    const identity = p?.metadata?.identity || {};
    return {
      name: String(p?.name || '').trim(),
      logoUrl: String(identity?.logo_url || '').trim(),
      defaultLocation: String(identity?.default_location ?? identity?.defaultLocation ?? '').trim(),
    };
  };

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
      } catch {
        // ignore
      }
    };

    const resolvedOpponentClubId =
      String(selectedOpponentClubId || '').trim() ||
      (() => {
        const oppTeam = (opponentTeams || []).find((t) => String(t?.id) === String(selectedOpponentTeamId));
        return oppTeam ? String(getParentProjectId(oppTeam) || '') : '';
      })();

    const resolvedClubId =
      String(selectedClubId || '').trim() ||
      (() => {
        const teamFromList = (teamsOptions || []).find((t) => String(t?.id) === String(selectedTeamId));
        return teamFromList ? String(getParentProjectId(teamFromList) || '') : '';
      })();

    void load(String(selectedTeamId || ''));
    void load(String(selectedOpponentTeamId || ''));
    void load(String(resolvedClubId || ''));
    void load(String(resolvedOpponentClubId || ''));

    return () => {
      cancelled = true;
      abortController.abort();
    };
    // Intentionally omit projectDetailsById from deps to avoid refetch loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, apiBaseUrl, selectedTeamId, selectedOpponentTeamId, selectedClubId, selectedOpponentClubId, opponentTeams, teamsOptions]);

  const selectedTeamDetail = useMemo(() => {
    const key = String(selectedTeamId || '').trim();
    return key ? projectDetailsById[key] : null;
  }, [projectDetailsById, selectedTeamId]);

  const selectedOpponentDetail = useMemo(() => {
    const key = String(selectedOpponentTeamId || '').trim();
    return key ? projectDetailsById[key] : null;
  }, [projectDetailsById, selectedOpponentTeamId]);

  useEffect(() => {
    if (!opened) return;

    const resolvedClubId =
      !String(selectedClubId || '').trim()
        ? ((): string | null => {
            const fromList = (teamsOptions || []).find((t) => String(t?.id) === String(selectedTeamId));
            return getParentProjectId(fromList || selectedTeamDetail);
          })()
        : null;
    if (resolvedClubId && String(resolvedClubId) !== String(selectedClubId || '')) {
      setSelectedClubId(String(resolvedClubId));
    }

    const resolvedOppClubId = !String(selectedOpponentClubId || '').trim() ? getParentProjectId(selectedOpponentDetail) : null;
    if (resolvedOppClubId && String(resolvedOppClubId) !== String(selectedOpponentClubId || '')) {
      setSelectedOpponentClubId(String(resolvedOppClubId));
    }

    const resolvedOrgId =
      !String(selectedOrganisationId || '').trim() && selectedTeamDetail
        ? String(
            typeof (selectedTeamDetail as any)?.organisation === 'string'
              ? (selectedTeamDetail as any).organisation
              : (selectedTeamDetail as any)?.organisation?.id || ''
          ).trim()
        : '';

    if (resolvedOrgId) {
      setSelectedOrganisationId(resolvedOrgId);
      if (!String(selectedOpponentOrganisationId || '').trim()) setSelectedOpponentOrganisationId(resolvedOrgId);
    }
  }, [
    opened,
    selectedTeamDetail,
    selectedOpponentDetail,
    selectedTeamId,
    selectedClubId,
    selectedOpponentClubId,
    selectedOrganisationId,
    selectedOpponentOrganisationId,
    teamsOptions,
  ]);

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

  const derived = useMemo(() => {
    const our = getProjectIdentity(selectedTeamDetail);
    const opp = getProjectIdentity(selectedOpponentDetail);

    const ourClub = getProjectIdentity(selectedClubDetail);
    const oppClub = getProjectIdentity(selectedOpponentClubDetail);

    const home = venue === 'Home' ? our : opp;
    const away = venue === 'Home' ? opp : our;

    const homeClub = venue === 'Home' ? ourClub : oppClub;
    const awayClub = venue === 'Home' ? oppClub : ourClub;

    // Use club names for the auto-generated title (e.g. "ASC'62 vs FC Groningen")
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
            ? String(selectedOpponentOrganisationId || selectedOrganisationId)
            : null,
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
    if (homeDisplayName && awayDisplayName) {
      descriptionLines.push(`${homeDisplayName} vs ${awayDisplayName}`);
    }
    if (matchDate || matchTime) {
      const dt = [matchDate, matchTime].filter(Boolean).join(' ');
      if (dt) descriptionLines.push(`Datum/tijd: ${dt}`);
    }
    if (locationDefault) {
      descriptionLines.push(`Locatie: ${locationDefault}`);
    }
    const descriptionDefault = descriptionLines.filter(Boolean).join('\n');

    return {
      titleDefault,
      locationDefault,
      descriptionDefault,
      metadataBase,
    };
  }, [
    venue,
    selectedTeamDetail,
    selectedOpponentDetail,
    selectedClubDetail,
    selectedOpponentClubDetail,
    seasonOptions,
    competitionOptions,
    selectedSeasonId,
    selectedCompetitionId,
    matchDate,
    matchTime,
    selectedOrganisationId,
    selectedClubId,
    selectedTeamId,
    selectedOpponentOrganisationId,
    selectedOpponentTeamId,
    resolvedOpponentClubId,
    resolvedClubId,
  ]);

  // Compute the effective title: use derived club-name title when user hasn't manually edited
  const effectiveTitle = titleTouched ? title : (derived.titleDefault || title);

  useEffect(() => {
    if (!opened) return;
    if (locationTouched) return;
    if (!derived.locationDefault) return;
    if (!location.trim() || location === locationAutoValue) {
      setLocation(derived.locationDefault);
      setLocationAutoValue(derived.locationDefault);
    }
  }, [opened, locationTouched, location, locationAutoValue, derived.locationDefault]);

  useEffect(() => {
    if (!opened) return;
    if (descriptionTouched) return;
    if (!derived.descriptionDefault) return;
    if (!description.trim() || description === descriptionAutoValue) {
      setDescription(derived.descriptionDefault);
      setDescriptionAutoValue(derived.descriptionDefault);
    }
  }, [opened, descriptionTouched, description, descriptionAutoValue, derived.descriptionDefault]);

  useEffect(() => {
    if (!opened) return;
    if (selectedOpponentTeamId && !selectedOpponentClubId) {
      const oppTeam = (opponentTeams || []).find((t) => String(t?.id) === String(selectedOpponentTeamId));
      const parentId = oppTeam ? getParentProjectId(oppTeam) : null;
      if (parentId) setSelectedOpponentClubId(String(parentId));
    }
  }, [opened, selectedOpponentTeamId, selectedOpponentClubId, opponentTeams]);

  // Load federations/organisations so user can select outside current page context.
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
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [opened, apiBaseUrl]);

  const organisationsOptions = useMemo(() => {
    return remoteOrganisations.length ? remoteOrganisations : organisations;
  }, [remoteOrganisations, organisations]);

  const selectedOrganisationSlug = useMemo(() => {
    const orgId = String(selectedOrganisationId || '').trim();
    if (!orgId) return '';
    const org = organisationsOptions.find((o) => String(o.id) === String(orgId));
    return String(org?.slug || '').trim();
  }, [organisationsOptions, selectedOrganisationId]);

  // Load clubs (root projects).
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
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [opened, apiBaseUrl, selectedOrganisationId]);

  // Load teams (child projects).
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

        const rawList = await fetchAllPagesLocal(
          baseUrl,
          { credentials: 'include', signal: abortController.signal },
          3000
        );
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
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [opened, apiBaseUrl, selectedClubId, selectedOrganisationId, selectedOrganisationSlug]);

  const sortedOrganisations = useMemo(() => {
    return [...organisationsOptions].sort((a, b) => a.name.localeCompare(b.name));
  }, [organisationsOptions]);

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

  const getClubOrganisationId = (clubId: string): string | null => {
    const club = clubsOptions.find((c) => String(c.id) === String(clubId));
    if (!club) return null;
    const org = typeof (club as any).organisation === 'string' ? (club as any).organisation : (club as any).organisation?.id;
    return org ? String(org) : null;
  };

  const getTeamParentId = (t: ProjectOption): string | null => getParentProjectId(t);

  const filteredTeams = useMemo(() => {
    const clubId = selectedClubId;
    const list = clubId ? teamsOptions.filter((t) => getTeamParentId(t) === String(clubId)) : teamsOptions;
    return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [teamsOptions, selectedClubId]);

  const getProjectOrganisationId = (p: ProjectOption): string | null => {
    const org = typeof (p as any).organisation === 'string' ? (p as any).organisation : (p as any).organisation?.id;
    return org ? String(org) : null;
  };

  const opponentTeamOptions = useMemo(() => {
    const orgId = String((selectedOpponentOrganisationId || selectedOrganisationId) || '').trim();
    const list = (opponentTeams || []).filter((t) => {
      const tOrg = getProjectOrganisationId(t);
      if (orgId && tOrg && String(tOrg) !== String(orgId)) return false;
      if (selectedOpponentClubId) {
        const parentId = getTeamParentId(t);
        if (!parentId) return false;
        if (String(parentId) !== String(selectedOpponentClubId)) return false;
      }
      if (selectedTeamId && String(t.id) === String(selectedTeamId)) return false;
      return true;
    });
    const unique = [...new Map(list.map((t) => [String(t.id), t])).values()];
    return unique.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [opponentTeams, selectedOrganisationId, selectedOpponentOrganisationId, selectedOpponentClubId, selectedTeamId]);

  const applyClubSelection = (clubId: string) => {
    setSelectedClubId(clubId);
    setSelectedTeamId('');
    setSelectedOpponentTeamId('');
    setSelectedSeasonId('');
    setSelectedCompetitionId('');

    const orgId = clubId ? getClubOrganisationId(clubId) : null;
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
      const orgId = getClubOrganisationId(String(clubId));
      if (orgId) {
        setSelectedOrganisationId(String(orgId));
        setSelectedOpponentOrganisationId(String(orgId));
      }
    }
  };

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

  useEffect(() => {
    if (!opened) return;
    if (!isSeasonDetailMode && !isTeamContextMode) return;

    const orgId = String(selectedOpponentOrganisationId || '').trim();
    if (!orgId) {
      setOpponentClubs([]);
      setSelectedOpponentClubId('');
      return;
    }

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
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [opened, isSeasonDetailMode, isTeamContextMode, apiBaseUrl, selectedOpponentOrganisationId]);

  const combineDateTime = (date: string, time: string): string | null => {
    if (!date || !time) return null;
    // Send as ISO-like string (no timezone). Backend will treat as a datetime.
    return `${date}T${time}:00`;
  };

  const addHoursToIsoLike = (isoLike: string, hours: number): string => {
    const parsed = new Date(isoLike);
    if (Number.isNaN(parsed.getTime())) return isoLike;
    parsed.setHours(parsed.getHours() + hours);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(
      parsed.getMinutes()
    )}:${pad(parsed.getSeconds())}`;
  };

  const projectNameById = (id: string): string | null => {
    if (!id) return null;
    const fromTeams = (teamsOptions || []).find((t) => String(t.id) === String(id));
    if (fromTeams?.name) return String(fromTeams.name);
    const fromOpponents = (opponentTeams || []).find((t) => String(t.id) === String(id));
    if (fromOpponents?.name) return String(fromOpponents.name);
    return null;
  };

  const orgNameById = (id: string): string | null => {
    const key = String(id || '').trim();
    if (!key) return null;
    const found = (sortedOrganisations || []).find((o) => String(o.id) === key);
    return found?.name ? String(found.name) : null;
  };

  const periodNameById = (id: string): string | null => {
    const key = String(id || '').trim();
    if (!key) return null;
    const foundSeason = (seasonOptions || []).find((p) => String(p.id) === key);
    if (foundSeason?.name) return String(foundSeason.name);
    const foundCompetition = (competitionOptions || []).find((p) => String(p.id) === key);
    if (foundCompetition?.name) return String(foundCompetition.name);
    return null;
  };

  useEffect(() => {
    if (!opened) return;
    const orgId = String((selectedOpponentOrganisationId || selectedOrganisationId) || '').trim();
    if (!orgId) {
      setOpponentTeams([]);
      return;
    }

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

  useEffect(() => {
    if (!opened) return;
    if (!selectedOrganisationId || !selectedTeamId) {
      setSeasonOptions([]);
      setSelectedSeasonId('');
      setCompetitionOptions([]);
      setSelectedCompetitionId('');
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
        if (!res.ok) {
          setSeasonOptions([]);
          return;
        }
        const data = await res.json();
        const results = data.data?.data || data.data?.results || data.results || data.data || [];
        const roots = (Array.isArray(results) ? results : []).filter(
          (p: any) => p?.parent_period_id == null && !p?.parent_period
        );
        const unique = [...new Map(roots.map((p: any) => [String(p.id), p])).values()];
        const sorted = unique.sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || '')));
        setSeasonOptions(sorted as any);
      } catch {
        setSeasonOptions([]);
      } finally {
        setLoadingSeasons(false);
      }
    };

    load();
  }, [opened, selectedOrganisationId, selectedTeamId]);

  useEffect(() => {
    if (!opened) return;
    if (!selectedSeasonId && seasonOptions.length === 1 && !isSeasonDetailMode) {
      setSelectedSeasonId(String(seasonOptions[0]?.id || ''));
    }
  }, [opened, selectedSeasonId, seasonOptions, isSeasonDetailMode]);

  useEffect(() => {
    if (!opened) return;
    if (!selectedSeasonId || !selectedOrganisationId || !selectedTeamId) {
      setCompetitionOptions([]);
      setSelectedCompetitionId('');
      return;
    }

    const load = async () => {
      setLoadingCompetitions(true);
      try {
        const apiBaseUrl = getApiBaseUrl();
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('parent_id', String(selectedSeasonId));
        params.set('organisation_id', String(selectedOrganisationId));
        params.set('project_id', String(selectedTeamId));

        const res = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
        if (!res.ok) {
          setCompetitionOptions([]);
          return;
        }
        const data = await res.json();
        const results = data.data?.data || data.data?.results || data.results || data.data || [];
        const list = Array.isArray(results) ? results : [];
        const unique = [...new Map(list.map((p: any) => [String(p.id), p])).values()];
        const sorted = unique.sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || '')));
        setCompetitionOptions(sorted as any);
      } catch {
        setCompetitionOptions([]);
      } finally {
        setLoadingCompetitions(false);
      }
    };

    load();
  }, [opened, selectedSeasonId, selectedOrganisationId, selectedTeamId]);

  useEffect(() => {
    if (!opened) return;
    if (!selectedCompetitionId && competitionOptions.length === 1) {
      setSelectedCompetitionId(String(competitionOptions[0]?.id || ''));
    }
  }, [opened, selectedCompetitionId, competitionOptions]);

  if (!opened) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const effectiveSeasonIdForCreate = String(selectedSeasonId || initialSeasonId || '').trim();
      const effectiveCompetitionIdForCreate = String(selectedCompetitionId || initialCompetitionId || '').trim();

      if (!selectedOrganisationId) throw new Error('Select a federation first.');
      if (!resolvedClubId) throw new Error('Select a club first.');
      if (!selectedTeamId) throw new Error('Select a team first.');
      if (requireOpponent && !selectedOpponentTeamId) throw new Error('Select an opponent first.');
      if (!effectiveSeasonIdForCreate) throw new Error('Select a season first.');
      if (!effectiveCompetitionIdForCreate) throw new Error('Select a competition first.');

      const start = combineDateTime(matchDate, matchTime);
      if (!start) throw new Error('Select a match date and time.');

      // Football match default duration: 2 hours (includes warm-up/overrun)
      const end = addHoursToIsoLike(start, 2);

      const finalTitle = effectiveTitle.trim() || derived.titleDefault || '';
      if (!finalTitle) throw new Error('Enter a title.');

      const finalLocation = (location || derived.locationDefault || '').trim() || undefined;
      const finalDescription = (description || derived.descriptionDefault || '').trim() || undefined;

      const metadataFinal = {
        ...(derived.metadataBase || {}),
        teamreel: {
          ...((derived.metadataBase as any)?.teamreel || {}),
          match_context: {
            ...(((derived.metadataBase as any)?.teamreel || {})?.match_context || {}),
            title: finalTitle,
            venue,
            is_home: venue === 'Home',
            start_time: start,
            end_time: end,
            match_date: matchDate || null,
            match_time: matchTime || null,
            location: finalLocation || null,
            description: finalDescription || null,
          },
          vars: {
            ...(((derived.metadataBase as any)?.teamreel || {})?.vars || {}),
            match_title: finalTitle,
            match_venue: venue,
            match_date: matchDate || null,
            match_time: matchTime || null,
            match_location: finalLocation || null,
          },
        },
      };

      await onCreate({
        title: finalTitle,
        start_time: start,
        end_time: end,
        location: finalLocation,
        description: finalDescription,

        metadata: metadataFinal,

        venue,
        organisation_id: selectedOrganisationId,
        project_id: selectedTeamId,
        opponent_project_id: selectedOpponentTeamId || undefined,
        season_id: effectiveSeasonIdForCreate,
        period_id: effectiveCompetitionIdForCreate,
      });
      setTitle('');
      setTitleTouched(false);
      setTitleAutoValue('');
      setMatchDate('');
      setMatchTime('');
      setLocation('');
      setLocationTouched(false);
      setLocationAutoValue('');
      setDescription('');
      setDescriptionTouched(false);
      setDescriptionAutoValue('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create match');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--app-surface)',
          padding: '24px',
          borderRadius: '8px',
          width: '640px',
          maxWidth: '95%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--app-text)' }}>{headerText || 'Create Match'}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              height: 'fit-content',
            }}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleCreate}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 16px' }}>
            <label style={{ fontWeight: 600 }} htmlFor="match-create-title">
              Title
            </label>
            {isTeamContextMode ? (
              <div style={{ ...controlStyle(true), cursor: 'default' }}>{effectiveTitle || '—'}</div>
            ) : (
              <input
                id="match-create-title"
                value={effectiveTitle}
                onChange={(e) => {
                  setTitleTouched(true);
                  setTitle(e.target.value);
                }}
                required
                disabled={isSaving}
                style={{
                  ...controlStyle(Boolean(isSaving)),
                  cursor: isSaving ? 'not-allowed' : 'text',
                }}
              />
            )}

            <label style={{ fontWeight: 600 }} htmlFor="match-create-org">
              Federation
            </label>
            {isTeamContextMode && selectedOrganisationId ? (
              <div style={{ ...controlStyle(true), cursor: 'default' }}>{orgNameById(selectedOrganisationId) || '—'}</div>
            ) : (
              <select
                id="match-create-org"
                value={selectedOrganisationId}
                onChange={(e) => {
                  setSelectedOrganisationId(e.target.value);
                  setSelectedOpponentOrganisationId(e.target.value);
                  setSelectedOpponentClubId('');
                  setSelectedClubId('');
                  setSelectedTeamId('');
                  setSelectedOpponentTeamId('');
                  setSelectedSeasonId('');
                  setSelectedCompetitionId('');
                  setOpponentTeams([]);
                }}
                disabled={isSaving || isSeasonDetailMode}
                required
                style={controlStyle(Boolean(isSaving || isSeasonDetailMode))}
              >
                <option value="">Select federation…</option>
                {sortedOrganisations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}

            <label style={{ fontWeight: 600 }} htmlFor="match-create-club">
              Club
            </label>
            {isTeamContextMode && resolvedClubId ? (
              <div style={{ ...controlStyle(true), cursor: 'default' }}>{projectNameById(resolvedClubId) || '—'}</div>
            ) : (
              <select
                id="match-create-club"
                value={selectedClubId}
                onChange={(e) => applyClubSelection(e.target.value)}
                disabled={isSaving || isSeasonDetailMode}
                required
                style={controlStyle(Boolean(isSaving || isSeasonDetailMode))}
              >
                <option value="">Select club…</option>
                {filteredClubs.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            <label style={{ fontWeight: 600 }} htmlFor="match-create-team">
              Team
            </label>
            {isTeamContextMode && selectedTeamId ? (
              <div style={{ ...controlStyle(true), cursor: 'default' }}>{projectNameById(selectedTeamId) || '—'}</div>
            ) : (
              <select
                id="match-create-team"
                value={selectedTeamId}
                onChange={(e) => applyTeamSelection(e.target.value)}
                disabled={isSaving || isSeasonDetailMode}
                required
                style={controlStyle(Boolean(isSaving || isSeasonDetailMode))}
              >
                <option value="">Select team…</option>
                {filteredTeams.map((t) => (
                  <option key={String(t.id)} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            <label style={{ fontWeight: 600 }} htmlFor="match-create-season">
              Season
            </label>
            {isTeamContextMode ? (
              <div style={{ ...controlStyle(true), cursor: 'default' }}>
                {periodNameById(String(selectedSeasonId || initialSeasonId || '')) || 'Loading…'}
              </div>
            ) : (
              <select
                id="match-create-season"
                value={selectedSeasonId}
                onChange={(e) => {
                  setSelectedSeasonId(e.target.value);
                  setSelectedCompetitionId('');
                }}
                disabled={isSaving || loadingSeasons || isSeasonDetailMode}
                required
                style={controlStyle(Boolean(isSaving || loadingSeasons || isSeasonDetailMode))}
              >
                <option value="">{loadingSeasons ? 'Loading seasons…' : 'Select season…'}</option>
                {seasonOptions.map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            <label style={{ fontWeight: 600 }} htmlFor="match-create-competition">
              Competition
            </label>
            {isTeamContextMode ? (
              <div style={{ ...controlStyle(true), cursor: 'default' }}>
                {periodNameById(String(selectedCompetitionId || initialCompetitionId || '')) || 'Loading…'}
              </div>
            ) : (
              <select
                id="match-create-competition"
                value={selectedCompetitionId}
                onChange={(e) => setSelectedCompetitionId(e.target.value)}
                disabled={isSaving || loadingCompetitions}
                required
                style={controlStyle(Boolean(isSaving || loadingCompetitions))}
              >
                <option value="">{loadingCompetitions ? 'Loading competitions…' : 'Select competition…'}</option>
                {competitionOptions.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            <label style={{ fontWeight: 600 }} htmlFor="match-create-location">
              Location
            </label>
            {isTeamContextMode ? (
              <div style={{ ...controlStyle(true), cursor: 'default' }}>{(location || derived.locationDefault || '').trim() || '—'}</div>
            ) : (
              <input
                id="match-create-location"
                value={location}
                onChange={(e) => {
                  setLocationTouched(true);
                  setLocation(e.target.value);
                }}
                disabled={isSaving}
                style={{
                  ...controlStyle(Boolean(isSaving)),
                  cursor: isSaving ? 'not-allowed' : 'text',
                }}
              />
            )}

            {(isSeasonDetailMode || isTeamContextMode) ? (
              <>
                <label style={{ fontWeight: 600 }} htmlFor="match-create-opponent-org">
                  Opponent Federation
                </label>
                <select
                  id="match-create-opponent-org"
                  value={selectedOpponentOrganisationId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSelectedOpponentOrganisationId(next);
                    setSelectedOpponentClubId('');
                    setSelectedOpponentTeamId('');
                  }}
                  disabled={isSaving}
                  style={controlStyle(Boolean(isSaving))}
                >
                  <option value="">(Optional) Select federation…</option>
                  {sortedOrganisations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>

                <label style={{ fontWeight: 600 }} htmlFor="match-create-opponent-club">
                  Opponent Club
                </label>
                <select
                  id="match-create-opponent-club"
                  value={selectedOpponentClubId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSelectedOpponentClubId(next);
                    setSelectedOpponentTeamId('');
                  }}
                  disabled={isSaving || loadingOpponentClubs || !selectedOpponentOrganisationId}
                  style={controlStyle(Boolean(isSaving || loadingOpponentClubs || !selectedOpponentOrganisationId))}
                >
                  <option value="">(Optional) Select club…</option>
                  {filteredOpponentClubs.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <label style={{ fontWeight: 600 }} htmlFor="match-create-opponent">
                  Opponent Team
                </label>
                <select
                  id="match-create-opponent"
                  value={selectedOpponentTeamId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSelectedOpponentTeamId(nextId);
                  }}
                  disabled={isSaving || loadingOpponentTeams || !selectedOpponentOrganisationId}
                  required={requireOpponent}
                  style={controlStyle(Boolean(isSaving || loadingOpponentTeams || !selectedOpponentOrganisationId))}
                >
                  <option value="">{loadingOpponentTeams ? 'Loading opponents…' : 'Select opponent…'}</option>
                  {opponentTeamOptions.map((t) => (
                    <option key={String(t.id)} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label style={{ fontWeight: 600 }} htmlFor="match-create-opponent">
                  Opponent
                </label>
                <select
                  id="match-create-opponent"
                  value={selectedOpponentTeamId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSelectedOpponentTeamId(nextId);
                  }}
                  disabled={isSaving || loadingOpponentTeams || !selectedOrganisationId}
                  required
                  style={controlStyle(Boolean(isSaving || loadingOpponentTeams || !selectedOrganisationId))}
                >
                  <option value="">{loadingOpponentTeams ? 'Loading opponents…' : 'Select opponent…'}</option>
                  {opponentTeamOptions.map((t) => (
                    <option key={String(t.id)} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label style={{ fontWeight: 600 }} htmlFor="match-create-venue">
              Venue
            </label>
            <select
              id="match-create-venue"
              value={venue}
              onChange={(e) => {
                const next = (e.target.value === 'Away' ? 'Away' : 'Home') as 'Home' | 'Away';
                setVenue(next);
              }}
              disabled={isSaving}
              style={controlStyle(Boolean(isSaving))}
            >
              <option value="Home">Home</option>
              <option value="Away">Away</option>
            </select>

            <label style={{ fontWeight: 600 }} htmlFor="match-create-date">
              Date
            </label>
            <input
              id="match-create-date"
              type="date"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              disabled={isSaving}
              required
              style={{
                ...controlStyle(Boolean(isSaving)),
                cursor: isSaving ? 'not-allowed' : 'text',
              }}
            />

            <label style={{ fontWeight: 600 }} htmlFor="match-create-time">
              Time
            </label>
            <input
              id="match-create-time"
              type="time"
              value={matchTime}
              onChange={(e) => setMatchTime(e.target.value)}
              disabled={isSaving}
              required
              style={{
                ...controlStyle(Boolean(isSaving)),
                cursor: isSaving ? 'not-allowed' : 'text',
              }}
            />

            <label style={{ fontWeight: 600 }} htmlFor="match-create-description">
              Description
            </label>
            {isTeamContextMode ? (
              <div style={{ ...controlStyle(true), cursor: 'default' }}>{(description || derived.descriptionDefault || '').trim() || '—'}</div>
            ) : (
              <textarea
                id="match-create-description"
                value={description}
                onChange={(e) => {
                  setDescriptionTouched(true);
                  setDescription(e.target.value);
                }}
                rows={5}
                disabled={isSaving}
                style={{
                  ...controlStyle(Boolean(isSaving)),
                  cursor: isSaving ? 'not-allowed' : 'text',
                  resize: 'vertical',
                }}
              />
            )}
          </div>

          {error && <div style={{ marginTop: '12px', color: 'var(--app-danger, #d32f2f)' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #1e5aa5',
                backgroundColor: '#2563eb',
                color: '#fff',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? (submitText ? `${submitText}…` : 'Creating…') : submitText || 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
