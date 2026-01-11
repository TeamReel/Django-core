import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card, Button } from '@django-core/design-system';
import LoadingState from '../../../components/LoadingState';
import { Table } from '@/shims/design-system';
import { fetchAllPages } from '../../../utils/fetchAllPages';
import { OrganisationOption, ProjectOption } from '../../work/WorkFilterBar';

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
  data?: Record<string, any>;
};

// Table styling constants
const compactTableStyle: React.CSSProperties = {
  tableLayout: 'fixed',
  width: '100%',
  borderCollapse: 'collapse'
};
const compactThStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: '0.8rem',
  textAlign: 'left',
  borderBottom: '2px solid var(--app-border)'
};
const compactTdStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: '0.85rem',
  verticalAlign: 'middle',
  borderBottom: '1px solid #eee'
};
const compactTextTdStyle: React.CSSProperties = {
  ...compactTdStyle,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
};
const compactActionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  flexWrap: 'nowrap'
};

// Button styling function
type ActionTone = 'neutral' | 'primary' | 'warning' | 'danger';
const actionButtonStyle = (tone: ActionTone): React.CSSProperties => {
  const base: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: 'var(--app-surface)',
    cursor: 'pointer',
    fontSize: '12px',
    lineHeight: 1.2,
  };
  if (tone === 'primary') {
    return { ...base, border: '1px solid #007bff', color: '#007bff' };
  }
  if (tone === 'warning') {
    return { ...base, border: '1px solid #fd7e14', color: '#fd7e14' };
  }
  if (tone === 'danger') {
    return { ...base, border: '1px solid #dc3545', color: '#dc3545' };
  }
  return { ...base, border: '1px solid #6c757d', color: '#6c757d' };
};

export const CompetitionsList: React.FC = () => {
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

  const [competitions, setCompetitions] = useState<Period[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(false);

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

  useEffect(() => {
    const loadCompetitions = async () => {
      setCompetitionsLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      try {
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('parent_period__isnull', 'false');
        if (selectedTeamId) {
          params.set('project_id', String(selectedTeamId));
        } else if (selectedClubId && teams.length > 0) {
          // If only club selected, get all competitions for teams in that club
          const clubTeams = teams.filter((t) => {
            const tParent = t.parent_id || t.parent;
            return String(tParent) === String(selectedClubId);
          });

          if (clubTeams.length === 0) {
             setCompetitions([]);
             setCompetitionsLoading(false);
             return;
          }

           // Fetch for all teams in the club
           const teamIds = clubTeams.map(t => String(t.id)).join(',');
           params.set('project_id__in', teamIds);
        } else if (selectedClubId) {
             setCompetitions([]);
             setCompetitionsLoading(false);
             return;
        }
        if (selectedOrgId && !selectedClubId) params.set('organisation_id', selectedOrgId);

        const res = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data = await res.json();
        const results = data.data?.data || data.data?.results || data.results || data.data || [];
        setCompetitions(Array.isArray(results) ? results : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load competitions');
      } finally {
        setCompetitionsLoading(false);
      }
    };

    loadCompetitions();
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

  const handleDelete = async (orgId: string, compId: string, compName: string) => {
    if (!compId || !window.confirm(`Are you sure you want to delete competition "${compName}"?`)) {
        return;
    }
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
        const response = await fetch(`${apiBaseUrl}/api/v1/periods/${compId}/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken() || '',
            },
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error('Failed to delete competition');
        }
        // removing from local state
        setCompetitions(prev => prev.filter(c => c.id !== compId));
    } catch (err) {
        console.error('Delete error:', err);
        alert('Failed to delete competition');
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
              navigate(`/organisations/${orgSlug}/teams/${teamSlug}/competitions/create`);
            }}>
              Create Competition
            </Button>
          )}
        </div>
      </div>

      {isLoading && <LoadingState message="Loading options..." />}
      {error && <Alert variant="error">{error}</Alert>}

      {!isLoading && !error && competitionsLoading && (
        <LoadingState message="Loading competitions..." />
      )}

      {!isLoading && !error && !competitionsLoading && competitions.length === 0 && (
        <Alert variant="info">No competitions found. Use filters to narrow your search.</Alert>
      )}

      {!isLoading && !error && !competitionsLoading && competitions.length > 0 && (
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
                    <th style={{ ...compactThStyle, width: '10%' }}>Matches</th>
                    <th style={{ ...compactThStyle, width: '20%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {competitions.map((comp) => {
                    const seasonId = (comp as any).parent_period_id || comp.parent_period?.id;
                    const seasonSlug = comp.parent_period?.slug;
                    const org = comp.organisation;
                    const project = comp.project;
                    const orgId = typeof org === 'object' ? org?.id : org;
                    const orgSlug = typeof org === 'object' ? (org as any)?.slug : undefined;
                    const orgName = typeof org === 'string' ? org : org?.name || '-';
                    const teamId = typeof project === 'object' ? project?.id : project;
                    const teamSlug = typeof project === 'object' ? (project as any)?.slug : undefined;
                    const teamName = typeof project === 'string' ? project : project?.name || '-';

                    // Get club by finding team's parent in clubs array
                    const teamObj = teams.find(t => String(t.id) === String(teamId));
                    const clubId = teamObj?.parent_id || teamObj?.parent || (typeof project === 'object' && (project as any)?.parent_id);
                    const club = clubs.find(c => String(c.id) === String(clubId));
                    const clubName = club?.name || '-';

                    // Use activities_count for matches
                    const matchesCount = comp.activities_count ?? (comp as any).matches_count ?? 0;

                    return (
                        <tr key={comp.id}>
                        <td style={compactTextTdStyle}>
                          {orgId ? (
                            <a
                              href={`/organisations/${orgSlug || orgId}`}
                              className="text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/organisations/${orgSlug || orgId}`);
                              }}
                            >
                              {orgName}
                            </a>
                          ) : orgName}
                        </td>
                        <td style={compactTextTdStyle}>
                          {clubId ? (
                            <a
                              href={`/organisations/${orgSlug || orgId}/clubs/${club?.slug || clubId}`}
                              className="text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/organisations/${orgSlug || orgId}/clubs/${club?.slug || clubId}`);
                              }}
                            >
                              {clubName}
                            </a>
                          ) : clubName}
                        </td>
                        <td style={compactTextTdStyle}>
                          {teamId ? (
                            <a
                              href={`/organisations/${orgSlug || orgId}/teams/${teamSlug || teamId}`}
                              className="text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/organisations/${orgSlug || orgId}/teams/${teamSlug || teamId}`);
                              }}
                            >
                              {teamName}
                            </a>
                          ) : teamName}
                        </td>
                        <td style={compactTextTdStyle}>
                            <a
                            href={`/organisations/${orgSlugOrId}/projects/${teamSlugOrId}/seasons/${seasonSlug || seasonId}/competitions/${comp.slug || comp.id}`}
                            className="text-blue-600 hover:underline"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate(
                                `/organisations/${orgSlugOrId}/projects/${teamSlugOrId}/seasons/${seasonSlug || seasonId}/competitions/${comp.slug || comp.id}`,
                                );
                            }}
                            >
                            {comp.name}
                            </a>
                        </td>
                        <td style={compactTextTdStyle}>
                            {seasonId ? (
                                <a
                                href={`/organisations/${orgSlugOrId}/projects/${teamSlugOrId}/seasons/${seasonSlug || seasonId}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate(
                                        `/organisations/${orgSlugOrId}/projects/${teamSlugOrId}/seasons/${seasonSlug || seasonId}`
                                    );
                                }}
                                >
                                {comp.parent_period?.name || '-'}
                                </a>
                            ) : (
                                comp.parent_period?.name || '-'
                            )}
                        </td>
                        <td style={compactTdStyle}>{matchesCount}</td>
                        <td style={compactTdStyle}>
                            <div style={compactActionsStyle}>
                                <button
                                    onClick={() => navigate(
                                        `/organisations/${orgSlugOrId}/projects/${teamSlugOrId}/seasons/${seasonSlug || seasonId}/competitions/${comp.slug || comp.id}`
                                    )}
                                    style={actionButtonStyle('primary')}
                                >
                                    Open
                                </button>
                                <button
                                    onClick={() => {
                                         alert(`View Competition: ${comp.name}\nID: ${comp.id}\nStart: ${comp.start_date}\nEnd: ${comp.end_date}`);
                                    }}
                                    style={actionButtonStyle('neutral')}
                                >
                                    View
                                </button>
                                <button
                                    onClick={() => navigate(
                                        `/organisations/${orgSlugOrId}/projects/${teamSlugOrId}/seasons/${seasonSlug || seasonId}/competitions/${comp.slug || comp.id}/edit`
                                    )}
                                    style={actionButtonStyle('warning')}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(String(orgId), comp.id, comp.name)}
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
