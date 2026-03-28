import { lazy, ComponentType } from 'react';

/**
 * Wraps React.lazy with automatic retry + page reload for chunk load failures.
 *
 * When a new deployment changes Vite chunk hashes, users with a stale
 * index.html may try to load chunks that no longer exist (→ 502 / 404).
 * This wrapper:
 *   1. Retries the import once after a short delay
 *   2. If still failing, reloads the page once (picks up fresh index.html)
 *   3. If the page was already reloaded, lets the error propagate to ErrorBoundary
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches React.lazy signature
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    importFn().catch((err: unknown) => {
      // Retry once after 1 s (transient network blip)
      return new Promise<{ default: T }>((resolve, reject) => {
        setTimeout(() => {
          importFn()
            .then(resolve)
            .catch(() => {
              // Still failing → try a full page reload (once)
              const key = 'teamreel-chunk-reload';
              const lastReload = sessionStorage.getItem(key);
              const now = Date.now();

              // Only auto-reload if we haven't done so in the last 10 s
              if (!lastReload || now - Number(lastReload) > 10_000) {
                sessionStorage.setItem(key, String(now));
                window.location.reload();
                // Return a never-resolving promise while the page reloads
                return;
              }

              // Already reloaded recently — give up, let ErrorBoundary handle it
              sessionStorage.removeItem(key);
              reject(err);
            });
        }, 1000);
      });
    }),
  );
}
