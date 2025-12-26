import { useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { BreadcrumbSwitcherOption } from '../components/BreadcrumbContextSwitcher';

export interface Organisation {
  id: string;
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  organisation_id: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  slug?: string;
}

export interface BreadcrumbContext {
  currentOrgId?: string;
  currentProjectId?: string;
  currentUserId?: string;
}

export interface PermissionChecks {
  /** Check if user can view a specific user's details */
  canViewUser?: (userId: string) => boolean;

  /** Check if user can access an organisation */
  canAccessOrganisation?: (orgId: string) => boolean;

  /** Check if user can access a project */
  canAccessProject?: (projectId: string) => boolean;
}

export interface UseBreadcrumbContextSwitcherProps {
  /** All organisations user has access to */
  organisations: Organisation[];

  /** All projects (will be filtered by current org) */
  projects: Project[];

  /** All users (will be filtered by permissions) */
  users: User[];

  /** Current context (org, project, user) */
  context: BreadcrumbContext;

  /** Permission check functions */
  permissions?: PermissionChecks;

  /** Base path for routing (e.g., '/app') */
  basePath?: string;
}

/**
 * Hook to manage hierarchical breadcrumb context switching
 *
 * Handles:
 * - Filtering options based on current context (org constrains projects)
 * - Permission-based filtering (canViewUser, canAccessOrganisation, etc.)
 * - Routing updates when context changes
 * - Hierarchical validation (switching org resets invalid project)
 *
 * @example
 * ```tsx
 * const {
 *   organisationOptions,
 *   projectOptions,
 *   userOptions,
 *   handleOrganisationSwitch,
 *   handleProjectSwitch,
 *   handleUserSwitch
 * } = useBreadcrumbContextSwitcher({
 *   organisations,
 *   projects,
 *   users,
 *   context: { currentOrgId: 'bundesliga', currentProjectId: 'team-management' },
 *   permissions: { canViewUser, canAccessOrganisation, canAccessProject }
 * });
 * ```
 */
export function useBreadcrumbContextSwitcher({
  organisations,
  projects,
  users,
  context,
  permissions = {},
  basePath = '/app',
}: UseBreadcrumbContextSwitcherProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Filter organisations by permission
  const organisationOptions = useMemo<BreadcrumbSwitcherOption[]>(() => {
    const filtered = organisations.filter((org) =>
      permissions.canAccessOrganisation ? permissions.canAccessOrganisation(org.id) : true
    );
    return filtered.map((org) => ({
      id: org.id,
      label: org.name,
      slug: org.slug,
    }));
  }, [organisations, permissions.canAccessOrganisation]);

  // Filter projects by current organisation and permission
  const projectOptions = useMemo<BreadcrumbSwitcherOption[]>(() => {
    if (!context.currentOrgId) return [];

    const filtered = projects.filter(
      (project) =>
        project.organisation_id === context.currentOrgId &&
        (permissions.canAccessProject ? permissions.canAccessProject(project.id) : true)
    );
    return filtered.map((project) => ({
      id: project.id,
      label: project.name,
      slug: project.slug,
    }));
  }, [projects, context.currentOrgId, permissions.canAccessProject]);

  // Filter users by permission
  const userOptions = useMemo<BreadcrumbSwitcherOption[]>(() => {
    const filtered = users.filter((user) =>
      permissions.canViewUser ? permissions.canViewUser(user.id) : true
    );
    return filtered.map((user) => ({
      id: user.id,
      label: user.username || user.email,
      slug: user.slug || user.id,
    }));
  }, [users, permissions.canViewUser]);

  /**
   * Switch to a different organisation
   * Resets project and user context if they're no longer valid
   */
  const handleOrganisationSwitch = useCallback(
    (option: BreadcrumbSwitcherOption) => {
      const newOrgSlug = option.slug || option.id;

      // Check if current project belongs to new org
      const currentProject = projects.find((p) => p.id === context.currentProjectId);
      const projectStillValid = currentProject?.organisation_id === option.id;
// Check if we are on a projects page (preserve page type)
      const isProjectsPage = location.pathname.includes('/projects');

      if (projectStillValid && currentProject) {
        // Navigate to project detail in new org
        navigate(`${basePath}/organisations/${newOrgSlug}/projects/${currentProject.slug}`);
      } else if (isProjectsPage) {
        // Preserve "projects" list view
        navigate(`${basePath}/organisations/${newOrgSlug}/projects`);
      } else {
        // Navigate to org detail (reset project context)
        navigate(`${basePath}/organisations/${newOrgSlug}`);
      }
    },
    [navigate, basePath, projects, context.currentProjectId, location.pathname]
  );

  /**
   * Switch to a different project within current organisation
   */
  const handleProjectSwitch = useCallback(
    (option: BreadcrumbSwitcherOption) => {
      if (!context.currentOrgId) return;

      const org = organisations.find((o) => o.id === context.currentOrgId);
      if (!org) return;

      const projectSlug = option.slug || option.id;
      navigate(`${basePath}/organisations/${org.slug}/projects/${projectSlug}`);
    },
    [navigate, basePath, organisations, context.currentOrgId]
  );

  /**
   * Switch to a different user
   */
  const handleUserSwitch = useCallback(
    (option: BreadcrumbSwitcherOption) => {
      const userSlug = option.slug || option.id;
      navigate(`${basePath}/users/${userSlug}`);
    },
    [navigate, basePath]
  );

  return {
    organisationOptions,
    projectOptions,
    userOptions,
    handleOrganisationSwitch,
    handleProjectSwitch,
    handleUserSwitch,
  };
}
