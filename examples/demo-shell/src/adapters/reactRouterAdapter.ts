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
     * Examples:
     * - org only: /techcorp
     * - org + project: /techcorp/web-platform
     */
    buildPathForContext: (context: { orgSlug: string; projectSlug?: string | null }) => {
      if (context.projectSlug) {
        return `/${context.orgSlug}/${context.projectSlug}`;
      }
      return `/${context.orgSlug}`;
    },
  };
}
