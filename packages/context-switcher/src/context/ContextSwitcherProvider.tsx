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
  fetchCurrentContext,
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
    async (orgId: string): Promise<Project[]> => {
      return apiFetchProjects(orgId, apiBaseUrl);
    },
    [apiBaseUrl]
  );

  /**
   * Find project by slug from the projects list.
   */
  const findProject = useCallback(
    (projectSlug: string): Project | null => {
      return projects.find(proj => proj.slug === projectSlug) || null;
    },
    [projects]
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

      // Find organisation from list
      const organisation = findOrganisation(orgSlug);
      if (!organisation) {
        throw new Error(`Organisation not found: ${orgSlug}`);
      }

      // Fetch projects for this organisation
      const orgProjects = await fetchProjects(organisation.id);
      setProjects(orgProjects);

      // Find current project if specified
      const project = projectSlug
        ? orgProjects.find(p => p.slug === projectSlug) || null
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
    findOrganisation,
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
        const newPath = routerAdapter.buildPathForContext(
          { orgSlug: org.slug, projectSlug: project?.slug },
          { preservePath: true, fallbackPath: '/dashboard' }
        );

        // Persist context to backend (optional endpoint)
        await setCurrentContext(org.id, project?.id || null, apiBaseUrl);

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
