/**
 * useApiBase Hook
 *
 * Centralized hook for getting the API v1 base URL.
 * This replaces scattered import.meta.env.VITE_API_BASE_URL usages.
 */

import { useMemo } from 'react';
import { getApiV1BaseUrl } from '../utils/apiFetch';

/**
 * Returns the API v1 base URL (including /api/v1), memoized for performance.
 *
 * @example
 * const apiBaseUrl = useApiBase();
 * const response = await fetch(`${apiBaseUrl}/organisations/`);
 */
export function useApiBase(): string {
  return useMemo(() => getApiV1BaseUrl(), []);
}

export default useApiBase;
