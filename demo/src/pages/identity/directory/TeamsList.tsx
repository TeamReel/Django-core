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

interface TeamsListProps {
  preselectedOrgId?: string;
  preselectedClubId?: string;
}

export const TeamsList: React.FC<TeamsListProps> = ({ preselectedOrgId, preselectedClubId }) => {
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

  const orgLocked = Boolean(preselectedOrgId);
  const clubLocked = Boolean(preselectedClubId);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(preselectedOrgId || '');
  const [selectedClubId, setSelectedClubId] = useState<string>(preselectedClubId || '');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isNumericId = (value: unknown) => /^\d+$/.test(String(value ?? '').trim());
  const isUuid = (value: unknown) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value || ''),
    );

  // When org-locked, we receive an org UUID or Slug.
  // Resolve and pin the slug to ensure accurate API calls.
  const [lockedOrgSlug, setLockedOrgSlug] = useState<string>('');

  useEffect(() => {
    if (preselectedOrgId) {
      setSelectedOrgId(preselectedOrgId);
    }
  }, [preselectedOrgId]);

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

    // Fallback: resolve UUID -> slug via organisations list.
    let cancelled = false;
    const loadSlug = async () => {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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
      setSelectedClubId(preselectedClubId);
    }
  }, [preselectedClubId]);

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
    if (orgLocked) return;
    if (!isSuperAdmin && context.organisation?.id) {
      setSelectedOrgId(String(context.organisation.id));
    }
  }, [context.organisation?.id, isSuperAdmin, orgLocked]);

  useEffect(() => {
    const orgId = searchParams.get('org_id');
    const clubId = searchParams.get('club_id');
    const teamId = searchParams.get('team_id');

    if (!orgLocked && orgId && isSuperAdmin) setSelectedOrgId(String(orgId));
    if (!clubLocked && clubId) setSelectedClubId(String(clubId));
    if (teamId) setSelectedTeamId(String(teamId));
  }, [isSuperAdmin, searchParams, orgLocked, clubLocked]);

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

  // Fetch clubs/teams options
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      const getSelectedOrgSlugForApi = () => {
        const selectedOrg = selectedOrgId
          ? organisations.find(
              (o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId),
            )
          : null;

        if (orgLocked) {
          return (
            selectedOrg?.slug ||
            lockedOrgSlug ||
            (!isNumericId(selectedOrgId) && !isUuid(selectedOrgId) ? selectedOrgId : '') ||
            ''
          );
        }
        return (
          selectedOrg?.slug ||
          (!isNumericId(selectedOrgId) && !isUuid(selectedOrgId) ? selectedOrgId : '') ||
          context.organisation?.slug ||
          ''
        );
      };

      try {
        const orgSlugForApi = getSelectedOrgSlugForApi();

        if (orgLocked && !orgSlugForApi) {
             setClubs([]);
             setTeams([]);
             setIsLoading(false);
             return;
        }

        if (orgSlugForApi) {
             // Scoped fetch
            const [clubsData, teamsData] = await Promise.all([
                fetchAllPages<ProjectOption>(
                  `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=500&include_archived=true&parent_project__isnull=true`,
                  { credentials: 'include' },
                  { ttlMs: 120_000, bypass: refreshKey > 0 },
                ),
                fetchAllPages<ProjectOption>(
                  `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=2000&include_archived=true&parent_project__isnull=false`,
                  { credentials: 'include' },
                  { ttlMs: 120_000, bypass: refreshKey > 0 },
                )
            ]);
            setClubs(clubsData || []);
            setTeams(teamsData || []);
        } else {
            // Global fetch
            const [clubsData, teamsData] = await Promise.all([
                fetchAllPages<ProjectOption>(
                  `${apiBaseUrl}/api/v1/projects/?page_size=200&include_archived=true&parent_project__isnull=true`,
                  { credentials: 'include' },
                  { ttlMs: 120_000, bypass: refreshKey > 0 },
                ),
                fetchAllPages<ProjectOption>(
                  `${apiBaseUrl}/api/v1/projects/?page_size=200&include_archived=true&parent_project__isnull=false`,
                  { credentials: 'include' },
                  { ttlMs: 120_000, bypass: refreshKey > 0 },
                )
            ]);
            setClubs(clubsData || []);
            setTeams(teamsData || []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load teams');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [refreshKey, orgLocked, lockedOrgSlug, preselectedOrgId, selectedOrgId, context.organisation, organisations]);

  const filteredTeams = useMemo(() => {
      let list = [...teams];

      const sortKey = (value: unknown) => {
        const s = String(value ?? '').trim();
        return s ? s.toLocaleLowerCase() : '\uffff';
      };

      const getFederationName = (team: any) => {
        const org = team?.organisation;
        if (typeof org === 'object' && org?.name) return org.name;
        const orgId = typeof org === 'string' ? org : org?.id;
        const fromList = orgId ? organisations.find((o) => String(o.id) === String(orgId)) : undefined;
        return fromList?.name || '';
      };

      const getClubName = (team: any) => {
        const parent = team?.parent_project || team?.parent_id || team?.parent_project_id;
        const parentId = typeof parent === 'object' ? parent?.id : parent;
        const parentName = typeof parent === 'object' ? (parent?.name || parent?.slug) : '';
        const clubObj = clubs.find((c) => String(c.id) === String(parentId));
        return clubObj?.name || parentName || '';
      };

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
          const before = list.length;
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

      // Alphabetical: Federation, Club, Team
      list.sort((a: any, b: any) => {
        const byFederation = sortKey(getFederationName(a)).localeCompare(sortKey(getFederationName(b)));
        if (byFederation !== 0) return byFederation;
        const byClub = sortKey(getClubName(a)).localeCompare(sortKey(getClubName(b)));
        if (byClub !== 0) return byClub;
        return sortKey(a?.name).localeCompare(sortKey(b?.name));
      });

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
        {isSuperAdmin && !orgLocked && (
          <select
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value);
              if (!clubLocked) setSelectedClubId('');
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
                setSelectedTeamId('');
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
                .sort((a, b) => String(a.name).localeCompare(String(b.name)))
                .map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setStatusFilter('all');
              if (!clubLocked) setSelectedClubId('');
              setSelectedTeamId('');
              if (isSuperAdmin) setSelectedOrgId('');
            }}
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
              <thead>
                <tr>
                      {!orgLocked && (
                        <th style={{ ...compactThStyle, width: '15%' }}>Federation</th>
                      )}
                      {!clubLocked && (
                        <th style={{ ...compactThStyle, width: '15%' }}>Club</th>
                      )}
                      <th style={{ ...compactThStyle, width: '8%' }}>Season</th>
                      <th style={{ ...compactThStyle, width: '8%' }}>Competition</th>
                      <th style={{ ...compactThStyle, width: '8%' }}>Match</th>
                    <th style={{ ...compactThStyle, width: '8%' }}>Users</th>
                    <th style={{ ...compactThStyle, width: '8%' }}>Status</th>
                    <th style={{ ...compactThStyle, width: '12%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team: any) => {
                    const orgIdFromProject = team.organisation?.id || (typeof team.organisation === 'string' ? team.organisation : undefined);
                    const orgSlugFromProject = team.organisation?.slug;
                    const orgFromList = orgIdFromProject
                      ? organisations.find((o) => String(o.id) === String(orgIdFromProject))
                      : undefined;

                    // Priority: Explicit slug > List slug > Locked/Context slug > ID
                    const contextSlug = lockedOrgSlug || (!isNumericId(selectedOrgId) && !isUuid(selectedOrgId) ? selectedOrgId : undefined);

                    const orgSlugOrId =
                      orgSlugFromProject ||
                      orgFromList?.slug ||
                      (orgLocked ? contextSlug : undefined) ||
                      orgIdFromProject ||
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
                        {!orgLocked && (
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
                                {team.organisation?.name || '-'}
                              </a>
                            ) : (
                              team.organisation?.name || '-'
                            )}
                          </td>
                        )}

                        {!clubLocked && (
                          <td style={compactTextTdStyle}>
                            {orgSlugOrId && clubSlugOrId ? (
                              <a
                                href={`/${orgSlugOrId}/${clubSlugOrId}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/${orgSlugOrId}/${clubSlugOrId}`);
                                }}
                              >
                                {clubName}
                              </a>
                            ) : (
                              clubName
                            )}
                          </td>
                        )}

                        <td style={compactTdStyle}>
                          <Badge variant="default">{(team as any).seasons_count || 0}</Badge>
                        </td>
                        <td style={compactTdStyle}>
                          <Badge variant="default">{(team as any).competitions_count || 0}</Badge>
                        </td>
                        <td style={compactTdStyle}>
                          <Badge variant="default">{(team as any).matches_count || 0}</Badge>
                        </td>
                        <td style={compactTdStyle}>
                          <Badge variant="default">{(team as any).member_count || 0}</Badge>
                        </td>
                        <td style={compactTdStyle}>
                          <Badge variant={team.is_active === false ? 'warning' : 'success'}>
                            {team.is_active === false ? 'Inactive' : 'Active'}
                          </Badge>
                        </td>
                        <td style={compactTdStyle}>
                          <div style={compactActionsStyle}>
                            <button
                              onClick={() => {
                                setDetailProject(team);
                                setIsDetailModalOpen(true);
                              }}
                              style={actionButtonStyle('primary')}
                            >
                              View
                            </button>
                            {userCanEditProject && (
                              <button
                                onClick={() => {
                                  setEditProject(team);
                                  setIsEditModalOpen(true);
                                }}
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

            setTeams((prev) =>
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
          title="Create Team"
          organisations={organisations}
          clubs={clubs}
          requireOrganisation
          requireClub
          initialOrganisationId={selectedOrgId}
          initialClubId={selectedClubId}
          onCreate={async (projectData) => {
            const orgId = String(projectData.organisation_id || selectedOrgId || '');
            const clubId = String(projectData.parent_project_id || selectedClubId || '');
            if (!orgId) throw new Error('Select a federation first');
            if (!clubId) throw new Error('Select a club first');

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
                parent_project_id: clubId,
              }),
            });

            if (!res.ok) {
              const detail = await res.text().catch(() => '');
              throw new Error(detail || 'Failed to create team');
            }

            const payload: any = await res.json().catch(() => null);
            const created: any = payload?.data?.data || payload?.data || payload;
            if (created && typeof created === 'object') {
              const createdKey = String(created?.slug || created?.id || '').trim();
              if (createdKey) {
                setTeams((prev) => {
                  const list = Array.isArray(prev) ? prev : [];
                  if (list.some((p: any) => String(p?.slug || p?.id || '').trim() === createdKey)) return list;
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
