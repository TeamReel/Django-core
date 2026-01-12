import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card, Button } from '@django-core/design-system';
import LoadingState from '../../../components/LoadingState';
import { Table } from '@/shims/design-system';
import { fetchAllPages } from '../../../utils/fetchAllPages';
import { OrganisationOption, ProjectOption } from '../../work/WorkFilterBar';
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
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');

  const [seasons, setSeasons] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);


  const [matches, setMatches] = useState<Activity[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

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

  useEffect(() => {
    if (!isSuperAdmin) {
      setOrganisations(myOrganisations.map((o) => ({ id: String(o.id), name: o.name, slug: (o as any).slug })));
      return;
    }

    const load = async () => {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/organisations/?page_size=100`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const orgs = data.data?.results || data.results || [];
        setOrganisations(orgs.map((o: any) => ({ id: String(o.id), name: o.name, slug: o.slug })));
      } catch {
        // ignore
      }
    };

    load();
  }, [isSuperAdmin, myOrganisations]);

  // Fetch options
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      try {
        const [allClubs, allTeams] = await Promise.all([
          fetchAllPages<ProjectOption>(`${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=true`),
          fetchAllPages<ProjectOption>(`${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=false`),
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
  }, []);

  // Fetch Seasons
  useEffect(() => {
    const loadSeasons = async () => {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      try {
        const params = new URLSearchParams();
        params.set('page_size', '200');
        params.set('parent_period__isnull', 'true'); // Top-level periods = Seasons

        if (selectedTeamId) {
             params.set('project_id', selectedTeamId);
        } else if (selectedClubId && teams.length > 0) {
             const clubTeams = teams.filter(t => {
                const parent = t.parent_id || (t as any).parent || (typeof (t as any).parent_project === 'object' ? (t as any).parent_project?.id : (t as any).parent_project);
                return String(parent) === String(selectedClubId);
             });
             if (clubTeams.length > 0) {
                 params.set('project_id__in', clubTeams.map(t => t.id).join(','));
             } else {
                 setSeasons([]);
                 return;
             }
        } else if (selectedOrgId) {
            params.set('organisation_id', selectedOrgId);
        }

        const res = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
             const results = data.data?.data || data.data?.results || data.results || data.data || [];
            // Filter to ensure they look like seasons if needed, but 'parent_period__isnull=true' is usually enough
            setSeasons(Array.isArray(results) ? results : []);
        }
      } catch {
        setSeasons([]);
      }
    };
    loadSeasons();
  }, [selectedTeamId, selectedClubId, selectedOrgId, teams]);

  // Fetch Competitions
  useEffect(() => {
     if (!selectedSeasonId) {
         setCompetitions([]);
         return;
     }
     const loadCompetitions = async () => {
         const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
         try {
             const params = new URLSearchParams();
             params.set('page_size', '200');
             params.set('parent_period_id', selectedSeasonId);

             const res = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
             if (res.ok) {
                 const data = await res.json();
                 const results = data.data?.data || data.data?.results || data.results || data.data || [];
                 setCompetitions(Array.isArray(results) ? results : []);
             }
         } catch {
             setCompetitions([]);
         }
     };
     loadCompetitions();
  }, [selectedSeasonId]);

  // Fetch matches
  useEffect(() => {
    const loadMatches = async () => {
      setMatchesLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      try {
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('activity_type', 'match');
        if (selectedTeamId) params.set('project_id', String(selectedTeamId));
        if (selectedOrgId) params.set('organisation_id', selectedOrgId);

        // Filter by Season or Competition
        if (selectedCompetitionId) {
            params.set('period_id', selectedCompetitionId);
        } else if (selectedSeasonId) {
            // Filter matches where the parent period is the season
            params.set('period__parent_period_id', selectedSeasonId);
        }

        const all = await fetchAllPages<Activity>(`${apiBaseUrl}/api/v1/activities/?${params.toString()}`);
        setMatches(all);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load matches');
      } finally {
        setMatchesLoading(false);
      }
    };

    loadMatches();
  }, [selectedTeamId, selectedOrgId, selectedSeasonId, selectedCompetitionId]);


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
            {organisations.map((org) => (
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
            .map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
        </select>
        <select
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
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
              const tParent = t.parent_id || t.parent;
              return String(tParent) === String(selectedClubId);
            })
            .map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
        </select>

        <select
            value={selectedSeasonId}
            onChange={(e) => {
                setSelectedSeasonId(e.target.value);
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
            {seasons.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
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
            {competitions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
            ))}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setSelectedClubId('');
              setSelectedTeamId('');
              setSelectedSeasonId('');
              setSelectedCompetitionId('');
              if (isSuperAdmin) setSelectedOrgId('');
            }}
          >
            Clear
          </Button>
          {selectedTeamId && (
            <Button variant="primary" size="md" onClick={() => {
              const orgSlug = organisations.find(o => String(o.id) === selectedOrgId)?.slug || selectedOrgId;
              const teamSlug = teams.find(t => String(t.id) === selectedTeamId)?.slug || selectedTeamId;
              navigate(`/organisations/${orgSlug}/teams/${teamSlug}/matches/create`);
            }}>
              Create Match
            </Button>
          )}
        </div>
      </div>

        {isLoading && <LoadingState message="Loading options..." />}
        {error && <Alert variant="error">{error}</Alert>}

        {!isLoading && !error && matchesLoading && (
          <LoadingState message="Loading matches..." />
        )}

        {!isLoading && !error && !matchesLoading && matches.length === 0 && (
          <Alert variant="info">No matches found. Use filters to narrow your search.</Alert>
        )}

        {!isLoading && !error && !matchesLoading && matches.length > 0 && (
          <Card>
            <div className="overflow-x-auto">
              <Table style={compactTableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...compactThStyle, width: '15%' }}>Federation</th>
                    <th style={{ ...compactThStyle, width: '15%' }}>Club</th>
                    <th style={{ ...compactThStyle, width: '15%' }}>Team</th>
                    <th style={{ ...compactThStyle, width: 'auto' }}>Competition</th>
                    <th style={{ ...compactThStyle, width: '15%' }}>Season</th>
                    <th style={{ ...compactThStyle, width: '15%' }}>Match</th>
                    <th style={{ ...compactThStyle, width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => {
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

                    // Link Targets
                    const orgTarget = orgSlug || orgId;
                    const clubTarget = (club as any)?.slug || clubId;
                    const teamTarget = (teamObj as any)?.slug || teamId;
                    const seasonTarget = season?.slug || season?.id;
                    const compTarget = competition?.slug || competition?.id;

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
                                href={`/organisations/${orgTarget}/clubs/${clubTarget}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/organisations/${orgTarget}/clubs/${clubTarget}`);
                                }}
                                >
                                {clubName}
                                </a>
                            ) : clubName}
                        </td>
                         <td style={compactTextTdStyle}>
                            {teamId ? (
                                <a
                                href={`/organisations/${orgTarget}/teams/${teamTarget}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/organisations/${orgTarget}/teams/${teamTarget}`);
                                }}
                                >
                                {teamName}
                                </a>
                            ) : teamName}
                         </td>
                        <td style={compactTextTdStyle}>
                            {competition ? (
                                <a
                                href={`/organisations/${orgTarget}/projects/${teamTarget}/seasons/${seasonTarget}/competitions/${compTarget}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if(seasonTarget && compTarget) {
                                        navigate(`/organisations/${orgTarget}/projects/${teamTarget}/seasons/${seasonTarget}/competitions/${compTarget}`);
                                    }
                                }}
                                >
                                {compName}
                                </a>
                            ) : compName}
                        </td>
                        <td style={compactTextTdStyle}>
                             {season ? (
                                <a
                                href={`/organisations/${orgTarget}/projects/${teamTarget}/seasons/${seasonTarget}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if(seasonTarget) {
                                        navigate(`/organisations/${orgTarget}/projects/${teamTarget}/seasons/${seasonTarget}`);
                                    }
                                }}
                                >
                                {seasonName}
                                </a>
                             ) : seasonName}
                        </td>
                        <td style={compactTextTdStyle}>
                            <a
                              href={`/matches/${m.id}`}
                              className="text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/matches/${m.id}`);
                              }}
                            >
                              {m.title}
                            </a>
                        </td>
                        <td style={compactTdStyle}>
                          <div style={compactActionsStyle}>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/matches/${m.id}`);
                                }}
                                style={actionButtonStyle('primary')}
                            >
                                View
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/matches/${m.id}/edit`);
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
    </div>
  );
};
