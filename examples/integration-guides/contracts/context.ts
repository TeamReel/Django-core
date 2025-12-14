/**
 * Context Provider Interface (Multi-Tenancy)
 *
 * Implement this interface to manage organization/project context for Core-App.
 * This context propagates to all API calls via headers (X-Organization-ID, X-Project-ID).
 *
 * @see {@link https://docs.django-core.example.com/integration-guides/context | Context Propagation Guide}
 * @packageDocumentation
 */

import type { Organization, Project } from './types';

/**
 * Multi-tenancy context provider interface
 *
 * This interface defines the contract for organization/project context management.
 * Implementations MUST handle:
 * - Context persistence (localStorage, sessionStorage, or cookies)
 * - Context propagation to API calls (via ApiClient)
 * - Context validation (verify user has access to selected org/project)
 *
 * @example React Context Implementation
 * ```typescript
 * const TenantContext = createContext<ContextProvider | null>(null);
 *
 * function TenantProviderImpl({ children }: { children: ReactNode }) {
 *   const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
 *   const [currentProject, setCurrentProject] = useState<Project | null>(null);
 *
 *   const setOrganization = async (orgId: string) => {
 *     const org = await apiClient.get<Organization>(`/api/organisations/${orgId}`);
 *     setCurrentOrg(org.data);
 *     setCurrentProject(null); // Clear project when org changes
 *     localStorage.setItem('currentOrgId', orgId);
 *   };
 *
 *   return (
 *     <TenantContext.Provider value={{ currentOrg, currentProject, setOrganization, setProject, clear }}>
 *       {children}
 *     </TenantContext.Provider>
 *   );
 * }
 * ```
 */
export interface ContextProvider {
  /**
   * Currently selected organization
   *
   * Null if:
   * - User hasn't selected an organization
   * - User logged out
   * - Context was cleared
   */
  readonly currentOrganization: Organization | null;

  /**
   * Currently selected project
   *
   * Null if:
   * - User hasn't selected a project
   * - User switched to a different organization
   * - Context was cleared
   *
   * MUST be null if `currentOrganization` is null.
   */
  readonly currentProject: Project | null;

  /**
   * Fetch and set current organization
   *
   * Implementation MUST:
   * - Fetch organization details from `GET /api/organisations/{orgId}`
   * - Verify user has access (backend returns 403 if not)
   * - Clear `currentProject` when organization changes
   * - Persist orgId to localStorage/sessionStorage for cross-session
   * - Emit context change event for ApiClient to observe
   *
   * @param organizationId - Organization ID to set as current
   * @returns Promise resolving to the fetched organization
   * @throws {PermissionDeniedError} 403 - User lacks access to organization
   * @throws {ClientError} 404 - Organization not found
   *
   * @example
   * ```typescript
   * // In organization switcher component
   * const handleOrgChange = async (orgId: string) => {
   *   try {
   *     await context.setOrganization(orgId);
   *     navigate('/dashboard');
   *   } catch (error) {
   *     if (error instanceof PermissionDeniedError) {
   *       showNotification('You do not have access to this organization');
   *     }
   *   }
   * };
   * ```
   */
  setOrganization(organizationId: string): Promise<Organization>;

  /**
   * Fetch and set current project
   *
   * Implementation MUST:
   * - Require `currentOrganization` to be set (throw error if null)
   * - Fetch project details from `GET /api/projects/{projectId}`
   * - Verify project belongs to current organization (backend validates)
   * - Persist projectId to localStorage/sessionStorage
   * - Emit context change event for ApiClient
   *
   * @param projectId - Project ID to set as current
   * @returns Promise resolving to the fetched project
   * @throws {Error} No organization selected
   * @throws {PermissionDeniedError} 403 - User lacks access to project
   * @throws {ClientError} 404 - Project not found
   * @throws {ClientError} 400 - Project does not belong to current organization
   *
   * @example
   * ```typescript
   * // In project switcher component
   * const handleProjectChange = async (projectId: string) => {
   *   try {
   *     await context.setProject(projectId);
   *     navigate(`/projects/${projectId}`);
   *   } catch (error) {
   *     if (error.message === 'No organization selected') {
   *       showNotification('Please select an organization first');
   *     }
   *   }
   * };
   * ```
   */
  setProject(projectId: string): Promise<Project>;

  /**
   * Clear all context (organization and project)
   *
   * Use this when:
   * - User logs out
   * - User navigates to non-tenant-specific page
   * - Context becomes invalid (org/project deleted)
   *
   * Implementation MUST:
   * - Clear `currentOrganization` and `currentProject`
   * - Remove persisted context from storage
   * - Emit context clear event for ApiClient
   */
  clear(): void;

  /**
   * Restore context from storage
   *
   * Call this on app mount to restore previously selected org/project.
   *
   * Implementation MUST:
   * - Read orgId and projectId from storage
   * - Validate both still exist and user has access
   * - Gracefully handle missing/invalid context (clear if invalid)
   * - Set `currentOrganization` and `currentProject` if valid
   *
   * @returns Promise resolving when context restoration completes
   *
   * @example
   * ```typescript
   * function App() {
   *   const context = useContext();
   *
   *   useEffect(() => {
   *     context.restoreContext().catch((error) => {
   *       console.warn('Failed to restore context:', error);
   *     });
   *   }, []);
   *
   *   return <AppContent />;
   * }
   * ```
   */
  restoreContext(): Promise<void>;
}



/**
 * Hook signature for React-based implementations
 *
 * @example
 * ```typescript
 * function OrganizationSwitcher() {
 *   const context = useContext();
 *   const { data: orgs } = useSWR('/api/organisations', fetcher);
 *
 *   return (
 *     <Select
 *       value={context.currentOrganization?.id}
 *       onChange={(orgId) => context.setOrganization(orgId)}
 *     >
 *       {orgs.map((org) => (
 *         <option key={org.id} value={org.id}>{org.name}</option>
 *       ))}
 *     </Select>
 *   );
 * }
 * ```
 */
export type UseContext = () => ContextProvider;
