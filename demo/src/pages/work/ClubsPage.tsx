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
import WorkFilterBar, { OrganisationOption, ProjectOption } from './WorkFilterBar';

export default function ClubsPage() {
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

  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedClubId, setSelectedClubId] = useState<string>('');

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

  // Allow deep-linking into an org context (e.g. from Federation detail)
  useEffect(() => {
    const orgId = searchParams.get('org_id');
    if (orgId && isSuperAdmin) {
      setSelectedOrgId(String(orgId));
    }
  }, [isSuperAdmin, searchParams]);

  // Fetch org options for superadmin
  useEffect(() => {
    if (!isSuperAdmin) {
      setOrganisations(myOrganisations.map((o) => ({ id: String(o.id), name: o.name })));
      return;
    }

    const load = async () => {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/organisations/?page_size=100`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const orgs = data.data?.results || data.results || [];
        setOrganisations(orgs.map((o: any) => ({ id: String(o.id), name: o.name })));
      } catch {
        // ignore
      }
    };

    load();
  }, [isSuperAdmin, myOrganisations]);

  // Fetch clubs (root projects)
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      try {
        const allClubs = await fetchAllPages<ProjectOption>(
          `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=true`,
          { credentials: 'include' },
        );
        setClubs(allClubs);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load clubs');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const filteredClubs = useMemo(() => {
    let list = [...clubs];

    if (selectedOrgId) {
      list = list.filter((club) => {
        const clubOrg = typeof club.organisation === 'string' ? club.organisation : club.organisation?.id;
        return String(clubOrg) === String(selectedOrgId);
      });
    }

    if (statusFilter === 'active') {
      list = list.filter((c: any) => c.is_active !== false);
    } else if (statusFilter === 'inactive') {
      list = list.filter((c: any) => c.is_active === false);
    }

    if (selectedClubId) {
      list = list.filter((c) => String(c.id) === String(selectedClubId));
    }

    return list;
  }, [clubs, selectedOrgId, statusFilter, selectedClubId]);

  const breadcrumbs = [
    { label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { label: 'Federations', onClick: () => navigate('/organisations') },
    { label: 'Clubs', current: true },
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
        alert('Failed to delete club');
        return;
      }

      setClubs((prev) => prev.filter((p: any) => String(p.id) !== String(projectSlugOrId) && String(p.slug) !== String(projectSlugOrId)));
      if (String(selectedClubId) === String(projectSlugOrId)) setSelectedClubId('');
    } catch (e) {
      console.error(e);
      alert('Error deleting club');
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Clubs"
        breadcrumbs={breadcrumbs}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <WorkFilterBar
              showTeam={false}
              organisations={organisations}
              clubs={clubs}
              teams={[]}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              selectedOrgId={selectedOrgId}
              onOrganisationChange={(value) => {
                setSelectedOrgId(value);
                setSelectedClubId('');
              }}
              selectedClubId={selectedClubId}
              onClubChange={(value) => {
                setSelectedClubId(value);
              }}
              selectedTeamId=""
              onTeamChange={() => {
                // no-op
              }}
              onClear={() => {
                setStatusFilter('all');
                setSelectedClubId('');
                if (isSuperAdmin) setSelectedOrgId('');
              }}
            />
          </div>
        }
      />
      <PageContent>
        {isLoading && <LoadingState message="Loading clubs..." />}
        {error && <Alert variant="error">{error}</Alert>}

        {!isLoading && !error && filteredClubs.length === 0 && (
          <Alert variant="info">No clubs match the current filters.</Alert>
        )}

        {!isLoading && !error && filteredClubs.length > 0 && (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <th>Club</th>
                    <th>Federation</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right', minWidth: '220px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClubs.map((club: any) => {
                    const orgSlugOrId = club.organisation?.slug || club.organisation?.id || selectedOrgId;
                    const clubSlugOrId = club.slug || club.id;
                    return (
                      <tr key={club.id}>
                        <td>
                          <a
                            href={`/organisations/${orgSlugOrId}/projects/${club.slug || club.id}`}
                            className="text-blue-600 hover:underline"
                            style={{ fontSize: '0.85rem' }}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/organisations/${orgSlugOrId}/projects/${club.slug || club.id}`);
                            }}
                          >
                            {club.name}
                          </a>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {orgSlugOrId ? (
                            <a
                              href={`/organisations/${orgSlugOrId}`}
                              className="text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/organisations/${orgSlugOrId}`);
                              }}
                            >
                              {club.organisation?.name || 'Federation'}
                            </a>
                          ) : (
                            club.organisation?.name || '-'
                          )}
                        </td>
                        <td>{club.is_active === false ? 'Inactive' : 'Active'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => navigate(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}`)}
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

                            <button
                              onClick={() => navigate(`/teams?org_id=${encodeURIComponent(String(orgSlugOrId))}&club_id=${encodeURIComponent(String(club.id))}`)}
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
                              Teams
                            </button>

                            {userCanEditProject && (
                              <button
                                onClick={() => navigate(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/edit`)}
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

                            {userCanDeleteProject && (
                              <button
                                onClick={() => handleDeleteProject(String(orgSlugOrId), String(clubSlugOrId), String(club.name))}
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
      </PageContent>
    </AppShell>
  );
}
