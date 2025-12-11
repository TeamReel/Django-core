/**
 * API functions for fetching organisations.
 *
 * @packageDocumentation
 */

import { createApiClient, isApiError, isApiSuccess } from '@django-core/api-client';
import type { Organisation } from '../types';

/**
 * Response envelope for organisations list endpoint.
 */
export interface OrganisationsResponse {
  organisations: Organisation[];
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
    throw new Error(response.error.message);
  }

  if (isApiSuccess(response)) {
    return response.data.organisations || [];
  }

  return [];
}
