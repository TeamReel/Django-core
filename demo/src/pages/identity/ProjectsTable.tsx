/**
 * ProjectsTable — Client-side filtering + table rendering for projects.
 */
import React from 'react';
import { Badge } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { Project, Organisation } from '../../types';
import { canEditProject, canDeleteProject } from '../../utils/permissions';
import type { useProjectsPageData } from './useProjectsPageData';
import { routes } from '../../routes';
import styles from './ProjectsTable.module.css';

type Data = ReturnType<typeof useProjectsPageData>;

/** Apply client-side status / org / club / team filters. */
export function filterProjects(d: Data): Project[] {
  const { projects, statusFilter, selectedOrgId, selectedClubId, selectedTeamId, currentOrgSlug, clubs } = d;
  let list = Array.isArray(projects) ? [...projects] : [];

  // Status
  if (statusFilter === 'active') list = list.filter(p => p.is_active !== false);
  else if (statusFilter === 'inactive') list = list.filter(p => p.is_active === false);

  // Organisation (global view only)
  if (!currentOrgSlug && selectedOrgId) {
    list = list.filter((p) => {
      const pid = p.organisation?.id || p.organisation_id;
      return String(pid) === String(selectedOrgId);
    });
  }

  // Club/team
  if (selectedTeamId) {
    list = list.filter((p) => String(p.id) === String(selectedTeamId));
  } else if (selectedClubId) {
    const selectedClubName = clubs.find(c => String(c.id) === String(selectedClubId))?.name;
    list = list.filter((p) => {
      if (String(p.id) === String(selectedClubId)) return true;
      const parentId = p.parent_id ?? p.parent ?? p.parent_project ?? p.parent_project_id ?? null;
      const parentName = p.parent_name ?? p.parent_project_name ?? null;
      return (parentId !== null && String(parentId) === String(selectedClubId))
        || (selectedClubName && parentName && String(parentName) === String(selectedClubName));
    });
  }

  return list;
}

export function ProjectsTable({ d }: { d: Data }) {
  const {
    sort, order, currentOrgSlug, currentOrgId, resolvedOrg, isSuperAdmin, navigate,
    handleSort, handleDelete, setDetailProject, setIsDetailModalOpen, setSelectedProject, setIsEditModalOpen,
  } = d;

  const filtered = filterProjects(d);

  if (filtered.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <Table>
        <thead>
          <tr>
            <th onClick={() => handleSort('name')} className="cursor-pointer">
              Project Name {sort === 'name' && (order === 'asc' ? '↑' : '↓')}
            </th>
            {!currentOrgSlug && <th>Organisation</th>}
            <th>Description</th>
            <th onClick={() => handleSort('member_count')} className="cursor-pointer">
              Team Members {sort === 'member_count' && (order === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('created_at')} className="cursor-pointer">
              Created {sort === 'created_at' && (order === 'asc' ? '↑' : '↓')}
            </th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((project) => {
            const projectOrgSlug = project.organisation?.slug || resolvedOrg?.slug || currentOrgId;
            const projectOrg = project.organisation;
            const pCtx: import('@/utils/permissions').PermissionContext = {
              currentOrganisation: projectOrg
                ? { ...projectOrg, name: projectOrg.name || '', user_role: projectOrg.user_role as 'admin' | 'member' | undefined } as unknown as Organisation
                : resolvedOrg,
              isSuperAdmin,
            };
            const canEdit = canEditProject(pCtx);
            const canDel = canDeleteProject(pCtx);

            return (
              <tr key={project.id}>
                <td>
                  <a href={routes.orgProjectDetailLegacy({ orgId: String(projectOrgSlug || ''), projectId: String(project.slug || project.id) })}
                    className="text-blue-600 hover:underline fs-sm"
                    data-testid={`project-name-${project.id}`}
                    onClick={(e) => { e.preventDefault(); navigate(routes.orgProjectDetailLegacy({ orgId: String(projectOrgSlug || ''), projectId: String(project.slug || project.id) })); }}>
                    {project.name}
                  </a>
                </td>
                {!currentOrgSlug && <td className="fs-sm">{project.organisation?.name || '-'}</td>}
                <td className="fs-sm" data-testid={`project-desc-${project.id}`}>{project.description || '-'}</td>
                <td>
                  <Badge variant="default" data-testid={`project-members-${project.id}`}>{project.member_count || 0}</Badge>
                </td>
                <td className="fs-sm" data-testid={`project-created-${project.id}`}>
                  {new Date(project.created_at || '').toLocaleDateString()}
                </td>
                <td>
                  <Badge variant={project.is_active ? 'success' : 'warning'} data-testid={`project-status-${project.id}`}>
                    {project.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td>
                  <div className="flex-row gap-8">
                    <button onClick={() => { setDetailProject(project); setIsDetailModalOpen(true); }}
                      className={`py-4 px-12 rounded-4 cursor-pointer fs-12 fw-500 ${styles.viewButton}`}>
                      View
                    </button>
                    {canEdit && (
                      <button onClick={() => { setSelectedProject(project); setIsEditModalOpen(true); }}
                        className={`p-4 px-8 rounded-4 cursor-pointer fs-12 ${styles.editButton}`}>
                        Edit
                      </button>
                    )}
                    {canDel && (
                      <button onClick={() => handleDelete(String(project.id))}
                        className={`p-4 px-8 rounded-4 cursor-pointer fs-12 ${styles.deleteButton}`}>
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
  );
}
