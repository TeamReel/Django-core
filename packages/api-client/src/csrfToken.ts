/**
 * Extract CSRF token from csrftoken cookie.
 * @returns CSRF token string, or null if not found.
 */
export function getCsrfToken(): string | null {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : null;
}
