/**
 * usePreloadRoutes — Background preload chunks for likely next navigation
 *
 * Part of B2 Route Prefetch phase.
 *
 * Preloads route chunks after the current page has been idle for a specified
 * duration. This improves perceived navigation speed for predictable user flows.
 *
 * @example
 * // In SeasonDetailPage.tsx
 * usePreloadRoutes([
 *   () => import('../pages/activities/MatchDetailWrapper'),
 *   () => import('../pages/identity/MemberDetailPage'),
 * ]);
 */
import { useEffect, useRef } from 'react';

type ImportFn = () => Promise<unknown>;

/**
 * Preload multiple route chunks in the background after idle delay
 *
 * @param routes - Array of dynamic import functions
 * @param delay - Milliseconds to wait before preloading (default: 2000ms)
 */
export function usePreloadRoutes(routes: ImportFn[], delay = 2000): void {
  const hasPreloaded = useRef(false);

  useEffect(() => {
    // Only preload once per mount
    if (hasPreloaded.current) return;

    const timer = setTimeout(() => {
      hasPreloaded.current = true;
      routes.forEach(importFn => {
        // Fire and forget — silent fail on error
        importFn().catch(() => {});
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [routes, delay]);
}

/**
 * Preload a single route chunk
 *
 * @param importFn - Dynamic import function
 * @param delay - Milliseconds to wait before preloading (default: 2000ms)
 */
export function usePreloadRoute(importFn: ImportFn, delay = 2000): void {
  usePreloadRoutes([importFn], delay);
}

/**
 * Preload routes using requestIdleCallback for minimal main thread impact
 *
 * Falls back to setTimeout if requestIdleCallback is not available.
 *
 * @param routes - Array of dynamic import functions
 */
export function usePreloadRoutesOnIdle(routes: ImportFn[]): void {
  const hasPreloaded = useRef(false);

  useEffect(() => {
    if (hasPreloaded.current) return;

    const preload = () => {
      hasPreloaded.current = true;
      routes.forEach(importFn => {
        importFn().catch(() => {});
      });
    };

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preload, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    } else {
      // Fallback for Safari
      const timer = setTimeout(preload, 2000);
      return () => clearTimeout(timer);
    }
  }, [routes]);
}

export default usePreloadRoutes;
