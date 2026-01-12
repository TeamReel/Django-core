import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card, Button, Badge } from '@django-core/design-system';
import LoadingState from '../../../components/LoadingState';
import { Table } from '@/shims/design-system';
import { fetchAllPages } from '../../../utils/fetchAllPages';
import { OrganisationOption, ProjectOption } from '../../work/WorkFilterBar';
import PeriodDetailModal from '../PeriodDetailModal';
import PeriodEditModal from '../PeriodEditModal';
import PeriodCreateModal from '../PeriodCreateModal';

type Period = {
  id: string;
  name: string;
  slug?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  project?: { id: string; name: string } | null;
  project_id?: string | null;
  organisation?: { id: string; name: string } | null;
  organisation_id?: string | null;
  parent_period?: { id: string; name: string; slug?: string } | null;
  parent_period_id?: string | null;
  children_count?: number;
  activities_count?: number;
  matches_count?: number;
  children_matches_count?: number;
  matches_total_count?: number;
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
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [seasons, setSeasons] = useState<Period[]>([]);
  const [competitions, setCompetitions] = useState<Period[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [detailCompetition, setDetailCompetition] = useState<Period | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editCompetition, setEditCompetition] = useState<Period | null>(null);
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
    const seasonId = searchParams.get('season_id');

    if (orgId && isSuperAdmin) setSelectedOrgId(String(orgId));
    if (clubId) setSelectedClubId(String(clubId));
    if (teamId) setSelectedTeamId(String(teamId));
    if (seasonId) setSelectedSeasonId(String(seasonId));
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

  // Fetch Seasons for Filter
  useEffect(() => {
    const loadSeasons = async () => {
       const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
       try {
           const params = new URLSearchParams();
           params.set('page_size', '200');
         params.set('parent_id', 'null');
           // Filter seasons by selected context
           if (selectedTeamId) {
               params.set('project_id', String(selectedTeamId));
           } else if (selectedClubId && teams.length > 0) {
              const clubTeams = teams.filter(t => {
                   const tParent = t.parent_id || t.parent;
                   return String(tParent) === String(selectedClubId);
              });
              if (clubTeams.length > 0) {
                   const teamIds = clubTeams.map(t => String(t.id)).join(',');
                   params.set('project_id__in', teamIds);
              }
           } else if (selectedOrgId) {
                params.set('organisation_id', selectedOrgId);
           }

           const res = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
           if(res.ok) {
               const data = await res.json();
               const results = data.data?.data || data.data?.results || data.results || data.data || [];
               const roots = (Array.isArray(results) ? results : []).filter(
                 (p: any) => p?.parent_period_id == null && !p?.parent_period
               );
               const uniqueRoots = [...new Map(roots.map((p: any) => [String(p.id), p])).values()];
               setSeasons(uniqueRoots as any);
           }
       } catch {
           // ignore
       }
    };
    loadSeasons();
  }, [selectedOrgId, selectedClubId, selectedTeamId, teams, refreshKey]);

  useEffect(() => {
    const loadCompetitions = async () => {
      setCompetitionsLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      try {
        const params = new URLSearchParams();
        params.set('page_size', '250');

        if (selectedSeasonId) {
          params.set('parent_id', selectedSeasonId);
        }

        if (selectedTeamId) {
          params.set('project_id', String(selectedTeamId));
        } else if (selectedClubId && teams.length > 0) {
          // If only club selected, get all competitions for teams in that club
          const clubTeams = teams.filter((t) => {
            const tParent = t.parent_id || t.parent;
            return String(tParent) === String(selectedClubId);
          });

          if (clubTeams.length === 0) {
             // If club selected but no teams found (or loading), we might return empty or just wait
             // But if we want to support 'Club' filter, we must use project_id__in
             setCompetitions([]);
             setCompetitionsLoading(false);
             return;
          }

           // Fetch for all teams in the club using backend support for project_id__in
           const teamIds = clubTeams.map(t => String(t.id)).join(',');
           params.set('project_id__in', teamIds);
        } else if (selectedClubId) {
             setCompetitions([]);
             setCompetitionsLoading(false);
             return;
        }
        if (selectedOrgId && !selectedClubId && !selectedTeamId) params.set('organisation_id', selectedOrgId);

        const res = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data = await res.json();
        const results = data.data?.data || data.data?.results || data.results || data.data || [];
        const all = Array.isArray(results) ? results : [];
        const filtered = selectedSeasonId
          ? all
          : all.filter((p: any) => p?.parent_period_id != null || p?.parent_period);
        setCompetitions(filtered);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load competitions');
      } finally {
        setCompetitionsLoading(false);
      }
    };

    loadCompetitions();
  }, [selectedTeamId, selectedClubId, selectedOrgId, selectedSeasonId, teams, refreshKey]);


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

  const savePeriodEdits = async (periodId: string, payload: any) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${apiBaseUrl}/api/v1/periods/${periodId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken() || '',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(detail || 'Failed to update competition');
    }
  };

  const createCompetition = async (payload: { name: string; description?: string; start_date?: string; end_date?: string }) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${apiBaseUrl}/api/v1/periods/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken() || '',
      },
      credentials: 'include',
      body: JSON.stringify({
        organisation_id: selectedOrgId,
        project_id: selectedTeamId ? Number(selectedTeamId) : undefined,
        parent_period_id: selectedSeasonId || null,
        name: payload.name,
        description: payload.description,
        start_date: payload.start_date,
        end_date: payload.end_date,
        metadata: { type: 'competition' },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(detail || 'Failed to create competition');
    }

    setRefreshKey((k) => k + 1);
  };

  const filteredCompetitions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    if (statusFilter === 'active') {
      return competitions.filter((c) => {
        const start = c.start_date || '0000-00-00';
        const end = c.end_date || '9999-99-99';
        return today >= start && today <= end;
      });
    }
    if (statusFilter === 'inactive') {
      return competitions.filter((c) => {
        const start = c.start_date || '0000-00-00';
        const end = c.end_date || '9999-99-99';
        return !(today >= start && today <= end);
      });
    }
    return competitions;
  }, [competitions, statusFilter]);

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
        <select
          value={selectedSeasonId}
          onChange={(e) => setSelectedSeasonId(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--app-border)',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'var(--app-surface)',
          }}
        >
          <option value="">Season: All</option>
          {[...new Map(seasons.map((s) => [String(s.id), s])).values()].map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.name}
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
              setSelectedSeasonId('');
              setStatusFilter('all');
              if (isSuperAdmin) setSelectedOrgId('');
            }}
          >
            Clear
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={!selectedOrgId || !selectedTeamId || !selectedSeasonId}
            onClick={() => {
              if (!selectedOrgId) {
                alert('Select a federation first to create a competition.');
                return;
              }
              if (!selectedTeamId) {
                alert('Select a team first to create a competition.');
                return;
              }
              if (!selectedSeasonId) {
                alert('Select a season first to create a competition.');
                return;
              }
              setIsCreateModalOpen(true);
            }}
          >
            Create Competition
          </Button>
        </div>
      </div>

      {isLoading && <LoadingState message="Loading options..." />}
      {error && <Alert variant="error">{error}</Alert>}

      {!isLoading && !error && competitionsLoading && (
        <LoadingState message="Loading competitions..." />
      )}

      {!isLoading && !error && !competitionsLoading && filteredCompetitions.length === 0 && (
        <Alert variant="info">No competitions found. Use filters to narrow your search.</Alert>
      )}

      {!isLoading && !error && !competitionsLoading && filteredCompetitions.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <Table style={compactTableStyle}>
              <thead>
                <tr>
                    <th style={{ ...compactThStyle, width: '12%' }}>Federation</th>
                    <th style={{ ...compactThStyle, width: '12%' }}>Club</th>
                    <th style={{ ...compactThStyle, width: '12%' }}>Team</th>
                    <th style={{ ...compactThStyle, width: '12%' }}>Season</th>
                    <th style={{ ...compactThStyle, width: '20%' }}>Competition</th>
                    <th style={{ ...compactThStyle, width: '8%' }}>Matches</th>
                    <th style={{ ...compactThStyle, width: '8%' }}>Status</th>
                    <th style={{ ...compactThStyle, width: '12%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompetitions.map((comp) => {
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

                    // Use matches_count
                    const matchesCount = comp.matches_count || 0;

                    // Link URL logic
                    const orgSlugOrId = orgSlug || orgId;
                    const teamSlugOrId = teamSlug || teamId;

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
                        <td style={compactTdStyle}>
                            <Badge variant="default">
                                {matchesCount}
                            </Badge>
                        </td>
                         <td style={compactTdStyle}>
                           {(() => {
                             const today = new Date().toISOString().split('T')[0];
                             const start = comp.start_date || '0000-00-00';
                             const end = comp.end_date || '9999-99-99';
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
                                 setDetailCompetition(comp);
                                 setIsDetailModalOpen(true);
                                    }}
                                    style={actionButtonStyle('primary')}
                                >
                                    View
                                </button>
                                <button
                              onClick={() => {
                                setEditCompetition(comp);
                                setIsEditModalOpen(true);
                              }}
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

      <PeriodCreateModal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Competition"
        onCreate={createCompetition}
      />

      <PeriodDetailModal
        opened={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        period={detailCompetition as any}
      />

      <PeriodEditModal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        period={editCompetition as any}
        onSave={async (payload) => {
          if (!editCompetition) return;
          await savePeriodEdits(editCompetition.id, payload);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
};
