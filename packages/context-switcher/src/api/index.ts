/**
 * API client functions for backend integration.
 *
 * @packageDocumentation
 */

export { fetchOrganisations } from './organisationsApi';
export type { OrganisationsResponse } from './organisationsApi';

export { fetchProjects } from './projectsApi';
export type { ProjectsResponse } from './projectsApi';

export { fetchCurrentContext, setCurrentContext } from './contextApi';
export type { CurrentContextResponse } from './contextApi';
