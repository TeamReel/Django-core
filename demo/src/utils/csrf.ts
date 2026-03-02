/**
 * Single source of truth for Django CSRF token extraction.
 *
 * Replaces 35+ independent copies of getCsrfToken() across the codebase.
 */

/** Read the Django CSRF token from cookies. Returns empty string if not found. */
export function getCsrfToken(): string {
  try {
    return (
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1] || ''
    );
  } catch {
    return '';
  }
}
