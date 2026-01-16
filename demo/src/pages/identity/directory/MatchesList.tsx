import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card, Button, Badge } from '@django-core/design-system';
import LoadingState from '../../../components/LoadingState';
import { Table } from '@/shims/design-system';
import { fetchAllPages, invalidateFetchAllPagesCache } from '../../../utils/fetchAllPages';
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

export const MatchesList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { context, organisations: myOrganisations } = useContextSwitcher();

  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ProjectOption[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);

  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedSeasonName, setSelectedSeasonName] = useState<string>('');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [seasons, setSeasons] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);


  const [matches, setMatches] = useState<Activity[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal state
  const [detailMatch, setDetailMatch] = useState<Activity | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editMatch, setEditMatch] = useState<Activity | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Initialize org filter
  useEffect(() => {
    if (!isSuperAdmin && context.organisation?.id) {
      setSelectedOrgId(String(context.organisation.id));
    }
  }, [context.organisation?.id, isSuperAdmin]);

  useEffect(() => {
    const orgId = searchParams.get('org_id');
    const clubId = searchParams.get('club_id');
    const teamId = searchParams.get('team_id');

    if (orgId && isSuperAdmin) setSelectedOrgId(String(orgId));
    if (clubId) setSelectedClubId(String(clubId));
    if (teamId) setSelectedTeamId(String(teamId));
  }, [isSuperAdmin, searchParams]);

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
    if (!isSuperAdmin) {
      setOrganisations(myOrganisations.map((o) => ({ id: String(o.id), name: o.name, slug: (o as any).slug })));
      return;
    }

    const load = async () => {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      try {
        const orgs = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/organisations/?page_size=100`,
          { credentials: 'include' },
          { ttlMs: 120_000, bypass: refreshKey > 0 },
        );
        setOrganisations((orgs || []).map((o: any) => ({ id: String(o.id), name: o.name, slug: o.slug })));
      } catch {
        // ignore
      }
    };

    load();
  }, [isSuperAdmin, myOrganisations, refreshKey]);

  // Fetch options
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      try {
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
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load options');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [refreshKey]);

  const filteredMatches = useMemo(() => {
    if (statusFilter === 'all') return matches;
    const now = new Date();
    const isUpcoming = (m: Activity) => {
      if (!m.start_time) return false;
      const dt = new Date(m.start_time);
      return dt.getTime() >= now.getTime();
    };
    if (statusFilter === 'active') {
      // Upcoming matches
      return matches.filter(isUpcoming);
    }
    // Past matches
    return matches.filter((m) => !isUpcoming(m));
  }, [matches, statusFilter]);

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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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
         const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
         try {
             const seasonIds = selectedSeasonIds;
             if (seasonIds.length === 0) {
               setCompetitions([]);
               return;
             }

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
               } else if (selectedOrgId) {
                 params.set('organisation_id', String(selectedOrgId));
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
      setMatchesLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      try {
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

        if (selectedOrgId) params.set('organisation_id', selectedOrgId);

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
          // Matches can be a very large dataset (hundreds+). For the directory view,
          // avoid fetching every page on tab open.
          { ttlMs: 20_000, bypass: refreshKey > 0, maxPages: 1, maxItems: 250 },
        );

        // If season selection maps to multiple season ids (duplicate season names across teams),
        // apply the season filter client-side to keep dropdown unique by name.
        if (selectedSeasonIds.length > 1 && selectedSeasonName) {
          const filtered = all.filter((m) => {
            const seasonName = (m as any)?.period?.parent_period?.name;
            return String(seasonName || '').trim() === selectedSeasonName;
          });
          setMatches(filtered);
        } else {
          setMatches(all);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load matches');
      } finally {
        setMatchesLoading(false);
      }
    };

    loadMatches();
  }, [selectedTeamId, selectedClubId, selectedOrgId, selectedSeasonName, selectedSeasonIds, selectedCompetitionId, teams, refreshKey]);

  const getCsrfToken = () =>
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1];


  return (
    <div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        {isSuperAdmin && (
          <select
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value);
              setSelectedClubId('');
              setSelectedTeamId('');
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
        <select
          value={selectedClubId}
          onChange={(e) => {
            setSelectedClubId(e.target.value);
            setSelectedTeamId('');
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
          <option value="">Club: All</option>
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
        <select
          value={selectedTeamId}
          onChange={(e) => {
            setSelectedTeamId(e.target.value);
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
          <option value="">Team: All</option>
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

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setSelectedClubId('');
              setSelectedTeamId('');
              setSelectedSeasonName('');
              setSelectedCompetitionId('');
              setStatusFilter('all');
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
                    <th style={{ ...compactThStyle, width: '15%' }}>Federation</th>
                    <th style={{ ...compactThStyle, width: '15%' }}>Club</th>
                    <th style={{ ...compactThStyle, width: '15%' }}>Team</th>
                    <th style={{ ...compactThStyle, width: '15%' }}>Season</th>
                    <th style={{ ...compactThStyle, width: 'auto' }}>Competition</th>
                    <th style={{ ...compactThStyle, width: '15%' }}>Match</th>
                    <th style={{ ...compactThStyle, width: '8%' }}>Squad</th>
                    <th style={{ ...compactThStyle, width: '10%' }}>Status</th>
                    <th style={{ ...compactThStyle, width: '12%' }}>Actions</th>
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

                    // Organisation
                    const orgId = selectedOrgId || m.organisation?.id || (club as any)?.organisation || (teamObj as any)?.organisation;
                    const org = organisations.find((o) => String(o.id) === String(orgId));
                    const orgName = m.organisation?.name || org?.name || '-';
                    const orgSlug = m.organisation?.slug || (org as any)?.slug;

                    const competition = m.period;
                    const compName = competition?.name || '-';
                    const season = competition?.parent_period;
                    const seasonName = season?.name || '-';

                    const isActive = (() => {
                      if (!m.start_time) return false;
                      const start = new Date(m.start_time);
                      return start.getTime() >= Date.now();
                    })();

                    // Link Targets
                    const orgTarget = orgSlug || orgId;
                    const clubTarget = (club as any)?.slug || clubId;
                    const teamTarget = (teamObj as any)?.slug || teamId;
                    const seasonTarget = season?.slug || season?.id;
                    const compTarget = competition?.slug || competition?.id;

                    const teamBasePath = clubTarget
                      ? `/organisations/${orgTarget}/projects/${clubTarget}/teams/${teamTarget}`
                      : `/organisations/${orgTarget}/projects/${teamTarget}`;

                    return (
                        <tr key={m.id}>
                        <td style={compactTextTdStyle}>
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
                        <td style={compactTextTdStyle}>
                            {clubId ? (
                                <a
                            href={`/organisations/${orgTarget}/projects/${clubTarget}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                    e.preventDefault();
                              navigate(`/organisations/${orgTarget}/projects/${clubTarget}`);
                                }}
                                >
                                {clubName}
                                </a>
                            ) : clubName}
                        </td>
                         <td style={compactTextTdStyle}>
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
                        <td style={compactTextTdStyle}>
                             {season ? (
                                <a
                            href={`${teamBasePath}/seasons/${seasonTarget}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if(seasonTarget) {
                                navigate(`${teamBasePath}/seasons/${seasonTarget}`);
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
                            href={`${teamBasePath}/seasons/${seasonTarget}/competitions/${compTarget}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if(seasonTarget && compTarget) {
                              navigate(`${teamBasePath}/seasons/${seasonTarget}/competitions/${compTarget}`);
                                  }
                                }}
                                >
                                {compName}
                                </a>
                              ) : compName}
                            </td>
                        <td style={compactTextTdStyle}>
                            {(() => {
                              const matchKey = (m as any).slug || m.id;
                              const matchPath = `/matches/${matchKey}`;
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
                        <td style={compactTdStyle}>-</td>
                        <td style={compactTdStyle}>
                          <Badge variant={isActive ? 'success' : 'warning'}>
                            {isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td style={compactTdStyle}>
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

            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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
                },
              }),
            });

            if (!res.ok) {
              const detail = await res.text().catch(() => '');
              throw new Error(detail || 'Failed to create match');
            }

            invalidateFetchAllPagesCache();
            setRefreshKey((k) => k + 1);
          }}
        />
    </div>
  );
};
