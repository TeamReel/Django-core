import { useState, useEffect, useCallback, useRef, type DependencyList } from 'react';
import { getErrorMessage } from '@/utils/errorHelpers';
import { logger } from '@/utils/logger';

export interface UseAsyncResult<T> {
  /** The resolved data, or `null` while loading / on error. */
  data: T | null;
  /** Manually update data (e.g. for optimistic updates). */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  /** `true` during the initial fetch and on every `reload()`. */
  loading: boolean;
  /** Human-readable error message, or `null`. */
  error: string | null;
  /** Re-execute the async function. */
  reload: () => void;
}

/**
 * Generic async-data hook.
 *
 * Replaces the common pattern:
 * ```ts
 * const [data, setData] = useState(null);
 * const [loading, setLoading] = useState(true);
 * const [error, setError] = useState(null);
 * useEffect(() => { fn().then(setData).catch(…).finally(…) }, deps);
 * ```
 *
 * @param fn   — Async producer. Receives an `AbortSignal` so the fetch can be
 *               cancelled when deps change or the component unmounts.
 * @param deps — Dependency list (same semantics as `useEffect`).
 *
 * @example
 * const { data: orgs, loading, error, reload } = useAsync(
 *   () => organisationsApi.list().then(r => r.results),
 *   [],
 * );
 */
export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
): UseAsyncResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);

  // Keep fn ref stable so we can call it from reload() without adding it to deps.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);

    fnRef.current(controller.signal)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled && err?.name !== 'AbortError') {
          logger.error('useAsync error', err);
          setError(getErrorMessage(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps spread from caller; fn accessed via fnRef
  }, [...deps, token]);

  const reload = useCallback(() => setToken((n) => n + 1), []);

  return { data, setData, loading, error, reload };
}
