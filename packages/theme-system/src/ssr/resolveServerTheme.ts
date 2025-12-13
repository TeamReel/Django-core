/**
 * Server-side theme resolver from cookies and headers.
 *
 * Enables SSR frameworks to read theme preference before rendering.
 *
 * @module ssr/resolveServerTheme
 */

import type { ThemePreference } from '../storage/types';

/**
 * Resolve theme preference from cookie header on server.
 *
 * Parses Cookie HTTP header to extract theme preference.
 * Returns null if cookie is missing, malformed, or contains invalid JSON.
 *
 * @param cookieHeader - Raw Cookie header value (e.g., "theme=...; session=...")
 * @param cookieName - Cookie name to extract (default: 'django_theme_pref')
 * @returns Parsed theme preference or null
 *
 * @example Next.js App Router (app/layout.tsx)
 * ```typescript
 * import { cookies } from 'next/headers';
 * import { resolveServerTheme } from '@django-core/theme-system/ssr';
 *
 * export default function RootLayout({ children }) {
 *   const cookieStore = cookies();
 *   const theme = resolveServerTheme(
 *     cookieStore.get('django_theme_pref')?.value ?? null
 *   );
 *
 *   return (
 *     <html
 *       data-theme={theme?.mode ?? 'light'}
 *       data-brand={theme?.brand ?? 'default'}
 *       suppressHydrationWarning
 *     >
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @example Next.js Pages Router (pages/_document.tsx)
 * ```typescript
 * import { resolveServerTheme } from '@django-core/theme-system/ssr';
 *
 * class MyDocument extends Document {
 *   static async getInitialProps(ctx) {
 *     const theme = resolveServerTheme(ctx.req?.headers.cookie ?? null);
 *     return { theme };
 *   }
 *
 *   render() {
 *     const { theme } = this.props;
 *     return (
 *       <Html data-theme={theme?.mode ?? 'light'}>
 *         <body>{children}</body>
 *       </Html>
 *     );
 *   }
 * }
 * ```
 *
 * @example Django view
 * ```python
 * # Backend equivalent (Python)
 * import json
 * from urllib.parse import unquote
 *
 * def get_theme_from_cookie(request):
 *     cookie_value = request.COOKIES.get('django_theme_pref')
 *     if not cookie_value:
 *         return None
 *     try:
 *         return json.loads(unquote(cookie_value))
 *     except (ValueError, KeyError):
 *         return None
 * ```
 */
export function resolveServerTheme(
  cookieHeader: string | null,
  cookieName = 'django_theme_pref'
): ThemePreference | null {
  if (!cookieHeader) return null;

  // Match cookie by name with flexible whitespace
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)${cookieName}=([^;]+)`));
  if (!match) return null;

  try {
    // Decode and parse JSON
    return JSON.parse(decodeURIComponent(match[2]));
  } catch {
    // Invalid JSON or decoding error
    return null;
  }
}
