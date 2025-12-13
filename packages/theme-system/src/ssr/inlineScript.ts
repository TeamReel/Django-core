/**
 * Inline blocking script for SSR zero-flash initialization.
 *
 * This script MUST execute before first paint to prevent flash of unstyled content (FOUC).
 * It reads the theme preference from cookies and applies data attributes to <html> element
 * before React hydration.
 *
 * @module ssr/inlineScript
 */

/**
 * Generate inline JavaScript for theme initialization.
 *
 * The generated script:
 * - Reads theme preference from cookie
 * - Resolves 'system' mode to actual light/dark based on prefers-color-scheme
 * - Sets data-theme and data-brand attributes on <html> element
 * - Fails silently if cookie is missing or invalid
 *
 * Performance budget: <1KB minified
 *
 * @param cookieName - Cookie name to read (default: 'django_theme_pref')
 * @returns JavaScript code as string (ready for <script> tag)
 *
 * @example Basic usage
 * ```typescript
 * const script = getThemeInitScript();
 * // Insert in <head> before any CSS
 * ```
 *
 * @example Custom cookie name
 * ```typescript
 * const script = getThemeInitScript('my_theme_cookie');
 * ```
 */
export function getThemeInitScript(cookieName = 'django_theme_pref'): string {
  return `
(function() {
  try {
    var cookie = document.cookie.match(new RegExp('(^|;\\\\s*)${cookieName}=([^;]+)'));
    if (cookie) {
      var pref = JSON.parse(decodeURIComponent(cookie[2]));
      var mode = pref.mode === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : pref.mode;

      document.documentElement.setAttribute('data-theme', mode);
      document.documentElement.setAttribute('data-brand', pref.brand || 'default');
    }
  } catch (e) {
    // Fail silently, React will hydrate with default theme
  }
})();
  `.trim();
}
