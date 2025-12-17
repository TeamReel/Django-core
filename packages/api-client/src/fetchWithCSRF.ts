import { getCsrfToken } from './csrfToken';

/**
 * Legacy fetch wrapper with automatic CSRF token injection.
 * For new code, prefer createApiClient() which provides better error handling.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Response object
 *
 * @example
 * ```ts
 * const response = await fetchWithCSRF('/api/v1/users', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'John' }),
 *   headers: { 'Content-Type': 'application/json' },
 * });
 * ```
 */
export async function fetchWithCSRF(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);

  // Inject CSRF token for mutating requests
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set('X-CSRFToken', csrfToken);
    }
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  });
}
