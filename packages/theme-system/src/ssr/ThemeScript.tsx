/**
 * Next.js ThemeScript component for SSR zero-flash initialization.
 *
 * Usage: Place in <head> section of Next.js App Router layout.
 *
 * @module ssr/ThemeScript
 */

import { getThemeInitScript } from './inlineScript';

/**
 * Props for ThemeScript component.
 */
export interface ThemeScriptProps {
  /**
   * Cookie name to read theme preference from.
   * Default: 'django_theme_pref'
   */
  cookieName?: string;

  /**
   * CSP nonce for inline script security.
   * Required if Content-Security-Policy with script-src is enabled.
   */
  nonce?: string;
}

/**
 * Inline script component for Next.js SSR theme initialization.
 *
 * Prevents flash of unstyled content (FOUC) by applying theme before first paint.
 * MUST be placed in <head> before any CSS or body content.
 *
 * @param props - Component configuration
 * @returns Script element with inline theme initialization code
 *
 * @example Next.js App Router (app/layout.tsx)
 * ```tsx
 * import { ThemeScript } from '@django-core/theme-system/ssr';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html suppressHydrationWarning>
 *       <head>
 *         <ThemeScript />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @example With CSP nonce
 * ```tsx
 * import { headers } from 'next/headers';
 *
 * export default function RootLayout({ children }) {
 *   const nonce = headers().get('x-nonce');
 *
 *   return (
 *     <html suppressHydrationWarning>
 *       <head>
 *         <ThemeScript nonce={nonce ?? undefined} />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @example Custom cookie name
 * ```tsx
 * <ThemeScript cookieName="my_theme_pref" />
 * ```
 */
export function ThemeScript({ cookieName, nonce }: ThemeScriptProps = {}) {
  const script = getThemeInitScript(cookieName);

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      nonce={nonce}
      suppressHydrationWarning
    />
  );
}
