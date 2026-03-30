/**
 * React Context Wrapper for ContextProvider
 *
 * Provides React components and hooks for multi-tenancy context management.
 * Wraps the vanilla TypeScript ContextProvider for use in React applications.
 */

import React, { createContext, useContext as useReactContext, useEffect, useState } from 'react';
import type { ContextProvider, Organization, Project } from '../contracts';
import { createContextProvider } from './vanilla';

interface ContextProviderComponentProps {
  children: React.ReactNode;
  baseURL?: string;
  onContextChange?: (context: { currentOrganization: Organization | null; currentProject: Project | null }) => void;
}

// Create React Context for ContextProvider
const Context = createContext<ContextProvider | undefined>(undefined);

/**
 * Context Provider Component
 *
 * Wraps your app to provide context via React Context API
 *
 * @example
 * ```tsx
 * import { ContextProviderComponent, useContext } from './context-example/react';
 *
 * function App() {
 *   return (
 *     <ContextProviderComponent baseURL="https://api.example.com">
 *       <Dashboard />
 *     </ContextProviderComponent>
 *   );
 * }
 *
 * function Dashboard() {
 *   const context = useContext();
 *   return <h1>Organization: {context.currentOrganization?.name}</h1>;
 * }
 * ```
 */
export function ContextProviderComponent({
  children,
  baseURL,
  onContextChange,
}: ContextProviderComponentProps): JSX.Element {
  const [contextProvider] = useState(() =>
    createContextProvider({
      baseURL,
      onContextChange,
    }),
  );

  // Restore context on mount
  useEffect(() => {
    contextProvider.restoreContext().catch((error) => {
      console.warn('Failed to restore context:', error);
    });
  }, [contextProvider]);

  return <Context.Provider value={contextProvider}>{children}</Context.Provider>;
}

/**
 * Hook to access context provider
 * Must be called from within <ContextProviderComponent>
 *
 * @returns ContextProvider interface instance
 * @throws Error if used outside ContextProviderComponent
 *
 * @example
 * ```tsx
 * function OrgSwitcher() {
 *   const context = useContext();
 *   const [orgs, setOrgs] = React.useState<Organization[]>([]);
 *
 *   const handleSwitch = async (orgId: string) => {
 *     try {
 *       await context.setOrganization(orgId);
 *       console.log('Switched to organization');
 *     } catch (error) {
 *       console.error('Cannot access org:', error);
 *     }
 *   };
 *
 *   return (
 *     <select onChange={(e) => handleSwitch(e.target.value)}>
 *       {orgs.map((org) => (
 *         <option key={org.id} value={org.id}>
 *           {org.name}
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useContext(): ContextProvider {
  const context = useReactContext(Context);
  if (!context) {
    throw new Error('useContext must be called from within <ContextProviderComponent>');
  }
  return context;
}

/**
 * Example Organization Switcher Component
 */
export function OrganizationSwitcher(): JSX.Element {
  const context = useContext();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Load available organizations on mount
  useEffect((): void => {
    const loadOrganizations = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await fetch('/api/organisations', {
          headers: { 'Content-Type': 'application/json' },
        });
        const data = (await response.json()) as { organizations: Organization[] };
        setOrganizations(data.organizations);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load organizations');
      } finally {
        setLoading(false);
      }
    };

    void loadOrganizations();
  }, []);

  const handleSwitchOrganization = async (orgId: string): Promise<void> => {
    setError('');
    try {
      await context.setOrganization(orgId);
      console.log('Switched to organization:', orgId);
      // Persist to localStorage
      localStorage.setItem('currentOrgId', orgId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch organization');
    }
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label htmlFor="org-select">
        Organization:
        <select
          id="org-select"
          value={context.currentOrganization?.id || ''}
          onChange={(e) => void handleSwitchOrganization(e.target.value)}
          disabled={loading}
        >
          <option value="">Select an organization...</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </label>
      {error && <div style={{ color: 'red', marginTop: '0.5rem' }}>{error}</div>}
      {loading && <div style={{ color: 'blue', marginTop: '0.5rem' }}>Loading...</div>}
    </div>
  );
}

/**
 * Example Project Switcher Component
 */
export function ProjectSwitcher(): JSX.Element {
  const context = useContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Load projects when organization changes
  useEffect((): void => {
    const loadProjects = async (): Promise<void> => {
      if (!context.currentOrganization) {
        setProjects([]);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/organisations/${context.currentOrganization.id}/projects`, {
          headers: { 'Content-Type': 'application/json' },
        });
        const data = (await response.json()) as { projects: Project[] };
        setProjects(data.projects);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    void loadProjects();
  }, [context]);

  const handleSwitchProject = async (projectId: string): Promise<void> => {
    setError('');
    try {
      await context.setProject(projectId);
      console.log('Switched to project:', projectId);
      // Persist to localStorage
      localStorage.setItem('currentProjectId', projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch project');
    }
  };

  if (!context.currentOrganization) {
    return <div style={{ color: 'gray' }}>Select an organization first</div>;
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label htmlFor="proj-select">
        Project:
        <select
          id="proj-select"
          value={context.currentProject?.id || ''}
          onChange={(e) => void handleSwitchProject(e.target.value)}
          disabled={loading || projects.length === 0}
        >
          <option value="">Select a project...</option>
          {projects.map((proj) => (
            <option key={proj.id} value={proj.id}>
              {proj.name}
            </option>
          ))}
        </select>
      </label>
      {error && <div style={{ color: 'red', marginTop: '0.5rem' }}>{error}</div>}
      {loading && <div style={{ color: 'blue', marginTop: '0.5rem' }}>Loading...</div>}
    </div>
  );
}

/**
 * Example Context Display Component
 */
export function ContextDisplay(): JSX.Element {
  const context = useContext();

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
      <h3>Current Context</h3>
      <p>
        Organization: <strong>{context.currentOrganization?.name || 'None'}</strong>
      </p>
      <p>
        Project: <strong>{context.currentProject?.name || 'None'}</strong>
      </p>
      <details>
        <summary>Context Headers for API Client</summary>
        <pre style={{ backgroundColor: '#fff', padding: '0.5rem' }}>
          {JSON.stringify(
            {
              'X-Organization-ID': context.currentOrganization?.id || 'not set',
              'X-Project-ID': context.currentProject?.id || 'not set',
            },
            null,
            2,
          )}
        </pre>
      </details>
    </div>
  );
}

/**
 * Example Protected Component that requires context
 */
export function ProtectedContextComponent({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element | null {
  const context = useContext();

  if (!context.currentOrganization) {
    return <div style={{ color: 'orange' }}>Please select an organization first</div>;
  }

  if (!context.currentProject) {
    return <div style={{ color: 'orange' }}>Please select a project first</div>;
  }

  return <>{children}</>;
}
