/**
 * usePolling Hook
 *
 * Custom hook for periodic polling with automatic cleanup.
 * Configurable interval, error handling, and automatic unmount cleanup.
 */

import { useEffect, useRef, useCallback } from 'react';

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
}

/**
 * Custom hook for periodic polling with cleanup
 *
 * @param callback - Function to execute on each poll interval
 * @param options - Configuration options
 *
 * @example
 * // Simple polling
 * usePolling(() => {
 *   fetchLatestData();
 * }, { interval: 30000 });
 *
 * @example
 * // With control and error handling
 * const { start, stop, isPolling } = usePolling(
 *   async () => {
 *     const data = await fetchData();
 *     updateUI(data);
 *   },
 *   {
 *     interval: 30000,
 *     enabled: false,
 *     onError: (error) => console.error('Polling failed:', error)
 *   }
 * );
 *
 * // Start manually
 * useEffect(() => {
 *   if (shouldPoll) {
 *     start();
 *   }
 * }, [shouldPoll, start]);
 */
export function usePolling(
  callback: () => void | Promise<void>,
  options: UsePollingOptions = {}
) {
  const {
    interval = 30000, // 30 seconds default
    enabled = true,
    onError = (error: Error) => console.error('Polling error:', error),
  } = options;

  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef<boolean>(enabled);

  /**
   * Start polling
   */
  const start = useCallback(() => {
    // Clear any existing interval
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }

    isPollingRef.current = true;

    // Execute callback immediately on start
    try {
      const result = callback();
      // Handle async callbacks
      if (result instanceof Promise) {
        result.catch(onError);
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }

    // Set up recurring interval
    intervalIdRef.current = setInterval(() => {
      if (!isPollingRef.current) {
        return;
      }

      try {
        const result = callback();
        // Handle async callbacks
        if (result instanceof Promise) {
          result.catch(onError);
        }
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }, interval);
  }, [callback, interval, onError]);

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
  }, [enabled, start, stop]);

  return {
    start,
    stop,
    isPolling,
  };
}

export default usePolling;
