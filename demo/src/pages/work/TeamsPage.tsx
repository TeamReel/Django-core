import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import LoadingState from '../../components/LoadingState';
import { Table } from '../../shims/design-system';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { canDeleteProject, canEditProject } from '../../utils/permissions';
import ProjectDetailModal from '../identity/ProjectDetailModal';
import WorkFilterBar, { OrganisationOption, ProjectOption } from './WorkFilterBar';

export default function TeamsPage() {
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

  // Initialize org filter for non-superadmins
  useEffect(() => {
    if (!isSuperAdmin && context.organisation?.id) {
      setSelectedOrgId(String(context.organisation.id));
    }
  }, [context.organisation?.id, isSuperAdmin]);

  // Allow deep-linking into org/club/team context (e.g. from Clubs or Federation detail)
  useEffect(() => {
    const orgId = searchParams.get('org_id');
    const clubId = searchParams.get('club_id');
    const teamId = searchParams.get('team_id');

    if (orgId && isSuperAdmin) setSelectedOrgId(String(orgId));
    if (clubId) setSelectedClubId(String(clubId));
    if (teamId) setSelectedTeamId(String(teamId));
  }, [isSuperAdmin, searchParams]);

  // Fetch org options for superadmin
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

  const filteredTeams = useMemo(() => {
    let list = [...teams];

    const selectedOrg = selectedOrgId
      ? organisations.find((o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId))
      : null;
    const selectedOrgIdResolved = selectedOrg?.id ? String(selectedOrg.id) : selectedOrgId;

    if (selectedTeamId) {
      list = list.filter((t) => String(t.id) === String(selectedTeamId));
    }

    if (selectedClubId) {
      const selectedClub = clubs.find((c) => String(c.id) === String(selectedClubId));
      const selectedClubName = selectedClub?.name;
      list = list.filter((team: any) => {
        const teamParentId = team.parent_id ?? team.parent ?? null;
        const teamParentName = team.parent_name ?? null;
        const matchesById = teamParentId !== null && String(teamParentId) === String(selectedClubId);
        const matchesByName = selectedClubName && teamParentName && String(teamParentName) === String(selectedClubName);
        return matchesById || matchesByName;
      });
    }

    if (selectedOrgId) {
      list = list.filter((team: any) => {
        const parentId = team.parent_id ?? team.parent ?? null;
        const parentName = team.parent_name ?? null;

        let parentClub = parentId !== null ? clubs.find((c) => String(c.id) === String(parentId)) : undefined;
        if (!parentClub && parentName) parentClub = clubs.find((c) => c.name === parentName);
        if (!parentClub) return false;

        const clubOrg = typeof parentClub.organisation === 'string' ? parentClub.organisation : parentClub.organisation?.id;
        return String(clubOrg) === String(selectedOrgIdResolved);
      });
    }

    if (statusFilter === 'active') {
      list = list.filter((t: any) => t.is_active !== false);
    } else if (statusFilter === 'inactive') {
      list = list.filter((t: any) => t.is_active === false);
    }

    return list;
  }, [teams, selectedOrgId, selectedClubId, selectedTeamId, clubs, statusFilter, organisations]);

  const breadcrumbs = [
    { label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { label: 'Federations', onClick: () => navigate('/organisations') },
    { label: 'Teams', current: true },
  ];

  const handleDeleteProject = async (orgSlugOrId: string, projectSlugOrId: string, projectName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${projectName}?`)) return;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/`, {
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

      setTeams((prev) => prev.filter((p: any) => String(p.id) !== String(projectSlugOrId) && String(p.slug) !== String(projectSlugOrId)));
      if (String(selectedTeamId) === String(projectSlugOrId)) setSelectedTeamId('');
    } catch (e) {
      console.error(e);
      alert('Error deleting team');
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Teams"
        breadcrumbs={breadcrumbs}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <WorkFilterBar
              organisations={organisations}
              clubs={clubs}
              teams={teams}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              selectedOrgId={selectedOrgId}
              onOrganisationChange={(value) => {
                setSelectedOrgId(value);
                setSelectedClubId('');
                setSelectedTeamId('');
              }}
              selectedClubId={selectedClubId}
              onClubChange={(value) => {
                setSelectedClubId(value);
                setSelectedTeamId('');
              }}
              selectedTeamId={selectedTeamId}
              onTeamChange={(value) => {
                setSelectedTeamId(value);
              }}
              onClear={() => {
                setStatusFilter('all');
                setSelectedClubId('');
                setSelectedTeamId('');
                if (isSuperAdmin) setSelectedOrgId('');
              }}
            />
          </div>
        }
      />
      <PageContent>
        {isLoading && <LoadingState message="Loading teams..." />}
        {error && <Alert variant="error">{error}</Alert>}

        {!isLoading && !error && filteredTeams.length === 0 && (
          <Alert variant="info">No teams match the current filters.</Alert>
        )}

        {!isLoading && !error && filteredTeams.length > 0 && (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Club</th>
                    <th>Federation</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right', minWidth: '220px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.map((team: any) => {
                    const parentId = team.parent_id ?? team.parent ?? null;
                    const parentName = team.parent_name ?? null;
                    let parentClub = parentId !== null ? clubs.find((c) => String(c.id) === String(parentId)) : undefined;
                    if (!parentClub && parentName) parentClub = clubs.find((c) => c.name === parentName);

                    const parentClubSlugOrId = parentClub?.slug || parentClub?.id || (parentId !== null ? String(parentId) : undefined);
                    const orgRef = (parentClub as any)?.organisation as string | { id: string } | undefined;

                    const parentClubOrgId = (typeof orgRef === 'string' ? orgRef : (orgRef as any)?.id) || '';
                    const parentClubOrgFromList = parentClubOrgId
                      ? organisations.find((o) => String(o.id) === String(parentClubOrgId))
                      : undefined;
                    const selectedOrg = selectedOrgId
                      ? organisations.find((o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId))
                      : undefined;

                    const parentClubOrgSlugOrId =
                      (orgRef as any)?.slug ||
                      parentClubOrgFromList?.slug ||
                      selectedOrg?.slug ||
                      parentClubOrgId ||
                      selectedOrg?.id ||
                      selectedOrgId;

                    const parentClubOrgName =
                      (typeof orgRef === 'string' ? undefined : (orgRef as any)?.name) || parentClubOrgFromList?.name;
                    const teamSlugOrId = team.slug || team.id;

                    const teamDetailPath = parentClubSlugOrId
                      ? `/organisations/${parentClubOrgSlugOrId}/projects/${parentClubSlugOrId}/teams/${teamSlugOrId}`
                      : `/organisations/${parentClubOrgSlugOrId}/projects/${teamSlugOrId}`;

                    const clubDetailPath = parentClubSlugOrId ? `/organisations/${parentClubOrgSlugOrId}/projects/${parentClubSlugOrId}` : '';

                    return (
                      <tr key={team.id}>
                        <td>
                          <a
                            href={teamDetailPath}
                            className="text-blue-600 hover:underline"
                            style={{ fontSize: '0.85rem' }}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(teamDetailPath);
                            }}
                          >
                            {team.name}
                          </a>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {parentClubSlugOrId ? (
                            <a
                              href={clubDetailPath}
                              className="text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(clubDetailPath);
                              }}
                            >
                              {parentClub?.name || team.parent_name || 'Club'}
                            </a>
                          ) : (
                            team.parent_name || '-'
                          )}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {parentClubOrgSlugOrId ? (
                            <a
                              href={`/organisations/${parentClubOrgSlugOrId}`}
                              className="text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/organisations/${parentClubOrgSlugOrId}`);
                              }}
                            >
                              {parentClubOrgName || 'Federation'}
                            </a>
                          ) : (
                            parentClubOrgName || '-'
                          )}
                        </td>
                        <td>{team.is_active === false ? 'Inactive' : 'Active'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => {
                                setDetailProject(team);
                                setIsDetailModalOpen(true);
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '4px',
                                border: '1px solid var(--app-border)',
                                backgroundColor: 'var(--app-surface-2)',
                                color: 'var(--app-text)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}
                            >
                              View
                            </button>

                            {userCanEditProject && parentClubOrgSlugOrId && (
                              <button
                                onClick={() => navigate(`/organisations/${parentClubOrgSlugOrId}/projects/${teamSlugOrId}/edit`)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  border: '1px solid #007bff',
                                  backgroundColor: 'var(--app-surface)',
                                  color: '#007bff',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                              >
                                Edit
                              </button>
                            )}

                            {userCanDeleteProject && parentClubOrgSlugOrId && (
                              <button
                                onClick={() => handleDeleteProject(String(parentClubOrgSlugOrId), String(teamSlugOrId), String(team.name))}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  border: '1px solid #dc3545',
                                  backgroundColor: 'var(--app-surface)',
                                  color: '#dc3545',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
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
      </PageContent>
    </AppShell>
  );
}
