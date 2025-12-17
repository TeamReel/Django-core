/**
 * API functions for fetching organisations.
 *
 * @packageDocumentation
 */

import { createApiClient, isApiError, isApiSuccess } from '@django-core/api-client';
import type { Organisation } from '../types';

/**
 * Response envelope for organisations list endpoint.
 * Supports both direct array and DRF paginated format.
 */
export interface OrganisationsResponse {
  organisations?: Organisation[];
  results?: Organisation[]; // DRF paginated format
}

/**
 * Fetch list of organisations the current user has access to.
 *
 * @param apiBaseUrl - Base URL for API requests (default: '/api')
 * @returns Array of organisations
 * @throws Error if API request fails or returns error
 *
 * @example
 * ```typescript
 * const orgs = await fetchOrganisations('/api');
 * console.log('Available orgs:', orgs.map(o => o.name));
 * ```
 */
export async function fetchOrganisations(
  apiBaseUrl: string = '/api'
): Promise<Organisation[]> {
  const client = createApiClient({ baseUrl: apiBaseUrl });
  const response =
    await client.get<OrganisationsResponse>('/organisations/');

  if (isApiError(response)) {
    // Throw error with status code so caller can detect auth failures
    const error = new Error(response.error.message) as Error & { code?: number };
    error.code = response.error.code;
    throw error;
  }

  if (isApiSuccess(response)) {
    // Handle both DRF paginated format and direct array
    return response.data.results || response.data.organisations || [];
  }

  return [];
}
