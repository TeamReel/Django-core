/**
 * useHealthStatus Hook
 * Polls B18 API for system health status with configurable interval
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createApiClient } from '@django-core/api-client';
import type { HealthStatusResponse } from '../types/contracts/B18-health-status';

// Create singleton API client instance
const apiClient = createApiClient();

export interface UseHealthStatusOptions {
  /**
   * API endpoint URL (B18 health API)
   * @example "/api/health/status"
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

export interface UseHealthStatusResult {
  /**
   * Service health data (null if not loaded yet)
   */
  data: HealthStatusResponse | null;

  /**
   * Loading state
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
 * Hook to poll B18 API for system health data
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useHealthStatus({
 *   endpoint: '/api/health/status',
 *   pollInterval: 30000,
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Alert severity="error" title="Failed to load health status" />;
 * if (!data) return null;
 *
 * return (
 *   <>
 *     {data.services.map(service => (
 *       <HealthStatus
 *         key={service.name}
 *         name={service.name}
 *         status={service.status}
 *       />
 *     ))}
 *   </>
 * );
 * ```
 */
export const useHealthStatus = ({
  endpoint,
  pollInterval = 30000,
  enabled = true,
}: UseHealthStatusOptions): UseHealthStatusResult => {
  const [data, setData] = useState<HealthStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get<HealthStatusResponse>(endpoint);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch health status');
      }

      setData(response.data!);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch health status');
      setError(errorObj);
      console.error('[F05] useHealthStatus error:', errorObj);
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
