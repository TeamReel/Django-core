import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card, Button, Badge } from '@django-core/design-system';
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

type Period = {
  id: string;
  name: string;
  slug?: string;
  start_date?: string;
  end_date?: string;
  project?: { id: string; name: string } | null;
  project_id?: string | null;
  organisation?: { id: string; name: string } | null;
  organisation_id?: string | null;
  parent_period?: { id: string; name: string; slug?: string } | null;
  parent_period_id?: string | null;
  children_count?: number;
  activities_count?: number;
  matches_count?: number;
  members_count?: number;
  data?: Record<string, any>;
};

export const SeasonsList: React.FC = () => {
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

  const [seasons, setSeasons] = useState<Period[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);

  // Initialize org filter
  useEffect(() => {
    if (!isSuperAdmin && context.organisation?.id) {
      setSelectedOrgId(String(context.organisation.id));
    }
  }, [context.organisation?.id, isSuperAdmin]);

  // Sync params from URL to state
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

  // Fetch filter options
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
        setError(e instanceof Error ? e.message : 'Failed to load teams');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  // Fetch seasons
  useEffect(() => {
      const loadSeasons = async () => {
        setSeasonsLoading(true);
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

        try {
          const params = new URLSearchParams();
          params.set('page_size', '250');
          params.set('parent_id', 'null');

          // Always fetch based on selection, or all if nothing selected
          if (selectedTeamId) {
            params.set('project_id', String(selectedTeamId));
          } else if (selectedClubId) {
            // If only club selected, get all seasons for teams in that club
            const clubTeams = teams.filter((t) => {
              const tParent = t.parent_id || t.parent;
              return String(tParent) === String(selectedClubId);
            });
            if (clubTeams.length > 0) {
              // Fetch for all teams in the club
              const teamIds = clubTeams.map(t => String(t.id)).join(',');
              params.set('project_id__in', teamIds);
            }
          } else if (selectedOrgId) {
            // If only org selected, fetch all seasons for that org
            params.set('organisation_id', selectedOrgId);
          }
          // If nothing selected at all, fetch all seasons (for superadmin)

          if (selectedClubId && teams.length > 0) {
              const clubTeams = teams.filter((t) => {
                  const tParent = t.parent_id || t.parent;
                  return String(tParent) === String(selectedClubId);
              });

              if (clubTeams.length === 0) {
                  // Club selected but no teams found -> force empty result
                 setSeasons([]);
                 setSeasonsLoading(false);
                 return;
              }

             const teamIds = clubTeams.map(t => String(t.id)).join(',');
             params.set('project_id__in', teamIds);
          } else if (selectedClubId) {
             // Club selected but teams input list empty/loading -> likely no teams or not loaded yet
             // To be safe, force empty
             setSeasons([]);
             setSeasonsLoading(false);
             return;
          }

          const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
          console.log('[SeasonsList] Fetching from:', url);
          const res = await fetch(url, { credentials: 'include' });
          if (!res.ok) throw new Error(`API error: ${res.status}`);

          const data = await res.json();
          console.log('[SeasonsList] API response:', data);
          // Handle nested data structure: { status, data: { data: [...] } }
          const results = data.data?.data || data.data?.results || data.results || data.data || [];
          console.log('[SeasonsList] Raw results count:', results.length);
          console.log('[SeasonsList] First 3 results:', results.slice(0, 3));

          // Filter to only actual seasons (exclude competitions/cups)
          const filteredSeasons = results.filter((p: any) => {
            const name = String(p?.name || '').toLowerCase();
            const type = p?.data?.type || '';
            const isSeasonName = name.includes('season') || name.includes('seizoen');
            const isNotCompetition = type !== 'league' && type !== 'cup' && type !== 'tournament';

            console.log('[SeasonsList] Period:', p.name, 'type:', type, 'isSeasonName:', isSeasonName, 'isNotCompetition:', isNotCompetition);

            // Accept if name looks like a season AND it's not explicitly a competition type
            return isSeasonName && (isNotCompetition || !type);
          });

          console.log('[SeasonsList] Filtered seasons count:', filteredSeasons.length);
          setSeasons(Array.isArray(filteredSeasons) ? filteredSeasons : []);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to load seasons');
        } finally {
          setSeasonsLoading(false);
        }
      };

      loadSeasons();
  }, [selectedTeamId, selectedClubId, selectedOrgId, teams]);


  const selectedOrg = selectedOrgId
    ? organisations.find((o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId))
    : null;
  const orgSlugOrId = selectedOrg?.slug || selectedOrg?.id || selectedOrgId;

  const selectedTeam = selectedTeamId ? teams.find((t) => String(t.id) === String(selectedTeamId)) : null;
  const teamSlugOrId = (selectedTeam as any)?.slug || (selectedTeam as any)?.id || selectedTeamId;

  const getCsrfToken = () =>
    document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];

  const handleDelete = async (orgId: string, seasonId: string | undefined, seasonName: string) => {
    if (!seasonId || !window.confirm(`Are you sure you want to delete season "${seasonName}"?`)) {
      return;
    }
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
        const response = await fetch(`${apiBaseUrl}/api/v1/periods/${seasonId}/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken() || '',
            },
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error('Failed to delete season');
        }
        // removing from local state
        setSeasons(prev => prev.filter(s => s.id !== seasonId));
    } catch (err) {
        console.error('Delete error:', err);
        alert('Failed to delete season');
    }
  };

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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setSelectedClubId('');
              setSelectedTeamId('');
              if (isSuperAdmin) setSelectedOrgId('');
            }}
          >
            Clear
          </Button>
          {selectedTeamId && (
            <Button variant="primary" size="md" onClick={() => {
              const orgSlug = organisations.find(o => String(o.id) === selectedOrgId)?.slug || selectedOrgId;
              const teamSlug = teams.find(t => String(t.id) === selectedTeamId)?.slug || selectedTeamId;
              navigate(`/organisations/${orgSlug}/teams/${teamSlug}/seasons/create`);
            }}>
              Create Season
            </Button>
          )}
        </div>
      </div>

      {isLoading && <LoadingState message="Loading options..." />}
      {error && <Alert variant="error">{error}</Alert>}

      {!isLoading && !error && seasonsLoading && <LoadingState message="Loading seasons..." />}

      {!isLoading && !error && !seasonsLoading && seasons.length === 0 && (
          <Alert variant="info">No seasons found. Use filters to narrow your search.</Alert>
      )}

      {!isLoading && !error && !seasonsLoading && seasons.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <Table style={compactTableStyle}>
              <thead>
                <tr>
                    <th style={{ ...compactThStyle, width: '15%' }}>Federation</th>
                    <th style={{ ...compactThStyle, width: '15%' }}>Club</th>
                    <th style={{ ...compactThStyle, width: '15%' }}>Team</th>
                    <th style={{ ...compactThStyle, width: 'auto' }}>Season</th>
                    <th style={{ ...compactThStyle, width: '10%' }}>Competitions</th>
                    <th style={{ ...compactThStyle, width: '10%' }}>Matches</th>
                    <th style={{ ...compactThStyle, width: '8%' }}>Users</th>
                    <th style={{ ...compactThStyle, width: '10%' }}>Status</th>
                    <th style={{ ...compactThStyle, width: '12%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((season) => {
                    const org = season.organisation;
                    const project = season.project;
                    const orgName = typeof org === 'string' ? org : org?.name || '-';
                    const teamName = typeof project === 'string' ? project : project?.name || '-';
                    const teamId = typeof project === 'string' ? project : project?.id;

                    // Find the team in teams list to get parent club info
                    const teamObj = teams.find(t => String(t.id) === String(teamId));
                    const clubId = teamObj?.parent_id || (teamObj as any)?.parent_project_id;
                    const clubObj = clubs.find(c => String(c.id) === String(clubId));
                    const clubName = clubObj?.name || '-';

                    const orgId = typeof org === 'string' ? org : org?.id;

                    // Use activities_count for matches if available, else 0
                    const matchesCount = (season as any).matches_count ?? season.activities_count ?? 0;

                    return (
                    <tr key={season.id}>
                        <td style={compactTextTdStyle}>
                          {orgId ? (
                            <a
                              href={`/organisations/${orgId}`}
                              className="text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/organisations/${orgId}`);
                              }}
                            >
                              {orgName}
                            </a>
                          ) : (
                            orgName
                          )}
                        </td>
                        <td style={compactTextTdStyle}>
                          {clubId && orgId ? (
                            <a
                              href={`/organisations/${orgId}/projects/${clubId}`}
                              className="text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/organisations/${orgId}/projects/${clubId}`);
                              }}
                            >
                              {clubName}
                            </a>
                          ) : (
                            clubName
                          )}
                        </td>
                        <td style={compactTextTdStyle}>
                          {teamId && orgId ? (
                            <a
                              href={`/organisations/${orgId}/projects/${teamId}`}
                              className="text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/organisations/${orgId}/projects/${teamId}`);
                              }}
                            >
                              {teamName}
                            </a>
                          ) : (
                            teamName
                          )}
                        </td>
                        <td style={compactTextTdStyle}>
                        <a
                            href={`/organisations/${orgId}/projects/${teamId}/seasons/${season.slug || season.id}`}
                            className="text-blue-600 hover:underline"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate(`/organisations/${orgId}/projects/${teamId}/seasons/${season.slug || season.id}`);
                            }}
                        >
                            {season.name}
                        </a>
                        </td>
                        <td style={compactTdStyle}>
                            <Badge variant="default">
                                {season.children_count || 0}
                            </Badge>
                        </td>
                        <td style={compactTdStyle}>
                            <Badge variant="default">
                                {season.matches_count || 0}
                            </Badge>
                        </td>
                        <td style={compactTdStyle}>
                            <Badge variant="default">
                                {(season as any).members_count || 0}
                            </Badge>
                        </td>
                         <td style={compactTdStyle}>
                           {(() => {
                             const today = new Date().toISOString().split('T')[0];
                             const start = season.start_date || '0000-00-00';
                             const end = season.end_date || '9999-99-99';
                             const isActive = today >= start && today <= end;
                             return (
                               <Badge variant={isActive ? 'success' : 'warning'}>
                                 {isActive ? 'Active' : 'Inactive'}
                               </Badge>
                             );
                           })()}
                         </td>
                        <td style={compactTdStyle}>
                          <div style={compactActionsStyle}>
                            <button
                                onClick={() => {
                                    // Placeholder for View modal
                                    alert(`View Season: ${season.name}\nID: ${season.id}\nStart: ${season.start_date}\nEnd: ${season.end_date}`);
                                }}
                                style={actionButtonStyle('primary')}
                            >
                                View
                            </button>
                            <button
                              onClick={() => navigate(`/organisations/${orgId}/projects/${teamId}/seasons/${season.slug || season.id}/edit`)}
                              style={actionButtonStyle('warning')}
                            >
                              Edit
                            </button>
                            <button
                                onClick={() => handleDelete(String(orgId), season.id, season.name)}
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
