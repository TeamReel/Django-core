import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useSports } from '../../../hooks/useSports';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card, Button, Badge } from '@django-core/design-system';
import LoadingState from '../../../components/LoadingState';
import { Table } from '@/shims/design-system';
import { fetchAllPages, invalidateFetchAllPagesCache } from '../../../utils/fetchAllPages';
import { getApiBaseUrl } from '../../../utils/apiBase';
import { periodPathKey } from '../../../utils/periodPath';
import { OrganisationOption, ProjectOption } from '../../work/WorkFilterBar';
import MatchDetailModal from '../MatchDetailModal';
import MatchEditModal from '../MatchEditModal';
import MatchCreateModal from '../MatchCreateModal';
import {
    compactTableStyle,
    compactThStyle,
    compactTdStyle,
    compactTextTdStyle,
    compactActionsStyle,
    actionButtonStyle
} from '../../../utils/directoryStyles';
import MobileFilterSheet from '../../../components/MobileFilterSheet';

type Activity = {
  id: string;
  title: string;
  activity_type: string;
  start_time?: string;
  end_time?: string;
  project?: { id: string; name: string } | null;
  period?: {
    id: string;
    name: string;
    parent_period?: { id: string; name: string; slug?: string; };
    slug?: string;
  } | null;
  organisation?: { id: string; name: string; slug: string } | null;
  data?: Record<string, any>;
};

const chunkArray = <T,>(items: T[], chunkSize: number): T[][] => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const size = Math.max(1, Math.floor(chunkSize));
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

interface MatchesListProps {
  preselectedOrgId?: string;
  preselectedClubId?: string;
  preselectedTeamId?: string;
}

export const MatchesList: React.FC<MatchesListProps> = ({ preselectedOrgId, preselectedClubId, preselectedTeamId }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { context, organisations: myOrganisations } = useContextSwitcher();

  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';

  const orgLocked = Boolean(preselectedOrgId);
  const clubLocked = Boolean(preselectedClubId);
  const teamLocked = Boolean(preselectedTeamId);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ProjectOption[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);

  // When org-locked, we receive an org UUID (not a slug). Some endpoints use org slug.
  // Resolve and pin the slug so we never fall back to context org or global project lists.
  const [lockedOrgSlug, setLockedOrgSlug] = useState<string>('');

  const [selectedOrgId, setSelectedOrgId] = useState<string>(() =>
    preselectedOrgId ? String(preselectedOrgId) : '',
  );
  const [selectedClubId, setSelectedClubId] = useState<string>(preselectedClubId ? String(preselectedClubId) : '');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(preselectedTeamId ? String(preselectedTeamId) : '');
  const [selectedSeasonName, setSelectedSeasonName] = useState<string>('');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [variantFilter, setVariantFilter] = useState<string>('all');

  const [seasons, setSeasons] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);

  const { categories, variants, getVariantsForCategory } = useSports();

  const [matches, setMatches] = useState<Activity[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Loading *all* matches for large federations can be expensive.
  // Default to a sane limit; allow the user to load more or all.
  const [matchesMaxItems, setMatchesMaxItems] = useState<number | null>(500);

  // Modal state
  const [detailMatch, setDetailMatch] = useState<Activity | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editMatch, setEditMatch] = useState<Activity | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const create = String(searchParams.get('create') || '').trim().toLowerCase();
    if (create !== 'match') return;

    setIsCreateModalOpen(true);

    // Remove param once consumed so refresh/back doesn't keep reopening.
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const isNumericId = (value: unknown) => /^\d+$/.test(String(value ?? '').trim());
  const isUuid = (value: unknown) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value || ''),
    );

  useEffect(() => {
    if (!orgLocked) {
      if (lockedOrgSlug) setLockedOrgSlug('');
      return;
    }

    const rawLockedId = String(preselectedOrgId || '').trim();
    if (!rawLockedId) return;

    // If the lock key is already a slug, keep it.
    if (!isNumericId(rawLockedId) && !isUuid(rawLockedId)) {
      setLockedOrgSlug(rawLockedId);
      return;
    }

    // Prefer already-known org options.
    const fromList = organisations.find((o) => String(o.id) === String(rawLockedId))?.slug;
    if (fromList) {
      setLockedOrgSlug(String(fromList));
      return;
    }

    // Fallback: resolve UUID -> slug via organisations list (detail lookup_field is slug).
    let cancelled = false;
    const loadSlug = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/organisations/?page_size=250`, { credentials: 'include' });
        if (!res.ok) return;
        const raw: any = await res.json().catch(() => null);
        const data: any = raw?.data ?? raw;
        const list: any[] = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        const match = list.find((o: any) => String(o?.id || '') === String(rawLockedId));
        const slug = String(match?.slug || '').trim();
        if (!cancelled && slug) setLockedOrgSlug(slug);
      } catch {
        // ignore
      }
    };

    void loadSlug();
    return () => {
      cancelled = true;
    };
  }, [orgLocked, preselectedOrgId, organisations]);

  useEffect(() => {
    if (preselectedClubId) {
      setSelectedClubId(String(preselectedClubId));
    }
  }, [preselectedClubId]);

  useEffect(() => {
    if (preselectedTeamId) {
      setSelectedTeamId(String(preselectedTeamId));
    }
  }, [preselectedTeamId]);

  const getSelectedOrgSlugForApi = () => {
    const selectedOrg = selectedOrgId
      ? organisations.find((o) => String(o.id) === String(selectedOrgId) || o.slug === selectedOrgId)
      : null;

    // If user selected an org by ID but we can't find it in the list yet,
    // wait for organisations to load rather than falling back to context org.
    if (selectedOrgId && !selectedOrg) {
      return '';
    }

    if (orgLocked) {
      return (
        (selectedOrg as any)?.slug ||
        lockedOrgSlug ||
        ''
      );
    }

    return (
      (selectedOrg as any)?.slug ||
      (!selectedOrgId ? context.organisation?.slug : '') ||
      ''
    );
  };

  const getSelectedOrgIdForApi = () => {
    const selectedOrg = selectedOrgId
      ? organisations.find((o) => String(o.id) === String(selectedOrgId) || o.slug === selectedOrgId)
      : null;
    const resolved = selectedOrg ? String((selectedOrg as any).id ?? '') : '';
    if (resolved && isUuid(resolved)) return resolved;
    if (selectedOrgId && isUuid(selectedOrgId)) return String(selectedOrgId);
    return '';
  };

  const loadMatchesSeqRef = useRef(0);

  // Initialize org filter
  useEffect(() => {
    if (preselectedOrgId) {
      setSelectedOrgId(preselectedOrgId);
    } else if (!isSuperAdmin && context.organisation?.id) {
      setSelectedOrgId(String(context.organisation.id));
    }
  }, [preselectedOrgId, context.organisation?.id, isSuperAdmin]);

  // When the federation changes, reset match list + limit to avoid showing stale data.
  useEffect(() => {
    setMatches([]);
    setMatchesMaxItems(500);
  }, [selectedOrgId]);

  useEffect(() => {
    if (preselectedOrgId) {
      const clubId = searchParams.get('club_id');
      const teamId = searchParams.get('team_id');
      if (!clubLocked && clubId) setSelectedClubId(String(clubId));
      if (!teamLocked && !clubLocked && teamId) setSelectedTeamId(String(teamId));
      return;
    }

    const orgId = searchParams.get('org_id');
    const clubId = searchParams.get('club_id');
    const teamId = searchParams.get('team_id');

    if (orgId && isSuperAdmin) setSelectedOrgId(String(orgId));
    if (!clubLocked && clubId) setSelectedClubId(String(clubId));
    if (!teamLocked && !clubLocked && teamId) setSelectedTeamId(String(teamId));
  }, [isSuperAdmin, searchParams, preselectedOrgId, clubLocked]);

  const getTeamParentId = (t: any): string | null => {
    const parent =
      t?.parent_id ??
      t?.parent ??
      t?.parent_project_id ??
      (typeof t?.parent_project === 'object' ? t?.parent_project?.id : t?.parent_project);
    if (parent == null) return null;
    return String(typeof parent === 'object' ? parent.id : parent);
  };

  const seasonOptions = useMemo(() => {
    const byName = new Map<string, { name: string; ids: string[] }>();
    for (const s of seasons) {
      const name = String((s as any)?.name || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const id = String((s as any)?.id);
      const existing = byName.get(key);
      if (!existing) {
        byName.set(key, { name, ids: [id] });
      } else if (!existing.ids.includes(id)) {
        existing.ids.push(id);
      }
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [seasons]);

  const selectedSeasonIds = useMemo(() => {
    if (!selectedSeasonName) return [];
    const match = seasonOptions.find((o) => o.name === selectedSeasonName);
    return match?.ids || [];
  }, [selectedSeasonName, seasonOptions]);

  useEffect(() => {
    // Always fetch organisations from API to get sport data (context-switcher doesn't include it)
    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const myOrgIds = myOrganisations.map(o => String(o.id));

        const orgs = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/organisations/?page_size=100`,
          { credentials: 'include' },
          { ttlMs: 120_000, bypass: refreshKey > 0 },
        );

        // For non-superadmin, filter to only their orgs (API should already do this, but be safe)
        const filteredOrgs = isSuperAdmin
          ? orgs
          : (orgs || []).filter((o: any) => myOrgIds.includes(String(o.id)));

        setOrganisations((filteredOrgs || []).map((o: any) => ({ id: String(o.id), name: o.name, slug: o.slug, sport: o.sport, sport_variants_count: o.sport_variants_count })));
      } catch {
        // Fallback to context data if API fails
        setOrganisations(myOrganisations.map((o) => ({ id: String(o.id), name: o.name, slug: (o as any).slug, sport: (o as any).sport })));
      }
    };

    load();
  }, [isSuperAdmin, myOrganisations, refreshKey]);

  // Fetch options
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const apiBaseUrl = getApiBaseUrl();

      try {
        const orgSlugForApi = getSelectedOrgSlugForApi();
        // If federation is locked but slug isn't resolved yet, wait.
        // Never fall back to global projects here (would leak cross-federation mapping).
        if (orgLocked && !orgSlugForApi) {
          setClubs([]);
          setTeams([]);
          return;
        }

        if (orgSlugForApi) {
          const [allClubs, allTeams] = await Promise.all([
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/api/v1/organisations/${orgSlugForApi}/projects/?page_size=500&include_archived=true&parent_project__isnull=true`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            ),
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/api/v1/organisations/${orgSlugForApi}/projects/?page_size=2000&include_archived=true&parent_project__isnull=false`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            ),
          ]);
          setClubs(allClubs);
          setTeams(allTeams);
          return;
        }

        if (!orgLocked) {
          const [allClubs, allTeams] = await Promise.all([
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=true`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            ),
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=false`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            ),
          ]);
          setClubs(allClubs);
          setTeams(allTeams);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load options');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [context.organisation?.slug, organisations, refreshKey, selectedOrgId, orgLocked, lockedOrgSlug]);

  const filteredMatches = useMemo(() => {
    let list = matches;

    // Client-side club/team filtering (safety net for race conditions)
    if (selectedTeamId) {
      list = list.filter((m) => String((m as any)?.project?.id) === String(selectedTeamId));
    } else if (selectedClubId && teams.length > 0) {
      const clubTeamIds = new Set(
        teams
          .filter((t) => getTeamParentId(t) === String(selectedClubId))
          .map((t) => String(t.id))
      );
      if (clubTeamIds.size > 0) {
        list = list.filter((m) => clubTeamIds.has(String((m as any)?.project?.id)));
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      const now = new Date();
      const isUpcoming = (m: Activity) => {
        if (!m.start_time) return false;
        const dt = new Date(m.start_time);
        return dt.getTime() >= now.getTime();
      };
      if (statusFilter === 'active') {
        list = list.filter(isUpcoming);
      } else {
        list = list.filter((m) => !isUpcoming(m));
      }
    }

    // Sport category filter - match organisation's sport category
    if (sportFilter !== 'all') {
      list = list.filter((match) => {
        // Try to get sport from match's period first (competition-level sport)
        const periodSportId = (match as any)?.period?.sport?.id;
        const periodSportCategoryId = (match as any)?.period?.sport?.parent_sport_id || periodSportId;
        if (periodSportCategoryId && String(periodSportCategoryId) === String(sportFilter)) return true;

        // Fallback: get sport from organisation (organisation-level category)
        const nestedOrg = (match as any)?.organisation;
        const nestedSportId = nestedOrg && typeof nestedOrg === 'object' ? nestedOrg?.sport?.id : undefined;
        if (nestedSportId && String(nestedSportId) === String(sportFilter)) return true;

        // Last fallback: look up organisation in loaded list
        const orgId =
          (nestedOrg && typeof nestedOrg === 'object' ? nestedOrg?.id : nestedOrg) ||
          (match as any)?.organisation_id;
        const org = orgId ? organisations.find((o) => String(o.id) === String(orgId)) : undefined;
        const orgSportId = (org as any)?.sport?.id;
        return orgSportId && String(orgSportId) === String(sportFilter);
      });
    }

    // Sport variant filter
    if (variantFilter !== 'all') {
      list = list.filter((match) => (match as any).period?.sport?.id === variantFilter);
    }

    return list;
  }, [matches, statusFilter, sportFilter, variantFilter, organisations, selectedTeamId, selectedClubId, teams]);

  const sortedMatches = useMemo(() => {
    const sortKey = (value: unknown) => {
      const s = String(value ?? '').trim();
      return s ? s.toLocaleLowerCase() : '\uffff';
    };

    const getFederationName = (m: Activity) => {
      const orgId =
        selectedOrgId ||
        (m as any)?.organisation?.id ||
        (m as any)?.organisation_id ||
        undefined;
      const org = orgId ? organisations.find((o) => String(o.id) === String(orgId)) : undefined;
      return (m as any)?.organisation?.name || org?.name || '';
    };

    const getTeamId = (m: Activity) => String((m as any)?.project?.id || '');
    const getTeamName = (m: Activity) => String((m as any)?.project?.name || '');

    const getClubName = (m: Activity) => {
      const teamId = getTeamId(m);
      const teamObj = teams.find((t) => String(t.id) === String(teamId));
      const clubId = (teamObj as any)?.parent_id || (teamObj as any)?.parent || (teamObj as any)?.parent_project_id;
      const club = clubs.find((c) => String(c.id) === String(clubId));
      return club?.name || '';
    };

    const getSeasonName = (m: Activity) => String((m as any)?.period?.parent_period?.name || '');
    const getCompetitionName = (m: Activity) => String((m as any)?.period?.name || '');
    const getMatchName = (m: Activity) => String((m as any)?.title || '');

    const list = [...filteredMatches];
    list.sort((a, b) => {
      const byFederation = sortKey(getFederationName(a)).localeCompare(sortKey(getFederationName(b)));
      if (byFederation !== 0) return byFederation;
      const byClub = sortKey(getClubName(a)).localeCompare(sortKey(getClubName(b)));
      if (byClub !== 0) return byClub;
      const byTeam = sortKey(getTeamName(a)).localeCompare(sortKey(getTeamName(b)));
      if (byTeam !== 0) return byTeam;
      const bySeason = sortKey(getSeasonName(a)).localeCompare(sortKey(getSeasonName(b)));
      if (bySeason !== 0) return bySeason;
      const byCompetition = sortKey(getCompetitionName(a)).localeCompare(sortKey(getCompetitionName(b)));
      if (byCompetition !== 0) return byCompetition;
      return sortKey(getMatchName(a)).localeCompare(sortKey(getMatchName(b)));
    });
    return list;
  }, [filteredMatches, organisations, clubs, teams, selectedOrgId]);

  // Fetch Seasons
  useEffect(() => {
    const loadSeasons = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const baseParams = new URLSearchParams();
        baseParams.set('page_size', '500');
        baseParams.set('parent_id', 'null'); // Top-level periods = Seasons
        baseParams.set('type', 'season');

        if (selectedTeamId) {
          baseParams.set('project_id', selectedTeamId);
        } else if (selectedClubId && teams.length > 0) {
          const clubTeams = teams.filter((t) => getTeamParentId(t) === String(selectedClubId));
          if (clubTeams.length > 0) {
            const teamIds = clubTeams.map((t) => String(t.id));
            const chunks = chunkArray(teamIds, 25);
            const results = (
              await Promise.all(
                chunks.map(async (ids) => {
                  const params = new URLSearchParams(baseParams);
                  params.set('project_id__in', ids.join(','));
                  return await fetchAllPages<any>(
                    `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
                    { credentials: 'include' },
                    { ttlMs: 120_000, bypass: refreshKey > 0 },
                  );
                }),
              )
            ).flat();

            const roots = (Array.isArray(results) ? results : []).filter(
              (p: any) => p?.parent_period_id == null && !p?.parent_period,
            );
            setSeasons(roots);
            return;
          } else {
            setSeasons([]);
            return;
          }
        } else if (selectedOrgId) {
          // Periods are often team-scoped (project_id set) and may not have organisation_id
          // populated. Prefer scoping by all teams in the selected org.
          if (teams.length > 0) {
            const teamIds = teams.map((t) => String(t.id)).filter(Boolean);
            const chunks = chunkArray(teamIds, 25);
            const results = (
              await Promise.all(
                chunks.map(async (ids) => {
                  const params = new URLSearchParams(baseParams);
                  params.set('project_id__in', ids.join(','));
                  return await fetchAllPages<any>(
                    `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
                    { credentials: 'include' },
                    { ttlMs: 120_000, bypass: refreshKey > 0 },
                  );
                }),
              )
            ).flat();

            const roots = (Array.isArray(results) ? results : []).filter(
              (p: any) => p?.parent_period_id == null && !p?.parent_period,
            );
            setSeasons([...new Map(roots.map((p: any) => [String(p.id), p])).values()]);
            return;
          }

          // Fallback if teams not loaded
          baseParams.set('organisation_id', selectedOrgId);
        }

        const results = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/periods/?${baseParams.toString()}`,
          { credentials: 'include' },
          { ttlMs: 120_000, bypass: refreshKey > 0 },
        );

        const roots = (Array.isArray(results) ? results : []).filter(
          (p: any) => p?.parent_period_id == null && !p?.parent_period
        );
        setSeasons(roots);
      } catch {
        setSeasons([]);
      }
    };
    loadSeasons();
  }, [selectedTeamId, selectedClubId, selectedOrgId, teams, refreshKey]);

  // Fetch Competitions
  useEffect(() => {
     if (!selectedSeasonName) {
         setCompetitions([]);
         return;
     }
     const loadCompetitions = async () => {
         const apiBaseUrl = getApiBaseUrl();
         try {
             const seasonIds = selectedSeasonIds;
             if (seasonIds.length === 0) {
               setCompetitions([]);
               return;
             }

              const teamIdsForOrg =
                selectedOrgId && !selectedClubId && !selectedTeamId
                  ? teams.map((t) => String(t.id)).filter(Boolean)
                  : null;

              const fetchWithTeamChunks = async (baseParams: URLSearchParams, teamIds: string[]) => {
                const chunks = chunkArray(teamIds, 25);
                const results = (
                  await Promise.all(
                    chunks.map(async (ids) => {
                      const params = new URLSearchParams(baseParams);
                      params.set('project_id__in', ids.join(','));
                      return await fetchAllPages<any>(
                        `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
                        { credentials: 'include' },
                        { ttlMs: 120_000, bypass: refreshKey > 0 },
                      );
                    }),
                  )
                ).flat();
                return [...new Map(results.map((c: any) => [String(c.id), c])).values()];
              };

             const requests = seasonIds.map(async (seasonId) => {
               const params = new URLSearchParams();
                 params.set('page_size', '300');
               params.set('parent_id', seasonId);
                 params.set('type', 'competition');
               if (selectedTeamId) {
                 params.set('project_id', String(selectedTeamId));
               } else if (selectedClubId && teams.length > 0) {
                 const clubTeams = teams.filter((t) => getTeamParentId(t) === String(selectedClubId));
                 if (clubTeams.length > 0) {
                   params.set('project_id__in', clubTeams.map((t) => String(t.id)).join(','));
                 }
              } else if (teamIdsForOrg && teamIdsForOrg.length > 0) {
                // Prefer team-scoped filtering over organisation_id.
                return await fetchWithTeamChunks(params, teamIdsForOrg);
              } else if (selectedOrgId) {
                const orgIdForApi = getSelectedOrgIdForApi();
                if (orgIdForApi) params.set('organisation_id', orgIdForApi);
               }

                  return await fetchAllPages<any>(
                  `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
                  { credentials: 'include' },
                    { ttlMs: 120_000, bypass: refreshKey > 0 },
                );
             });

             const all = (await Promise.all(requests)).flat();
             const unique = [...new Map(all.map((c: any) => [String(c.id), c])).values()];
             setCompetitions(unique as any);
         } catch {
             setCompetitions([]);
         }
     };
     loadCompetitions();
  }, [selectedSeasonName, selectedSeasonIds, selectedOrgId, selectedClubId, selectedTeamId, teams]);

  // Fetch matches
  useEffect(() => {
    const loadMatches = async () => {
      const seq = (loadMatchesSeqRef.current += 1);
      setMatchesLoading(true);
      const apiBaseUrl = getApiBaseUrl();

      try {
        // On org-locked pages, do not run an initial unscoped query before selectedOrgId is set.
        if (orgLocked && !selectedOrgId) {
          setMatches([]);
          return;
        }

        const orgIdForApi = getSelectedOrgIdForApi();

        // If a federation is selected but we can't resolve its UUID yet (e.g. org list
        // still loading), don't run an unscoped query.
        if (selectedOrgId && !orgIdForApi) {
          setMatches([]);
          return;
        }

        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('activity_type', 'match');
        params.set('ordering', '-start_time');

        if (selectedTeamId) {
          params.set('project_id', String(selectedTeamId));
        } else if (selectedClubId && teams.length > 0) {
          const clubTeams = teams.filter((t) => getTeamParentId(t) === String(selectedClubId));
          if (clubTeams.length === 0) {
            setMatches([]);
            return;
          }
          params.set('project_id__in', clubTeams.map((t) => String(t.id)).join(','));
        }

        // Federation scoping: ActivityViewSet filters organisation_id indirectly via project.
        if (orgIdForApi) params.set('organisation_id', orgIdForApi);

        // Filter by Season or Competition
        if (selectedCompetitionId) {
          params.set('period_id', selectedCompetitionId);
        } else if (selectedSeasonIds.length === 1) {
          // Matches live under competition periods; include descendants to capture all comps in this season.
          params.set('period_id', selectedSeasonIds[0]);
          params.set('include_descendants', 'true');
        }

        const all = await fetchAllPages<Activity>(
          `${apiBaseUrl}/api/v1/activities/?${params.toString()}`,
          { credentials: 'include' },
          {
            ttlMs: 20_000,
            bypass: refreshKey > 0,
            cacheKey: `matches:${params.toString()}:max:${matchesMaxItems ?? 'all'}`,
            maxItems: matchesMaxItems ?? undefined,
          },
        );

        // Avoid stale late-arriving requests overwriting the newest selection.
        if (seq !== loadMatchesSeqRef.current) return;

        // Strict org guard based on serializer-provided organisation.
        // This protects against any accidental unscoped fetches / caching races.
        const guardedByOrg = orgIdForApi
          ? all.filter((m) => String((m as any)?.organisation?.id || '') === String(orgIdForApi))
          : all;

        // Final safety guard: when org-locked, only show matches for teams that belong
        // to the locked org (prevents UI leaks if any upstream filter/mapping fails).
        const guarded = (() => {
          if (!orgLocked) return guardedByOrg;
          if (teams.length === 0) return [];

          const allowedTeamIds = new Set(
            selectedTeamId
              ? [String(selectedTeamId)]
              : selectedClubId
                ? teams
                    .filter((t) => getTeamParentId(t) === String(selectedClubId))
                    .map((t) => String((t as any).id))
                : teams.map((t) => String((t as any).id)),
          );

          return guardedByOrg.filter((m) => allowedTeamIds.has(String((m as any)?.project?.id || '')));
        })();

        // If season selection maps to multiple season ids (duplicate season names across teams),
        // apply the season filter client-side to keep dropdown unique by name.
        if (selectedSeasonIds.length > 1 && selectedSeasonName) {
          const filtered = guarded.filter((m) => {
            const seasonName = (m as any)?.period?.parent_period?.name;
            return String(seasonName || '').trim() === selectedSeasonName;
          });
          setMatches(filtered);
        } else {
          setMatches(guarded);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load matches');
      } finally {
        if (seq === loadMatchesSeqRef.current) setMatchesLoading(false);
      }
    };

    loadMatches();
  }, [
    selectedTeamId,
    selectedClubId,
    selectedOrgId,
    selectedSeasonName,
    selectedSeasonIds,
    selectedCompetitionId,
    teams,
    refreshKey,
    matchesMaxItems,
  ]);

  const getCsrfToken = () =>
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1];

  const activeFilterCount = [
    selectedOrgId !== '',
    !clubLocked && selectedClubId !== '',
    !teamLocked && selectedTeamId !== '',
    selectedSeasonName !== '',
    selectedCompetitionId !== '',
    statusFilter !== 'all',
    sportFilter !== 'all',
    variantFilter !== 'all',
  ].filter(Boolean).length;

  return (
    <div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <MobileFilterSheet activeFilterCount={activeFilterCount}>
        {isSuperAdmin && !orgLocked && (
          <select
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value);
              if (!clubLocked) setSelectedClubId('');
              if (!teamLocked) setSelectedTeamId('');
              setSelectedSeasonName('');
              setSelectedCompetitionId('');
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--app-border)',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: 'var(--app-surface)',
            }}
          >
            <option value="">Federation: All</option>
            {[...organisations].sort((a, b) => a.name.localeCompare(b.name)).map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        )}
        {!clubLocked && (
          <select
            value={selectedClubId}
            onChange={(e) => {
              if (clubLocked) return;
              setSelectedClubId(e.target.value);
              if (!teamLocked) setSelectedTeamId('');
              setSelectedSeasonName('');
              setSelectedCompetitionId('');
            }}
            disabled={clubLocked}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--app-border)',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: 'var(--app-surface)',
            }}
          >
            {!clubLocked && <option value="">Club: All</option>}
            {clubs
              .filter((c) => {
                if (!selectedOrgId) return true;
                const cOrg = typeof c.organisation === 'string' ? c.organisation : c.organisation?.id;
                return String(cOrg) === String(selectedOrgId);
              })
              .slice()
              .sort((a, b) => String(a.name).localeCompare(String(b.name)))
              .map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
          </select>
        )}
        {!teamLocked && (
          <select
            value={selectedTeamId}
            onChange={(e) => {
              if (teamLocked) return;
              setSelectedTeamId(e.target.value);
              setSelectedSeasonName('');
              setSelectedCompetitionId('');
            }}
            disabled={teamLocked}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--app-border)',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: 'var(--app-surface)',
            }}
          >
            {!teamLocked && <option value="">Team: All</option>}
            {teams
              .filter((t) => {
                if (!selectedClubId) return true;
                return getTeamParentId(t) === String(selectedClubId);
              })
              .slice()
              .sort((a, b) => String(a.name).localeCompare(String(b.name)))
              .map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
          </select>
        )}

        <select
          value={selectedSeasonName}
            onChange={(e) => {
            setSelectedSeasonName(e.target.value);
                setSelectedCompetitionId('');
            }}
            style={{
                padding: '8px 12px',
                border: '1px solid var(--app-border)',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: 'var(--app-surface)',
                maxWidth: '200px'
            }}
        >
            <option value="">Season: All</option>
            {seasonOptions.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
        </select>

        <select
            value={selectedCompetitionId}
            onChange={(e) => setSelectedCompetitionId(e.target.value)}
            style={{
                padding: '8px 12px',
                border: '1px solid var(--app-border)',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: 'var(--app-surface)',
                maxWidth: '200px'
            }}
        >
            <option value="">Competition: All</option>
            {[...new Map(competitions.map((c) => [String(c.id), c])).values()]
              .slice()
              .sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || '')))
              .map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--app-border)',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'var(--app-surface)',
            maxWidth: '200px',
          }}
        >
          <option value="all">Status: All</option>
          <option value="active">Status: Active</option>
          <option value="inactive">Status: Inactive</option>
        </select>

        <select
          value={sportFilter}
          onChange={(e) => { setSportFilter(e.target.value); setVariantFilter('all'); }}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--app-border)',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'var(--app-surface)',
          }}
        >
          <option value="all">Sport: All</option>
          {categories.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.sport_icon} {sport.name}
            </option>
          ))}
        </select>

        <select
          value={variantFilter}
          onChange={(e) => setVariantFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--app-border)',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'var(--app-surface)',
          }}
        >
          <option value="all">Variant: All</option>
          {(sportFilter !== 'all' ? getVariantsForCategory(sportFilter) : variants).map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.sport_icon} {sport.name}
            </option>
          ))}
        </select>
        </MobileFilterSheet>

        <div className="hide-mobile" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--app-muted-text)' }}>
            Showing {matchesMaxItems ?? 'all'}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMatchesMaxItems((v) => (v == null ? null : Math.min(10_000, v + 500)))}
            disabled={matchesMaxItems == null}
          >
            Load more
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMatchesMaxItems(null)}
            disabled={matchesMaxItems == null}
          >
            Load all
          </Button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              if (!clubLocked) setSelectedClubId('');
              if (!teamLocked) setSelectedTeamId('');
              setSelectedSeasonName('');
              setSelectedCompetitionId('');
              setStatusFilter('all');
              setSportFilter('all');
              setVariantFilter('all');
              if (isSuperAdmin) setSelectedOrgId('');
            }}
          >
            Clear
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setIsCreateModalOpen(true);
            }}
          >
            Create Match
          </Button>
        </div>
      </div>

        {isLoading && <LoadingState message="Loading options..." />}
        {error && <Alert variant="error">{error}</Alert>}

        {!isLoading && !error && matchesLoading && (
          <LoadingState message="Loading matches..." />
        )}

        {!isLoading && !error && !matchesLoading && sortedMatches.length === 0 && (
          <Alert variant="info">No matches found. Use filters to narrow your search.</Alert>
        )}

        {!isLoading && !error && !matchesLoading && sortedMatches.length > 0 && (
          <Card>
            <div className="overflow-x-auto">
              <Table style={compactTableStyle}>
                <thead>
                  <tr>
                    {!orgLocked && (
                      <th className="hide-mobile" style={{ ...compactThStyle, width: '15%' }}>Federation</th>
                    )}
                    {!clubLocked && (
                      <th className="hide-mobile" style={{ ...compactThStyle, width: '15%' }}>Club</th>
                    )}
                    {!teamLocked && <th className="hide-mobile" style={{ ...compactThStyle, width: '15%' }}>Team</th>}
                    <th style={{ ...compactThStyle, width: '15%' }}>Season</th>
                    <th style={{ ...compactThStyle, width: '18%' }}>Competition</th>
                    <th className="hide-mobile" style={{ ...compactThStyle, width: '10%' }}>Sport</th>
                    <th className="hide-mobile" style={{ ...compactThStyle, width: '12%' }}>Sport Variant</th>
                    <th style={{ ...compactThStyle, width: '15%' }}>Match</th>
                    <th className="hide-mobile" style={{ ...compactThStyle, width: '8%' }}>Squad</th>
                    <th style={{ ...compactThStyle, width: '10%' }}>Status</th>
                    <th className="hide-mobile" style={{ ...compactThStyle, width: '12%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMatches.map((m) => {
                    const project = m.project;
                    const teamId = project?.id;
                    const teamName = project?.name || '-';
                    // Find team in loaded teams to get parent (Club)
                    const teamObj = teams.find((t) => String(t.id) === String(teamId));
                    const clubId = (teamObj as any)?.parent_id || (teamObj as any)?.parent || (typeof project === 'object' && (project as any)?.parent_id);
                    const club = clubs.find((c) => String(c.id) === String(clubId));
                    const clubName = club?.name || '-';

                    // Organisation - resolve slug from lookup list to avoid UUIDs in URLs
                    const orgId = selectedOrgId || m.organisation?.id || (club as any)?.organisation || (teamObj as any)?.organisation;
                    const org = organisations.find((o) => String(o.id) === String(orgId));
                    const orgName = m.organisation?.name || org?.name || '-';
                    const orgSlugResolved = org?.slug || m.organisation?.slug;

                    const competition = m.period;
                    const compName = competition?.name || '-';
                    const season = competition?.parent_period;
                    const seasonName = season?.name || '-';

                    const isActive = (() => {
                      if (!m.start_time) return false;
                      const start = new Date(m.start_time);
                      return start.getTime() >= Date.now();
                    })();

                    // Link Targets - prefer slugs from lookup lists over raw UUIDs
                    const orgTarget = lockedOrgSlug || orgSlugResolved || orgId;
                    const clubTarget = (club as any)?.slug || clubId;
                    const teamTarget = (teamObj as any)?.slug || teamId;
                    // Use periodPathKey to generate slug from name (Period model has no slug field)
                    const seasonId = season?.id;
                    const seasonFromList = seasonId ? seasons.find(s => String(s.id) === String(seasonId)) : undefined;
                    const seasonTarget = periodPathKey(seasonFromList || season) || seasonId;
                    const compId = competition?.id;
                    const compFromList = compId ? competitions.find(c => String(c.id) === String(compId)) : undefined;
                    const compTarget = periodPathKey(compFromList || competition) || compId;

                    // Use canonical vanity path when club is available
                    const teamBasePath = clubTarget
                      ? `/${orgTarget}/${clubTarget}/${teamTarget}`
                      : `/organisations/${orgTarget}/projects/${teamTarget}`;

                    return (
                        <tr key={m.id}>
                        {!orgLocked && (
                          <td className="hide-mobile" style={compactTextTdStyle}>
                            {orgId ? (
                              <a
                                href={`/organisations/${orgTarget}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/organisations/${orgTarget}`);
                                }}
                              >
                                {orgName}
                              </a>
                            ) : orgName}
                          </td>
                        )}
                        {!clubLocked && (
                          <td className="hide-mobile" style={compactTextTdStyle}>
                            {clubId ? (
                              <a
                            href={`/${orgTarget}/${clubTarget}`}
                              className="text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                            navigate(`/${orgTarget}/${clubTarget}`);
                              }}
                              >
                              {clubName}
                              </a>
                            ) : clubName}
                          </td>
                        )}
                        {!teamLocked && (
                          <td className="hide-mobile" style={compactTextTdStyle}>
                            {teamId ? (
                              <a
                                href={teamBasePath}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(teamBasePath);
                                }}
                              >
                                {teamName}
                              </a>
                            ) : teamName}
                          </td>
                        )}
                        <td style={compactTextTdStyle}>
                             {season ? (
                                <a
                            href={`${teamBasePath}/${seasonTarget}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if(seasonTarget) {
                                navigate(`${teamBasePath}/${seasonTarget}`);
                                    }
                                }}
                                >
                                {seasonName}
                                </a>
                             ) : seasonName}
                        </td>
                            <td style={compactTextTdStyle}>
                              {competition ? (
                                <a
                            href={`${teamBasePath}/${seasonTarget}/${compTarget}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if(seasonTarget && compTarget) {
                              navigate(`${teamBasePath}/${seasonTarget}/${compTarget}`);
                                  }
                                }}
                                >
                                {compName}
                                </a>
                              ) : compName}
                            </td>
                        <td className="hide-mobile" style={compactTdStyle}>
                          {(m as any).period?.sport?.category_name ? (
                            <span style={{ fontSize: '11px' }}>{(m as any).period.sport.category_name}</span>
                          ) : (
                            <span style={{ color: 'var(--app-muted-text)' }}>—</span>
                          )}
                        </td>
                        <td className="hide-mobile" style={compactTdStyle}>
                          {(m as any).period?.sport ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>{(m as any).period.sport.sport_icon}</span>
                              <span style={{ fontSize: '11px' }}>{(m as any).period.sport.name}</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--app-muted-text)' }}>—</span>
                          )}
                        </td>
                        <td style={compactTextTdStyle}>
                            {(() => {
                              const matchKey = (m as any).slug || m.id;
                              const matchPath = (orgTarget && clubTarget && teamTarget && seasonTarget && compTarget)
                                ? `/${orgTarget}/${clubTarget}/${teamTarget}/${seasonTarget}/${compTarget}/${matchKey}`
                                : `/matches/${matchKey}`;
                              return (
                                <a
                                  href={matchPath}
                                  className="text-blue-600 hover:underline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(matchPath);
                                  }}
                                >
                                  {m.title}
                                </a>
                              );
                            })()}
                        </td>
                        <td className="hide-mobile" style={compactTdStyle}>-</td>
                        <td style={compactTdStyle}>
                          <Badge variant={isActive ? 'success' : 'warning'}>
                            {isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="hide-mobile" style={compactTdStyle}>
                          <div style={compactActionsStyle}>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                              setDetailMatch(m);
                              setIsDetailModalOpen(true);
                                }}
                                style={actionButtonStyle('primary')}
                            >
                                View
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                              setEditMatch(m);
                              setIsEditModalOpen(true);
                                }}
                                style={actionButtonStyle('warning')}
                            >
                                Edit
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    if(window.confirm('Are you sure you want to delete this match?')) {
                                        // TODO: Implement delete match
                                        alert('Delete functionality not yet implemented');
                                    }
                                }}
                                style={actionButtonStyle('danger')}
                            >
                                Delete
                            </button>
                          </div>
                         </td>
                        </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </Card>
        )}

        <MatchDetailModal
          opened={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          match={detailMatch}
        />

        <MatchEditModal
          opened={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          match={editMatch}
          onSave={async (payload) => {
            if (!editMatch) return;

            const csrfToken = document.cookie
              .split('; ')
              .find((row) => row.startsWith('csrftoken='))
              ?.split('=')[1];

            const apiBaseUrl = getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/v1/activities/${editMatch.id}/`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken || '',
              },
              credentials: 'include',
              body: JSON.stringify(payload),
            });

            if (!res.ok) {
              const detail = await res.text().catch(() => '');
              throw new Error(detail || 'Failed to update match');
            }

            setRefreshKey((k) => k + 1);
          }}
        />

        <MatchCreateModal
          opened={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          organisations={organisations}
          clubs={clubs}
          teams={teams}
          initialOrganisationId={selectedOrgId}
          initialClubId={selectedClubId}
          initialTeamId={selectedTeamId}
          onCreate={async (payload) => {
            const apiBaseUrl = getApiBaseUrl();
            const csrfToken = getCsrfToken();

            const teamId = String(payload.project_id || '');
            const competitionId = String(payload.period_id || '');
            if (!teamId) throw new Error('Select a team first');
            if (!competitionId) throw new Error('Select a competition first');

            const res = await fetch(`${apiBaseUrl}/api/v1/activities/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken || '',
              },
              credentials: 'include',
              body: JSON.stringify({
                title: payload.title,
                activity_type: 'match',
                project_id: Number(teamId),
                opponent_project_id: payload.opponent_project_id ? Number(payload.opponent_project_id) : undefined,
                period_id: competitionId,
                start_time: payload.start_time,
                end_time: payload.end_time,
                location: payload.location,
                description: payload.description,
                metadata: {
                  venue: payload.venue || 'Home',
                  is_home: (payload.venue || 'Home') === 'Home',
                  ...(payload as any)?.metadata,
                },
              }),
            });

            if (!res.ok) {
              const detail = await res.text().catch(() => '');
              throw new Error(detail || 'Failed to create match');
            }

            const raw: any = await res.json().catch(() => null);
            const created: any = raw?.data?.data || raw?.data || raw;
            if (created && typeof created === 'object') {
              const createdId = String(created?.id || '').trim();
              if (createdId) {
                setMatches((prev) => {
                  const list = Array.isArray(prev) ? prev : [];
                  if (list.some((m: any) => String(m?.id || '').trim() === createdId)) return list;
                  return [created, ...list];
                });
              }
            }

            invalidateFetchAllPagesCache();
          }}
        />
    </div>
  );
};
