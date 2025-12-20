/**
 * API functions for fetching projects.
 *
 * @packageDocumentation
 */

import { createApiClient, isApiError, isApiSuccess } from '@django-core/api-client';
import type { Project } from '../types';

/**
 * Response envelope for projects list endpoint.
 * Supports both direct array and DRF paginated format.
 */
export interface ProjectsResponse {
  projects?: Project[];
  results?: Project[]; // DRF paginated format
}

/**
 * Fetch list of projects for a given organisation.
 *
 * @param organisationSlug - Slug of the organisation
 * @param apiBaseUrl - Base URL for API requests (default: '/api')
 * @returns Array of projects
 * @throws Error if API request fails or returns error
 *
 * @example
 * ```typescript
 * const projects = await fetchProjects('bundesliga', '/api');
 * console.log('Available projects:', projects.map(p => p.name));
 * ```
 */
export async function fetchProjects(
  organisationSlug: string,
  apiBaseUrl: string = '/api'
): Promise<Project[]> {
  console.log(`Fetching projects for org: ${organisationSlug} from ${apiBaseUrl}`);
  const client = createApiClient({ baseUrl: apiBaseUrl });
  try {
    const response = await client.get<ProjectsResponse>(
      `/organisations/${organisationSlug}/projects/`
    );
    console.log('Projects API response:', response);

    if (isApiError(response)) {
      console.error('Projects API error:', response.error);
      // Throw error with status code so caller can detect auth failures
      const error = new Error(response.error.message) as Error & { code?: number };
      error.code = response.error.code;
      throw error;
    }

    if (isApiSuccess(response)) {
      const rawResults = response.data.results || response.data.projects || [];
      console.log('Parsed projects (raw):', rawResults);

      // Map API response to Project interface
      // API returns nested organisation object, but Project interface expects organisationId
      const mappedResults = rawResults.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        slug: item.slug,
        organisationId: item.organisation?.id || organisationSlug, // Fallback to requested org slug
        metadata: {
          description: item.description
        }
      }));

      console.log('Mapped projects:', mappedResults);
      return mappedResults;
    }
  } catch (e) {
    console.error('Fetch projects exception:', e);
    throw e;
  }

  return [];
}
