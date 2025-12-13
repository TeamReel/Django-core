/**
 * useResourceUsage Hook
 * Polls B11 API for credit usage data with configurable interval
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createApiClient } from '@django-core/api-client';
import type { CreditUsageResponse } from '../types/contracts/B11-billing-credits';

// Create singleton API client instance
const apiClient = createApiClient();

export interface UseResourceUsageOptions {
  /**
   * API endpoint URL (B11 billing API)
   * @example "/api/billing/usage"
   */
  endpoint: string;

  /**
   * Polling interval in milliseconds
   * @default 30000 (30 seconds)
   */
  pollInterval?: number;

  /**
   * Whether to start polling immediately
   * @default true
   */
  enabled?: boolean;
}

export interface UseResourceUsageResult {
  /**
   * Credit usage data (null if not loaded yet)
   */
  data: CreditUsageResponse | null;

  /**
   * Loading state (true on initial load and during polling)
   */
  isLoading: boolean;

  /**
   * Error (null if no error)
   */
  error: Error | null;

  /**
   * Manually trigger a refresh
   */
  refetch: () => void;
}

/**
 * Hook to poll B11 API for resource usage data
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useResourceUsage({
 *   endpoint: '/api/billing/usage',
 *   pollInterval: 30000,
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Alert severity="error" title="Failed to load credits" />;
 * if (!data) return null;
 *
 * return <ResourceUsageBar value={data.credits.used} max={data.credits.limit} />;
 * ```
 */
export const useResourceUsage = ({
  endpoint,
  pollInterval = 30000,
  enabled = true,
}: UseResourceUsageOptions): UseResourceUsageResult => {
  const [data, setData] = useState<CreditUsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get<CreditUsageResponse>(endpoint);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch resource usage');
      }

      setData(response.data!);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch resource usage');
      setError(errorObj);
      console.error('[F05] useResourceUsage error:', errorObj);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;

    fetchData();
  }, [enabled, fetchData]);

  // Polling
  useEffect(() => {
    if (!enabled || pollInterval <= 0) return;

    intervalRef.current = setInterval(fetchData, pollInterval);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, pollInterval, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
};
