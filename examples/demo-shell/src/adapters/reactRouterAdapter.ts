import { useNavigate, useLocation } from 'react-router-dom';
import type { RouterAdapter } from '@django-core/context-switcher';

/**
 * React Router adapter for @django-core/context-switcher.
 *
 * Provides integration between React Router v6 and the context switcher,
 * enabling URL-based context management.
 */
export function useReactRouterAdapter(): RouterAdapter {
  const navigate = useNavigate();
  const location = useLocation();

  return {
    /**
     * Get current pathname from React Router location.
     */
    getCurrentPath: () => location.pathname,

    /**
     * Navigate to a new path using React Router navigate.
     */
    navigateTo: (path: string) => navigate(path),

    /**
     * Build URL path for given organisation/project context.
     *
     * Note: context.orgSlug and projectSlug now contain actual slugs (not IDs)
     * since we've migrated to slug-based URLs.
     */
    buildPathForContext: (context: { orgSlug: string; projectSlug?: string | null }, options?: { preservePath?: boolean; fallbackPath?: string }) => {
      // Build path based on context slugs
      const orgSlug = context.orgSlug;
      const projectSlug = context.projectSlug;

      // If preservePath is true, stay on current page and just update context
      if (options?.preservePath) {
        const currentPath = location.pathname;

        // Check if current path contains organisation/project segments
        const pathSegments = currentPath.split('/').filter(Boolean);
        const orgIndex = pathSegments.indexOf('organisations');
        const projectIndex = pathSegments.indexOf('projects');

        // If path contains org/project structure, replace the IDs
        if (orgIndex !== -1) {
          // Check if we're on the organisations LIST page (no ID after 'organisations')
          // If so, stay on the list page - don't navigate to detail
          const hasOrgId = pathSegments.length > orgIndex + 1 && pathSegments[orgIndex + 1];
          if (!hasOrgId || pathSegments[orgIndex + 1] === 'create') {
            // We're on /organisations or /organisations/create - stay there
            return currentPath;
          }

          // Check if we're on projects list page (/organisations/{orgSlug}/projects)
          // without a specific project slug - stay there
          if (projectIndex !== -1) {
            const hasProjectSlug = pathSegments.length > projectIndex + 1 &&
                                pathSegments[projectIndex + 1] &&
                                pathSegments[projectIndex + 1] !== 'create';

            if (!hasProjectSlug) {
              // We're on /organisations/{orgSlug}/projects - stay on projects list
              // Just update the org slug
              pathSegments[orgIndex + 1] = orgSlug;
              return '/' + pathSegments.join('/');
            }
          }

          // Replace org slug (we're on a detail/edit page)
          pathSegments[orgIndex + 1] = orgSlug;

          // Replace project slug if exists in context
          if (projectIndex !== -1 && projectSlug) {
            pathSegments[projectIndex + 1] = projectSlug;
          }
          // Note: If projectSlug is null/undefined, we keep the existing slug in the URL
          // This prevents navigation away from project pages during page refresh/context load

          return '/' + pathSegments.join('/');
        }

        // If path doesn't contain org/project structure, stay on same page
        // (e.g., /status/permissions, /dashboard)

        // Check if we should use query parameters (e.g. /users?organisation_id=...)
        const searchParams = new URLSearchParams(location.search);
        if (currentPath === '/users' || searchParams.has('organisation_id')) {
          searchParams.set('organisation_id', orgSlug);
          if (projectSlug) {
            searchParams.set('project_id', projectSlug);
          } else {
            searchParams.delete('project_id');
          }
          return `${currentPath}?${searchParams.toString()}`;
        }

        return currentPath;
      }

      // Default behavior: navigate to org/project page
      if (projectSlug) {
        return `/organisations/${orgSlug}/projects/${projectSlug}`;
      } else if (orgSlug) {
        return `/organisations/${orgSlug}`;
      }

      // Return fallback path or dashboard
      return options?.fallbackPath || '/dashboard';
    },
  };
}
