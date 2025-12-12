/**
 * API functions for fetching and setting current context.
 *
 * These endpoints are optional - the context switcher gracefully falls back
 * to URL-based context if the backend doesn't implement them.
 *
 * @packageDocumentation
 */

import { createApiClient, isApiError, isApiSuccess } from '@django-core/api-client';

/**
 * Response envelope for current context endpoint.
 */
export interface CurrentContextResponse {
  organisationId?: string;
  projectId?: string;
}

/**
 * Fetch current user's active context from backend.
 *
 * This endpoint is optional. If the backend doesn't implement it (404),
 * returns null and the context switcher will fall back to URL-based context.
 *
 * @param apiBaseUrl - Base URL for API requests (default: '/api')
 * @returns Current context or null if endpoint doesn't exist
 *
 * @example
 * ```typescript
 * const context = await fetchCurrentContext('/api');
 * if (context) {
 *   console.log('Current org:', context.organisationId);
 * }
 * ```
 */
export async function fetchCurrentContext(
  apiBaseUrl: string = '/api'
): Promise<CurrentContextResponse | null> {
  try {
    const client = createApiClient({ baseUrl: apiBaseUrl });
    const response =
      await client.get<CurrentContextResponse>('/context/current/');

    if (isApiError(response)) {
      // Endpoint may not exist (optional)
      if (response.error.code === 404) {
        return null;
      }
      throw new Error(response.error.message);
    }

    if (isApiSuccess(response)) {
      return response.data;
    }

    return null;
  } catch {
    // Graceful fallback if endpoint doesn't exist
    return null;
  }
}

/**
 * Set current user's active context on backend.
 *
 * This endpoint is optional. If the backend doesn't implement it (404),
 * silently succeeds and the context will be tracked client-side only.
 *
 * @param organisationId - ID of organisation to set as active
 * @param projectId - ID of project to set as active (null for org-only context)
 * @param apiBaseUrl - Base URL for API requests (default: '/api')
 *
 * @example
 * ```typescript
 * await setCurrentContext('org_123', 'proj_456', '/api');
 * ```
 */
export async function setCurrentContext(
  organisationId: string,
  projectId: string | null,
  apiBaseUrl: string = '/api'
): Promise<void> {
  try {
    const client = createApiClient({ baseUrl: apiBaseUrl });
    const response = await client.post('/context/set/', {
      organisationId,
      projectId,
    });

    if (isApiError(response)) {
      // Endpoint may not exist (optional)
      if (response.error.code === 404) {
        return;
      }
      throw new Error(response.error.message);
    }
  } catch {
    // Graceful fallback if endpoint doesn't exist
  }
}
