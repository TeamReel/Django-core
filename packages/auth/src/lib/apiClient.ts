/**
 * Internal API client utility for making authenticated requests.
 *
 * This now wraps @django-core/api-client to avoid code duplication.
 *
 * Features:
 * - Automatic credentials: 'include' for cookie-based auth
 * - CSRF token handling from cookies
 * - JSON content type headers
 *
 * @internal This is an internal utility, not exported from package
 */

import { getCsrfToken as sharedGetCsrfToken } from '@django-core/api-client';

/**
 * Get CSRF token from cookies.
 * Django stores CSRF token in 'csrftoken' cookie.
 *
 * Re-exported from @django-core/api-client for backwards compatibility.
 */
export function getCsrfToken(): string | null {
  return sharedGetCsrfToken();
}

/**
 * Make an authenticated API request.
 *
 * This is a compatibility wrapper around @django-core/api-client that maintains
 * the original function signature while using the shared implementation internally.
 *
 * @param url - Full URL or path to request
 * @param options - Fetch options (will be merged with defaults)
 * @returns Promise resolving to Response object
 *
 * @example
 * ```typescript
 * const response = await apiClient('/api/v1/auth/me');
 * const data = await response.json();
 * ```
 */
export async function apiClient(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const csrfToken = getCsrfToken();

  const headers: Record<string, string> = {};

  // Merge existing headers first
  if (options.headers) {
    const existingHeaders = new Headers(options.headers);
    existingHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  }

  // Set Content-Type if not already set
  if (!Object.keys(headers).some(k => k.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json';
  }

  // Add CSRF token for state-changing methods
  if (csrfToken && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(options.method?.toUpperCase() || 'GET')) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Send cookies with request
  };

  return fetch(url, config);
}
