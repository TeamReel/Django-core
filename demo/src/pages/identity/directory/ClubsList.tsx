import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card, Button, Badge } from '@django-core/design-system';
import LoadingState from '../../../components/LoadingState';
import { Table } from '@/shims/design-system';
import { fetchAllPages, invalidateFetchAllPagesCache } from '../../../utils/fetchAllPages';
import { canDeleteProject, canEditProject } from '../../../utils/permissions';
import ProjectDetailModal from '../ProjectDetailModal';
import ProjectEditModal from '../ProjectEditModal';
import ProjectCreateModal from '../ProjectCreateModal';
import { OrganisationOption, ProjectOption } from '../../work/WorkFilterBar';
import {
    compactTableStyle,
    compactThStyle,
    compactTdStyle,
    compactTextTdStyle,
    compactActionsStyle,
    actionButtonStyle
} from '../../../utils/directoryStyles';

export const ClubsList: React.FC = () => {
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

  const [editProject, setEditProject] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  useEffect(() => {
    if (!isSuperAdmin && context.organisation?.id) {
      setSelectedOrgId(String(context.organisation.id));
    }
  }, [context.organisation?.id, isSuperAdmin]);

  useEffect(() => {
    const orgId = searchParams.get('org_id');
    if (orgId && isSuperAdmin) {
      setSelectedOrgId(String(orgId));
    }
  }, [isSuperAdmin, searchParams]);

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

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      try {
        const [allClubs, allTeams] = await Promise.all([
          fetchAllPages<ProjectOption>(
            `${apiBaseUrl}/api/v1/projects/?page_size=200&include_archived=true&parent_project__isnull=true`,
            { credentials: 'include' },
            { ttlMs: 120_000, bypass: refreshKey > 0 },
          ),
          fetchAllPages<ProjectOption>(
            `${apiBaseUrl}/api/v1/projects/?page_size=200&include_archived=true&parent_project__isnull=false`,
            { credentials: 'include' },
            { ttlMs: 120_000, bypass: refreshKey > 0 },
          ),
        ]);
        setClubs(allClubs);
        setTeams(allTeams);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load clubs');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [refreshKey]);

  const filteredClubs = useMemo(() => {
    let list = [...clubs];

    const sortKey = (value: unknown) => {
      const s = String(value ?? '').trim();
      return s ? s.toLocaleLowerCase() : '\uffff';
    };

    const getFederationName = (club: any) => {
      const org = club?.organisation;
      if (typeof org === 'object' && org?.name) return org.name;
      const orgId = typeof org === 'string' ? org : org?.id;
      const fromList = orgId ? organisations.find((o) => String(o.id) === String(orgId)) : undefined;
      return fromList?.name || '';
    };

    const selectedOrg = selectedOrgId
      ? organisations.find((o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId))
      : null;
    const selectedOrgIdResolved = selectedOrg?.id ? String(selectedOrg.id) : selectedOrgId;

    if (selectedOrgId) {
      list = list.filter((club) => {
        const clubOrg = typeof club.organisation === 'string' ? club.organisation : club.organisation?.id;
        return String(clubOrg) === String(selectedOrgIdResolved);
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

    // Alphabetical: Federation, then Club
    list.sort((a: any, b: any) => {
      const byFederation = sortKey(getFederationName(a)).localeCompare(sortKey(getFederationName(b)));
      if (byFederation !== 0) return byFederation;
      return sortKey(a?.name).localeCompare(sortKey(b?.name));
    });

    return list;
  }, [clubs, organisations, selectedOrgId, statusFilter, selectedClubId]);

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
    <div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        {isSuperAdmin && (
          <select
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value);
              setSelectedClubId('');
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
        <Button
          variant="secondary"
          size="md"
          onClick={() => {
            setStatusFilter('all');
            setSelectedClubId('');
            if (isSuperAdmin) setSelectedOrgId('');
          }}
          style={{ marginLeft: 'auto' }}
        >
          Clear
        </Button>
        {userCanEditProject && (
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setIsCreateModalOpen(true);
            }}
          >
            Create Club
          </Button>
        )}
      </div>

      {isLoading && <LoadingState message="Loading clubs..." />}
      {error && <Alert variant="error">{error}</Alert>}

      {!isLoading && !error && filteredClubs.length === 0 && (
        <Alert variant="info">No clubs match the current filters.</Alert>
      )}

      {!isLoading && !error && filteredClubs.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <Table style={compactTableStyle}>
              <thead>
                <tr>
                  <th style={{ ...compactThStyle, width: '15%' }}>Federation</th>
                  <th style={{ ...compactThStyle, width: '20%' }}>Club</th>
                  <th style={{ ...compactThStyle, width: '8%' }}>Team</th>
                  <th style={{ ...compactThStyle, width: '8%' }}>Season</th>
                  <th style={{ ...compactThStyle, width: '8%' }}>Competition</th>
                  <th style={{ ...compactThStyle, width: '8%' }}>Match</th>
                  <th style={{ ...compactThStyle, width: '8%' }}>Users</th>
                  <th style={{ ...compactThStyle, width: '10%' }}>Status</th>
                  <th style={{ ...compactThStyle, width: '12%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClubs.map((club: any) => {
                  const orgIdFromProject = club.organisation?.id || (typeof club.organisation === 'string' ? club.organisation : undefined);
                  const orgSlugFromProject = club.organisation?.slug;
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
                  const clubSlugOrId = club.slug || club.id;

                  // Calculate teams count for this club from teams data
                  const teamsForClub = teams.filter(t => {
                    const parentId = t.parent_id || (t as any).parent_project_id;
                    return String(parentId) === String(club.id);
                  });
                  const teamsCount = teamsForClub.length;

                  return (
                    <tr key={club.id}>
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
                            {club.organisation?.name || 'Federation'}
                          </a>
                        ) : (
                          club.organisation?.name || '-'
                        )}
                      </td>
                      <td style={compactTextTdStyle}>
                        <a
                          href={`/organisations/${orgSlugOrId}/projects/${club.slug || club.id}`}
                          className="text-blue-600 hover:underline"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/organisations/${orgSlugOrId}/projects/${club.slug || club.id}`);
                          }}
                        >
                          {club.name}
                        </a>
                      </td>
                      <td style={compactTdStyle}>
                        <Badge variant="default">
                          {teamsCount}
                        </Badge>
                      </td>
                      <td style={compactTdStyle}>
                        <Badge variant="default">
                          {(club as any).seasons_count || 0}
                        </Badge>
                      </td>
                      <td style={compactTdStyle}>
                        <Badge variant="default">
                          {(club as any).competitions_count || 0}
                        </Badge>
                      </td>
                      <td style={compactTdStyle}>
                        <Badge variant="default">
                          {(club as any).matches_count || 0}
                        </Badge>
                      </td>
                      <td style={compactTdStyle}>
                        <Badge variant="default">
                          {(club as any).member_count || 0}
                        </Badge>
                      </td>
                      <td style={compactTdStyle}>
                        <Badge variant={club.is_active === false ? 'warning' : 'success'}>
                            {club.is_active === false ? 'Inactive' : 'Active'}
                        </Badge>
                      </td>
                      <td style={compactTdStyle}>
                        <div style={compactActionsStyle}>
                          <button
                            onClick={() => {
                              setDetailProject(club);
                              setIsDetailModalOpen(true);
                            }}
                            style={actionButtonStyle('primary')}
                          >
                            View
                          </button>
                          {userCanEditProject && (
                            <button
                              onClick={() => {
                                setEditProject(club);
                                setIsEditModalOpen(true);
                              }}
                              style={actionButtonStyle('warning')}
                            >
                              Edit
                            </button>
                          )}
                          {userCanDeleteProject && (
                            <button
                              onClick={() => handleDeleteProject(String(orgSlugOrId), String(clubSlugOrId), String(club.name))}
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

      <ProjectEditModal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={editProject}
        onSave={async (projectData) => {
            if (!editProject) return;
            const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
            const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
            const projectSlugOrId = (editProject as any).slug || editProject.id;
            const response = await fetch(`${baseUrl}/api/v1/projects/${projectSlugOrId}/?include_archived=true`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken || '',
                },
                credentials: 'include',
                body: JSON.stringify(projectData),
            });

            if (!response.ok) {
              let message = 'Failed to update project';
              try {
                const json: any = await response.json();
                message = json?.error?.message || json?.detail || json?.message || message;
              } catch {
                const text = await response.text().catch(() => '');
                if (text) message = text;
              }
              throw new Error(message);
            }
            // Avoid full refetch: update local state from the API response.
            const payload: any = await response.json().catch(() => null);
            const updated = payload?.data?.data || payload?.data || payload;

            setClubs((prev) =>
              prev.map((p: any) => {
                const match = String(p?.slug || p?.id) === String(projectSlugOrId);
                return match ? { ...p, ...(updated || projectData) } : p;
              })
            );
            setEditProject((prev: any) => (prev ? { ...prev, ...(updated || projectData) } : prev));

            // Ensure any later fetches don't serve stale cached lists.
            invalidateFetchAllPagesCache();
        }}
      />

      <ProjectCreateModal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Club"
        organisations={organisations}
        requireOrganisation
        initialOrganisationId={selectedOrgId}
        onCreate={async (projectData) => {
          const orgId = String(projectData.organisation_id || selectedOrgId || '');
          if (!orgId) throw new Error('Select a federation first');

          const orgSlug = organisations.find((o) => String(o.id) === String(orgId))?.slug || orgId;
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

          const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlug}/projects/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify({
              name: projectData.name,
              description: projectData.description || '',
            }),
          });

          if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new Error(detail || 'Failed to create club');
          }

          // Update UI immediately so the club appears without waiting on any refetch.
          const payload: any = await res.json().catch(() => null);
          const created: any = payload?.data?.data || payload?.data || payload;
          if (created && typeof created === 'object') {
            const createdKey = String(created?.slug || created?.id || '');
            if (createdKey) {
              setClubs((prev) => {
                if (prev.some((p: any) => String(p?.slug || p?.id || '') === createdKey)) return prev;
                return [created, ...prev];
              });
            }
          }

          // Prevent stale caches on any later navigations.
          invalidateFetchAllPagesCache();
        }}
      />
    </div>
  );
};
