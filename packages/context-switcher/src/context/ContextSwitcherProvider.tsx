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

  const {
    routerAdapter,
    apiBaseUrl = '/api/v1',
    onContextChanged,
    onContextError,
    onBeforeContextChange,
  } = config;

  /**
   * Parse organisation and project slugs from current URL path.
   */
  const parseContextFromPath = useCallback((): {
    orgSlug: string | null;
    projectSlug: string | null;
  } => {
    const path = routerAdapter.getCurrentPath();
    const segments = path.split('/').filter(Boolean);

    // Expected format: /org-slug or /org-slug/project-slug
    const orgSlug = segments[0] || null;
    const projectSlug = segments[1] || null;

    return { orgSlug, projectSlug };
  }, [routerAdapter]);

  /**
   * Fetch all organisations for the current user.
   */
  const fetchOrganisations = useCallback(async (): Promise<Organisation[]> => {
    const response = await fetch(`${apiBaseUrl}/organisations`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch organisations: ${response.statusText}`);
    }

    return response.json() as Promise<Organisation[]>;
  }, [apiBaseUrl]);

  /**
   * Fetch organisation by slug.
   */
  const fetchOrganisation = useCallback(
    async (orgSlug: string): Promise<Organisation> => {
      const response = await fetch(`${apiBaseUrl}/organisations/${orgSlug}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const error: ContextError = {
          code: response.status,
          message: `Failed to load organisation: ${response.statusText}`,
        };
        throw new Error(error.message);
      }

      return response.json() as Promise<Organisation>;
    },
    [apiBaseUrl]
  );

  /**
   * Fetch all projects for an organisation.
   */
  const fetchProjects = useCallback(
    async (orgSlug: string): Promise<Project[]> => {
      const response = await fetch(
        `${apiBaseUrl}/organisations/${orgSlug}/projects`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      return response.json() as Promise<Project[]>;
    },
    [apiBaseUrl]
  );

  /**
   * Fetch project by slug.
   */
  const fetchProject = useCallback(
    async (orgSlug: string, projectSlug: string): Promise<Project> => {
      const response = await fetch(
        `${apiBaseUrl}/organisations/${orgSlug}/projects/${projectSlug}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const error: ContextError = {
          code: response.status,
          message: `Failed to load project: ${response.statusText}`,
        };
        throw new Error(error.message);
      }

      return response.json() as Promise<Project>;
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
      const { orgSlug, projectSlug } = parseContextFromPath();

      if (!orgSlug) {
        // No context in URL
        setContext({
          organisation: null,
          project: null,
          isLoading: false,
          error: null,
        });
        setProjects([]);
        return;
      }

      // Fetch current organisation and projects
      const organisation = await fetchOrganisation(orgSlug);
      const orgProjects = await fetchProjects(orgSlug);
      setProjects(orgProjects);

      // Fetch current project if specified
      const project = projectSlug
        ? await fetchProject(orgSlug, projectSlug)
        : null;

      const newContext: UserContext = {
        organisation,
        project,
        isLoading: false,
        error: null,
      };

      setContext(newContext);

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

      setContext({
        organisation: null,
        project: null,
        isLoading: false,
        error,
      });
      setOrganisations([]);
      setProjects([]);

      if (onContextError) {
        onContextError(new Error(error.message));
      }
    }
  }, [
    fetchOrganisations,
    fetchOrganisation,
    fetchProjects,
    fetchProject,
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
        const newPath = routerAdapter.buildPathForContext(
          { orgSlug: org.slug, projectSlug: project?.slug },
          { preservePath: true, fallbackPath: '/dashboard' }
        );

        routerAdapter.navigateTo(newPath);

        // Context will be reloaded by useEffect when URL changes
      } catch (err) {
        if (onContextError) {
          onContextError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        setIsSwitching(false);
      }
    },
    [context, routerAdapter, onBeforeContextChange, onContextError]
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
      {children}
    </ContextSwitcherContext.Provider>
  );
}
