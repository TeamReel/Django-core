/**
 * usePolling Hook
 *
 * Custom hook for periodic polling with automatic cleanup.
 * Configurable interval, error handling, and automatic unmount cleanup.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Options for the usePolling hook
 */
export interface UsePollingOptions {
  /** Polling interval in milliseconds (default: 30000 = 30 seconds) */
  interval?: number;
  /** Whether to start polling immediately (default: true) */
  enabled?: boolean;
  /** Callback to execute on error (default: logs to console) */
  onError?: (error: Error) => void;
  /** LocalStorage key for caching data (optional) */
  key?: string;
  /** Dependencies array for useEffect (optional) */
  dependencies?: unknown[];
}

/**
 * Return type for the usePolling hook with data fetching
 */
export interface UsePollingResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<T | undefined>;
  start: () => void;
  stop: () => void;
  isPolling: () => boolean;
}

/**
 * Custom hook for periodic polling with cleanup and data fetching
 *
 * @param url - URL to fetch from
 * @param options - Configuration options
 *
 * @example
 * // Fetch data every 30 seconds
 * const { data, loading, error } = usePolling<ObservabilityMetrics>(
 *   '/api/observability/metrics/',
 *   { interval: 30000 }
 * );
 */
export function usePolling<T = unknown>(
  url: string,
  options: UsePollingOptions = {}
): UsePollingResult<T> {
  const {
    interval = 30000, // 30 seconds default
    enabled = true,
    onError = (error: Error) => console.error('Polling error:', error),
    key,
    dependencies = [],
  } = options;

  const [data, setData] = useState<T | null>(() => {
    if (key) {
      try {
        const cached = localStorage.getItem(key);
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef<boolean>(enabled);

  /**
   * Fetch data from URL
   */
  const fetchData = useCallback(async (): Promise<T | undefined> => {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: T = await response.json();
      setData(result);

      if (key) {
        try {
          localStorage.setItem(key, JSON.stringify(result));
        } catch {
          // ignore localStorage errors
        }
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMsg);
      onError(err instanceof Error ? err : new Error(errorMsg));
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [url, key, onError]);

  /**
   * Start polling
   */
  const start = useCallback(() => {
    // Clear any existing interval
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }

    isPollingRef.current = true;

    // Execute fetch immediately on start
    fetchData();

    // Set up recurring interval
    intervalIdRef.current = setInterval(() => {
      if (!isPollingRef.current) {
        return;
      }
      fetchData();
    }, interval);
  }, [fetchData, interval]);

  /**
   * Stop polling
   */
  const stop = useCallback(() => {
    isPollingRef.current = false;
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  /**
   * Check if currently polling
   */
  const isPolling = useCallback(() => {
    return isPollingRef.current && intervalIdRef.current !== null;
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    if (enabled) {
      start();
    }

    return () => {
      stop();
    };
  }, [enabled, start, stop, ...dependencies]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    start,
    stop,
    isPolling,
  };
}
