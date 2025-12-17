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
     * Note: context.orgSlug contains the org ID (UUID) and projectSlug contains project ID (integer)
     * since we've adapted the context switcher to work with IDs instead of slugs.
     */
    buildPathForContext: (context: { orgSlug: string; projectSlug?: string | null }, options?: { preservePath?: boolean; fallbackPath?: string }) => {
      // Build path based on context IDs
      const orgId = context.orgSlug; // Actually contains org UUID
      const projectId = context.projectSlug; // Actually contains project ID

      // If preservePath is true, stay on current page and just update context
      if (options?.preservePath) {
        const currentPath = location.pathname;

        // Check if current path contains organisation/project segments
        const pathSegments = currentPath.split('/').filter(Boolean);
        const orgIndex = pathSegments.indexOf('organisations');
        const projectIndex = pathSegments.indexOf('projects');

        // If path contains org/project structure, replace the IDs
        if (orgIndex !== -1) {
          // Replace org ID
          pathSegments[orgIndex + 1] = orgId;

          // Replace project ID if exists
          if (projectIndex !== -1 && projectId) {
            pathSegments[projectIndex + 1] = projectId;
          } else if (projectIndex !== -1 && !projectId) {
            // Remove project segment if switching to org without project
            pathSegments.splice(projectIndex, 2);
          }

          return '/' + pathSegments.join('/');
        }

        // If path doesn't contain org/project structure, stay on same page
        // (e.g., /status/permissions, /dashboard)
        return currentPath;
      }

      // Default behavior: navigate to org/project page
      if (projectId) {
        return `/organisations/${orgId}/projects/${projectId}`;
      } else if (orgId) {
        return `/organisations/${orgId}`;
      }

      // Return fallback path or dashboard
      return options?.fallbackPath || '/dashboard';
    },
  };
}
