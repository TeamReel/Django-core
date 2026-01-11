import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card, Button, Badge } from '@django-core/design-system';
import LoadingState from '../../../components/LoadingState';
import { Table } from '@/shims/design-system';
import { fetchAllPages } from '../../../utils/fetchAllPages';
import { canDeleteProject, canEditProject } from '../../../utils/permissions';
import ProjectDetailModal from '../ProjectDetailModal';
import { OrganisationOption, ProjectOption } from '../../work/WorkFilterBar';

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
  flexWrap: 'wrap'
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

export const TeamsList: React.FC = () => {
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

  const [detailProject, setDetailProject] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const permissionContext = useMemo(
    () => ({
      currentOrganisation: context.organisation as any,
      isSuperAdmin,
    }),
    [context.organisation, isSuperAdmin]
  );

  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  const getCsrfToken = () =>
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1] || '';

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

  // Fetch clubs/teams options
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      try {
        const [clubsRes, teamsRes] = await Promise.all([
            fetch(`${apiBaseUrl}/api/v1/projects/?page_size=300&parent_project__isnull=true`, { credentials: 'include' }),
            fetch(`${apiBaseUrl}/api/v1/projects/?page_size=300&parent_project__isnull=false`, { credentials: 'include' })
        ]);

        if (clubsRes.ok) {
            const data = await clubsRes.json();
            setClubs(data.results || data.data?.results || []);
        }
        if (teamsRes.ok) {
            const data = await teamsRes.json();
            setTeams(data.results || data.data?.results || []);
        }

      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load teams');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const filteredTeams = useMemo(() => {
      let list = [...teams];

      const selectedOrg = selectedOrgId
        ? organisations.find((o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId))
        : null;
      const selectedOrgIdResolved = selectedOrg?.id ? String(selectedOrg.id) : selectedOrgId;

      if (selectedOrgId) {
          list = list.filter((team: any) => {
              const teamOrg = typeof team.organisation === 'string' ? team.organisation : team.organisation?.id;
              return String(teamOrg) === String(selectedOrgIdResolved);
          });
      }

      if (selectedClubId) {
          list = list.filter((team: any) => {
               const parent = team.parent_project || team.parent_id || team.parent_project_id;
               const parentId = typeof parent === 'object' ? parent.id : parent;
               return String(parentId) === String(selectedClubId);
          });
      }

      if (selectedTeamId) {
         list = list.filter((t: any) => String(t.id) === String(selectedTeamId));
      }

      if (statusFilter === 'active') {
        list = list.filter((c: any) => c.is_active !== false);
      } else if (statusFilter === 'inactive') {
        list = list.filter((c: any) => c.is_active === false);
      }
      return list;
  }, [teams, selectedOrgId, selectedClubId, selectedTeamId, statusFilter, organisations]);

  const handleDeleteProject = async (orgSlugOrId: string, teamId: string, teamName: string) => {
        if (!window.confirm(`Are you sure you want to delete ${teamName}?`)) return;
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        try {
          // Note: Teams are projects but nested. The delete URL is same /organisations/:org/projects/:id/
          // Ensure we have correct org slug/id
          const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${teamId}/`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
          });

          if (!res.ok) {
            alert('Failed to delete team');
            return;
          }

          setTeams((prev) => prev.filter((p: any) => String(p.id) !== String(teamId)));
          if (String(selectedTeamId) === String(teamId)) setSelectedTeamId('');
        } catch (e) {
          console.error(e);
          alert('Error deleting team');
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
              setStatusFilter('all');
              setSelectedClubId('');
              setSelectedTeamId('');
              if (isSuperAdmin) setSelectedOrgId('');
            }}
          >
            Clear
          </Button>
          {userCanEditProject && selectedOrgId && selectedClubId && (
            <Button variant="primary" size="md" onClick={() => {
              const orgSlug = organisations.find(o => String(o.id) === selectedOrgId)?.slug || selectedOrgId;
              const clubSlug = clubs.find(c => String(c.id) === selectedClubId)?.slug || selectedClubId;
              navigate(`/organisations/${orgSlug}/projects/${clubSlug}/teams/create`);
            }}>
              Create Team
            </Button>
          )}
        </div>
      </div>

      {isLoading && <LoadingState message="Loading teams..." />}
      {error && <Alert variant="error">{error}</Alert>}

      {!isLoading && !error && filteredTeams.length === 0 && (
        <Alert variant="info">No teams match the current filters.</Alert>
      )}

      {!isLoading && !error && filteredTeams.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <Table style={compactTableStyle}>
              <colgroup>
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '280px' }} />
              </colgroup>
              <thead>
                <tr>
                    <th style={compactThStyle}>Team</th>
                    <th style={compactThStyle}>Club</th>
                    <th style={compactThStyle}>Federation</th>
                    <th style={compactThStyle}>Seasons</th>
                    <th style={compactThStyle}>Comps</th>
                    <th style={compactThStyle}>Matches</th>
                    <th style={compactThStyle}>Users</th>
                    <th style={compactThStyle}>Status</th>
                    <th style={compactThStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team: any) => {
                    const orgIdFromProject = team.organisation?.id || (typeof team.organisation === 'string' ? team.organisation : undefined);
                    const orgSlugFromProject = team.organisation?.slug;
                    const orgFromList = orgIdFromProject
                      ? organisations.find((o) => String(o.id) === String(orgIdFromProject))
                      : undefined;
                    const selectedOrg = selectedOrgId
                      ? organisations.find((o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId))
                      : undefined;
                    const orgSlugOrId =
                      orgSlugFromProject ||
                      orgFromList?.slug ||
                      selectedOrg?.slug ||
                      orgIdFromProject ||
                      selectedOrg?.id ||
                      selectedOrgId;

                    const parent = team.parent_project || team.parent_id || team.parent_project_id;
                    const parentId = typeof parent === 'object' ? parent.id : parent;
                    const parentName = typeof parent === 'object' ? (parent.name || parent.slug) : parent;
                    // Try to find parent in clubs list for better name
                    const clubObj = clubs.find(c => String(c.id) === String(parentId));
                    const clubName = clubObj ? clubObj.name : (parentName || '-');
                    const clubSlugOrId = clubObj ? (clubObj.slug || clubObj.id) : parentId;

                    const teamSlugOrId = team.slug || team.id;

                    return (
                        <tr key={team.id}>
                            <td style={compactTextTdStyle}>
                                <a
                                    href={`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${teamSlugOrId}`}
                                    className="text-blue-600 hover:underline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        navigate(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${teamSlugOrId}`);
                                    }}
                                >
                                    {team.name}
                                </a>
                            </td>
                            <td style={compactTextTdStyle}>
                                {clubSlugOrId ? (
                                    <a
                                        href={`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}`}
                                        className="text-blue-600 hover:underline"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            navigate(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}`);
                                        }}
                                    >
                                        {clubName}
                                    </a>
                                ) : (
                                    clubName
                                )}
                            </td>
                            <td style={compactTextTdStyle}>
                                {orgSlugOrId ? (
                                    <a
                                    href={`/organisations/${orgSlugOrId}`}
                                    className="text-blue-600 hover:underline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        navigate(`/organisations/${orgSlugOrId}`);
                                    }}
                                    >
                                    {team.organisation?.name || 'Federation'}
                                    </a>
                                ) : (
                                    team.organisation?.name || '-'
                                )}
                            </td>
                            <td style={compactTdStyle}>
                              <Badge variant="default">
                                {(team as any).seasons_count || 0}
                              </Badge>
                            </td>
                            <td style={compactTdStyle}>
                              <Badge variant="default">
                                {(team as any).competitions_count || 0}
                              </Badge>
                            </td>
                            <td style={compactTdStyle}>
                              <Badge variant="default">                                    {(team as any).matches_count || 0}
                                </Badge>
                            </td>
                            <td style={compactTdStyle}>
                                <Badge variant="default">                                {(team as any).member_count || 0}
                              </Badge>
                            </td>
                            <td style={compactTdStyle}>{team.is_active === false ? 'Inactive' : 'Active'}</td>
                            <td style={compactTdStyle}>
                                <div style={compactActionsStyle}>
                                    <button
                                        onClick={() => navigate(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${teamSlugOrId}`)}
                                        style={actionButtonStyle('primary')}
                                    >
                                        Open
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDetailProject(team);
                                            setIsDetailModalOpen(true);
                                        }}
                                        style={actionButtonStyle('neutral')}
                                    >
                                        View
                                    </button>
                                     {userCanEditProject && (
                                        <button
                                            onClick={() => navigate(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/edit`)}
                                            style={actionButtonStyle('warning')}
                                        >
                                            Edit
                                        </button>
                                    )}
                                    {userCanDeleteProject && (
                                        <button
                                            onClick={() => handleDeleteProject(String(orgSlugOrId), String(team.id), String(team.name))}
                                            style={actionButtonStyle('danger')}
                                        >
                                            Delete
                                        </button>
                                    )}
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

      <ProjectDetailModal
        opened={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        project={detailProject}
      />
    </div>
  );
};
