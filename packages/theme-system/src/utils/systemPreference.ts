/**
 * System theme preference utilities.
 *
 * Provides functions to detect and subscribe to OS-level dark mode preferences
 * via the prefers-color-scheme media query.
 */

/**
 * Get current system theme preference.
 *
 * @returns 'dark' if system prefers dark mode, 'light' otherwise
 *
 * @example
 * ```tsx
 * const systemTheme = getSystemTheme();
 * console.log(systemTheme); // 'light' | 'dark'
 * ```
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light'; // SSR fallback
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  return prefersDark.matches ? 'dark' : 'light';
}

/**
 * Subscribe to system theme preference changes.
 *
 * @param callback - Function called when system theme changes
 * @returns Cleanup function to unsubscribe from changes
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   const unsubscribe = subscribeToSystemTheme((theme) => {
 *     console.log('System theme changed to:', theme);
 *   });
 *   return unsubscribe;
 * }, []);
 * ```
 */
export function subscribeToSystemTheme(
  callback: (theme: 'light' | 'dark') => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // no-op for SSR
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };

  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }

  // Legacy browsers (Safari < 14)
  mediaQuery.addListener(listener);
  return () => mediaQuery.removeListener(listener);
}
