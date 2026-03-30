/**
 * Vanilla TypeScript ContextProvider Implementation
 *
 * This implementation demonstrates the ContextProvider interface pattern
 * without any framework dependencies (no React, Vue, Angular).
 *
 * Use this as a reference for implementing multi-tenancy context in non-React environments,
 * or as a base layer to wrap in framework-specific context/store solutions.
 */

import type { ContextProvider, Organization, Project } from '../contracts';

/**
 * Create a context provider instance with automatic state management
 *
 * @param options Configuration options
 * @returns ContextProvider interface instance
 *
 * @example
 * ```typescript
 * // Create provider
 * const contextProvider = createContextProvider({
 *   baseURL: 'https://api.example.com',
 *   onContextChange: (context) => {
 *     console.log('Context changed:', context.currentOrganization?.name);
 *     localStorage.setItem('orgId', context.currentOrganization?.id || '');
 *   },
 * });
 *
 * // Switch organization by ID
 * await contextProvider.setOrganization('org_123');
 *
 * // Switch project by ID
 * await contextProvider.setProject('proj_456');
 * ```
 */
export const createContextProvider = (options?: {
  baseURL?: string;
  onContextChange?: (context: { currentOrganization: Organization | null; currentProject: Project | null }) => void;
}): ContextProvider => {
  const baseURL = options?.baseURL || '';

  let currentOrganization: Organization | null = null;
  let currentProject: Project | null = null;

  const notifyChange = (): void => {
    options?.onContextChange?.({ currentOrganization, currentProject });
  };

  /**
   * Fetch organization from API
   */
  const fetchOrganization = async (organizationId: string): Promise<Organization> => {
    const response = await fetch(`${baseURL}/api/organisations/${organizationId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = (await response.json()) as Record<string, unknown>;
      throw new Error(
        `Failed to fetch organization (${response.status}): ${String(errorData['detail']) || response.statusText}`,
      );
    }

    return (response.json() as Promise<Organization>);
  };

  /**
   * Fetch project from API
   */
  const fetchProject = async (projectId: string): Promise<Project> => {
    const response = await fetch(`${baseURL}/api/projects/${projectId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = (await response.json()) as Record<string, unknown>;
      throw new Error(
        `Failed to fetch project (${response.status}): ${String(errorData['detail']) || response.statusText}`,
      );
    }

    return (response.json() as Promise<Project>);
  };

  return {
    get currentOrganization(): Organization | null {
      return currentOrganization;
    },

    get currentProject(): Project | null {
      return currentProject;
    },

    async setOrganization(organizationId: string): Promise<Organization> {
      const org = await fetchOrganization(organizationId);
      currentOrganization = org;
      currentProject = null; // Clear project when org changes
      notifyChange();
      return org;
    },

    async setProject(projectId: string): Promise<Project> {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }

      const project = await fetchProject(projectId);

      // Verify project belongs to current organization
      if (project.organizationId !== currentOrganization.id) {
        throw new Error('Project does not belong to current organization');
      }

      currentProject = project;
      notifyChange();
      return project;
    },

    clear(): void {
      currentOrganization = null;
      currentProject = null;
      localStorage.removeItem('currentOrgId');
      localStorage.removeItem('currentProjectId');
      notifyChange();
    },

    async restoreContext(): Promise<void> {
      const orgId = localStorage.getItem('currentOrgId');
      const projectId = localStorage.getItem('currentProjectId');

      try {
        if (orgId) {
          const org = await fetchOrganization(orgId);
          currentOrganization = org;

          // Restore project if org was restored and project existed
          if (projectId) {
            try {
              const project = await fetchProject(projectId);
              if (project.organizationId === org.id) {
                currentProject = project;
              }
            } catch {
              // Project no longer accessible - clear it
              localStorage.removeItem('currentProjectId');
            }
          }
        }
        notifyChange();
      } catch (error) {
        // Context restoration failed - clear storage
        localStorage.removeItem('currentOrgId');
        localStorage.removeItem('currentProjectId');
        currentOrganization = null;
        currentProject = null;
        notifyChange();
        throw error;
      }
    },
  };
};
