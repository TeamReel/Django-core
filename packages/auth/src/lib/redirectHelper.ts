/**
 * Redirect helper utilities for authentication flows.
 *
 * Handles:
 * - Building login URLs with ?next= parameter
 * - Extracting return URLs from query parameters
 * - Safe redirect logic for post-authentication flows
 */

/**
 * Build a login URL with a ?next= parameter for post-login redirect.
 *
 * @param loginPath - Path to login page (e.g., "/login")
 * @param returnTo - Path to redirect to after login (default: current page)
 * @returns Login URL with ?next= parameter
 *
 * @example
 * ```typescript
 * // User on /dashboard, not authenticated
 * const loginUrl = buildLoginUrl('/login', '/dashboard');
 * // Returns: "/login?next=/dashboard"
 * window.location.href = loginUrl;
 * ```
 */
export function buildLoginUrl(loginPath: string, returnTo?: string): string {
  const nextParam = returnTo || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const url = new URL(loginPath, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  url.searchParams.set('next', nextParam);
  return url.pathname + url.search;
}

/**
 * Extract the ?next= parameter from current URL.
 *
 * @param defaultPath - Default path if no ?next= parameter exists
 * @returns Path to redirect to after authentication
 *
 * @example
 * ```typescript
 * // URL: /login?next=/dashboard
 * const nextPath = getReturnUrl('/');
 * // Returns: "/dashboard"
 *
 * // URL: /login (no ?next= parameter)
 * const nextPath = getReturnUrl('/');
 * // Returns: "/"
 * ```
 */
export function getReturnUrl(defaultPath: string = '/'): string {
  if (typeof window === 'undefined') return defaultPath;

  const params = new URLSearchParams(window.location.search);
  return params.get('next') || defaultPath;
}

/**
 * Check if a redirect should occur for an HTTP status code.
 *
 * @param status - HTTP status code
 * @returns true if status requires redirect to login
 *
 * @example
 * ```typescript
 * if (shouldRedirectToLogin(response.status)) {
 *   window.location.href = buildLoginUrl('/login');
 * }
 * ```
 */
export function shouldRedirectToLogin(status: number): boolean {
  return status === 401 || status === 403;
}

/**
 * Perform redirect to login page with current page as ?next= parameter.
 *
 * @param loginPath - Path to login page
 *
 * @example
 * ```typescript
 * // In AuthProvider, on 401 response
 * redirectToLogin('/login');
 * // Redirects to: /login?next=/current-page
 * ```
 */
export function redirectToLogin(loginPath: string): void {
  if (typeof window === 'undefined') return;

  const loginUrl = buildLoginUrl(loginPath);
  window.location.href = loginUrl;
}
