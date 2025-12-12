/**
 * API functions for fetching projects.
 *
 * @packageDocumentation
 */

import { createApiClient, isApiError, isApiSuccess } from '@django-core/api-client';
import type { Project } from '../types';

/**
 * Response envelope for projects list endpoint.
 */
export interface ProjectsResponse {
  projects: Project[];
}

/**
 * Fetch list of projects for a given organisation.
 *
 * @param organisationId - ID of the organisation
 * @param apiBaseUrl - Base URL for API requests (default: '/api')
 * @returns Array of projects
 * @throws Error if API request fails or returns error
 *
 * @example
 * ```typescript
 * const projects = await fetchProjects('org_123', '/api');
 * console.log('Available projects:', projects.map(p => p.name));
 * ```
 */
export async function fetchProjects(
  organisationId: string,
  apiBaseUrl: string = '/api'
): Promise<Project[]> {
  const client = createApiClient({ baseUrl: apiBaseUrl });
  const response = await client.get<ProjectsResponse>(
    `/organisations/${organisationId}/projects/`
  );

  if (isApiError(response)) {
    throw new Error(response.error.message);
  }

  if (isApiSuccess(response)) {
    return response.data.projects || [];
  }

  return [];
}
