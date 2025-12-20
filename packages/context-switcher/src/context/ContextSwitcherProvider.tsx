/**
 * Context Switcher Provider component.
 *
 * @packageDocumentation
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ContextSwitcherContext,
  type ContextSwitcherContextValue,
} from './ContextSwitcherContext';
import type {
  ContextSwitcherConfig,
  UserContext,
  Organisation,
  Project,
  ContextError,
} from '../types';
import {
  fetchOrganisations as apiFetchOrganisations,
  fetchProjects as apiFetchProjects,
  setCurrentContext,
} from '../api';

/**
 * Props for ContextSwitcherProvider.
 */
export interface ContextSwitcherProviderProps {
  /** Provider configuration */
  config: ContextSwitcherConfig;

  /** Child components */
  children: React.ReactNode;
}

/**
 * Provider component that manages context switching state.
 * Wrap your app with this provider to enable context switching.
 *
 * @example
 * ```tsx
 * <ContextSwitcherProvider config={config}>
 *   <App />
 * </ContextSwitcherProvider>
 * ```
 */
export function ContextSwitcherProvider({
  config,
  children,
}: ContextSwitcherProviderProps): JSX.Element {
  // State management
  const [context, setContext] = useState<UserContext>({
    organisation: null,
    project: null,
    isLoading: true,
    error: null,
  });

  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSwitching, setIsSwitching] = useState(false);

  // ARIA live region for screen reader announcements
  const [announcement, setAnnouncement] = useState<string>('');

  const {
    routerAdapter,
    apiBaseUrl = '/api/v1',
    onContextChanged,
    onContextError,
    onBeforeContextChange,
  } = config;

  /**
   * Parse organisation UUID and project ID from current URL path.
   * Expected format: /organisations/{uuid} or /organisations/{uuid}/projects/{id}
   */
  const parseContextFromPath = useCallback((): {
    orgId: string | null;
    projectId: string | null;
  } => {
    const path = routerAdapter.getCurrentPath();
    const segments = path.split('/').filter(Boolean);

    // Expected format: /organisations/{uuid}/projects/{id}
    let orgId: string | null = null;
    let projectId: string | null = null;

    const orgIndex = segments.indexOf('organisations');
    if (orgIndex !== -1 && segments.length > orgIndex + 1) {
      orgId = segments[orgIndex + 1];
    }

    const projectIndex = segments.indexOf('projects');
    if (projectIndex !== -1 && segments.length > projectIndex + 1) {
      projectId = segments[projectIndex + 1];
    }

    return { orgId, projectId };
  }, [routerAdapter]);

  /**
   * Fetch all organisations for the current user.
   */
  const fetchOrganisations = useCallback(async (): Promise<Organisation[]> => {
    return apiFetchOrganisations(apiBaseUrl);
  }, [apiBaseUrl]);

  /**
   * Find organisation by slug from the organisations list.
   */
  const findOrganisation = useCallback(
    (orgSlug: string): Organisation | null => {
      return organisations.find(org => org.slug === orgSlug) || null;
    },
    [organisations]
  );

  /**
   * Fetch all projects for an organisation.
   */
  const fetchProjects = useCallback(
    async (orgSlug: string): Promise<Project[]> => {
      return apiFetchProjects(orgSlug, apiBaseUrl);
    },
    [apiBaseUrl]
  );

  /**
   * Load context from current URL and fetch available orgs/projects.
   */
  const loadContext = useCallback(async (): Promise<void> => {
    setContext((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch all organisations
      const allOrgs = await fetchOrganisations();
      setOrganisations(allOrgs);

      // Parse current context from URL
      const { orgId, projectId } = parseContextFromPath();

      if (!orgId) {
        // No context in URL - try to restore from localStorage
        const storedOrgId = localStorage.getItem('django-core:currentOrgId');
        const storedProjectId = localStorage.getItem('django-core:currentProjectId');

        if (storedOrgId) {
          const storedOrg = allOrgs.find(org => org.id === storedOrgId);
          if (storedOrg) {
            // Fetch projects for restored org
            const orgProjects = await fetchProjects(storedOrg.slug);
            setProjects(orgProjects);

            const storedProject = storedProjectId
              ? orgProjects.find(p => String(p.id) === String(storedProjectId))
              : null;

            const restoredContext: UserContext = {
              organisation: storedOrg,
              project: storedProject || null,
              isLoading: false,
              error: null,
            };

            setContext(restoredContext);

            if (onContextChanged) {
              onContextChanged(restoredContext);
            }
            return;
          }
        }

        // No stored context either
        setContext({
          organisation: null,
          project: null,
          isLoading: false,
          error: null,
        });
        setProjects([]);
        return;
      }

      // Find organisation from fetched list by ID or Slug
      const organisation = allOrgs.find(org => org.id === orgId || org.slug === orgId) || null;
      if (!organisation) {
        // Organisation not found by slug - try localStorage as fallback
        const storedOrgId = localStorage.getItem('django-core:currentOrgId');
        if (storedOrgId) {
          const storedOrg = allOrgs.find(org => org.id === storedOrgId);
          if (storedOrg) {
            // Use stored org but stay on current page (context switcher will handle URL sync)
            const orgProjects = await fetchProjects(storedOrg.slug);
            setProjects(orgProjects);

            const newContext: UserContext = {
              organisation: storedOrg,
              project: null,
              isLoading: false,
              error: null,
            };

            setContext(newContext);

            if (onContextChanged) {
              onContextChanged(newContext);
            }
            return;
          }
        }

        // Still not found - clear context
        setContext({
          organisation: null,
          project: null,
          isLoading: false,
          error: null,
        });
        setProjects([]);
        return;
      }

      // Fetch projects for this organisation
      const orgProjects = await fetchProjects(organisation.slug);
      setProjects(orgProjects);

      // Find current project if specified (compare as strings since URL params are strings)
      const project = projectId
        ? orgProjects.find(p => String(p.id) === String(projectId) || p.slug === projectId) || null
        : null;

      const newContext: UserContext = {
        organisation,
        project,
        isLoading: false,
        error: null,
      };

      setContext(newContext);

      // Store context in localStorage for persistence
      if (organisation) {
        localStorage.setItem('django-core:currentOrgId', organisation.id);
        if (project) {
          localStorage.setItem('django-core:currentProjectId', String(project.id));
        } else {
          localStorage.removeItem('django-core:currentProjectId');
        }
      } else {
        localStorage.removeItem('django-core:currentOrgId');
        localStorage.removeItem('django-core:currentProjectId');
      }

      if (onContextChanged) {
        onContextChanged(newContext);
      }
    } catch (err) {
      const error: ContextError =
        err && typeof err === 'object' && 'code' in err
          ? (err as ContextError)
          : {
              code: 500,
              message: 'An unexpected error occurred',
              details: err,
            };

      // Clear context state on error
      setContext({
        organisation: null,
        project: null,
        isLoading: false,
        error: null, // Don't show error for auth failures (401/403)
      });
      setOrganisations([]);
      setProjects([]);

      // Clear localStorage on auth errors (user logged out or unauthorized)
      if (error.code === 401 || error.code === 403) {
        localStorage.removeItem('django-core:currentOrgId');
        localStorage.removeItem('django-core:currentProjectId');
        // Don't call onContextError for expected auth failures
        return;
      }

      // Only report non-auth errors
      if (onContextError) {
        onContextError(new Error(error.message));
      }
    }
  }, [
    fetchOrganisations,
    fetchProjects,
    parseContextFromPath,
    onContextChanged,
    onContextError,
  ]);

  /**
   * Switch to a new organisation/project context.
   */
  const switchContext = useCallback(
    async (org: Organisation, project?: Project): Promise<void> => {
      setIsSwitching(true);

      try {
        // Run onBeforeContextChange hook
        if (onBeforeContextChange) {
          const shouldContinue = await onBeforeContextChange(context, {
            organisation: org,
            project,
          });

          if (!shouldContinue) {
            // Context switch cancelled
            setIsSwitching(false);
            return;
          }
        }

        // Build new path and navigate
        // Use slugs instead of IDs for URL construction
        const newPath = routerAdapter.buildPathForContext(
          { orgSlug: org.slug, projectSlug: project ? (project.slug || String(project.id)) : undefined },
          { preservePath: true, fallbackPath: '/dashboard' }
        );

        // Persist context to localStorage immediately
        localStorage.setItem('django-core:currentOrgId', org.id);
        if (project) {
          localStorage.setItem('django-core:currentProjectId', String(project.id));
        } else {
          localStorage.removeItem('django-core:currentProjectId');
        }

        // Persist context to backend (optional endpoint)
        await setCurrentContext(org.id, project?.id || null, apiBaseUrl);

        routerAdapter.navigateTo(newPath);

        // Announce context change to screen readers
        const message = project
          ? `Switched to ${org.name}, ${project.name} project`
          : `Switched to ${org.name}`;
        setAnnouncement(message);

        // Clear announcement after 3 seconds
        setTimeout(() => setAnnouncement(''), 3000);

        // Context will be reloaded by useEffect when URL changes
      } catch (err) {
        if (onContextError) {
          onContextError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        setIsSwitching(false);
      }
    },
    [context, routerAdapter, onBeforeContextChange, onContextError, apiBaseUrl]
  );

  /**
   * Switch to a different project within current organisation.
   */
  const switchProject = useCallback(
    async (project: Project): Promise<void> => {
      if (!context.organisation) {
        throw new Error('Cannot switch project: no organisation context');
      }

      await switchContext(context.organisation, project);
    },
    [context.organisation, switchContext]
  );

  /**
   * Refresh context data from backend.
   */
  const refresh = useCallback(async (): Promise<void> => {
    await loadContext();
  }, [loadContext]);

  // Load initial context on mount
  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  // Reload context when URL path changes (for navigation)
  // We track the path as a dependency by calling getCurrentPath on each render
  const currentPath = routerAdapter.getCurrentPath();
  useEffect(() => {
    // Reload context whenever path changes
    void loadContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]); // Only depend on path, not loadContext to avoid infinite loops

  // Context value
  const contextValue = useMemo<ContextSwitcherContextValue>(
    () => ({
      context,
      organisations,
      projects,
      switchContext,
      switchProject,
      refresh,
      isSwitching,
    }),
    [context, organisations, projects, switchContext, switchProject, refresh, isSwitching]
  );

  return (
    <ContextSwitcherContext.Provider value={contextValue}>
      {/* ARIA live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        {announcement}
      </div>
      {children}
    </ContextSwitcherContext.Provider>
  );
}
