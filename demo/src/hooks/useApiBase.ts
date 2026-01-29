/**
 * useApiBase Hook
 *
 * Centralized hook for getting the API base URL.
 * This replaces scattered import.meta.env.VITE_API_BASE_URL usages.
 */

import { useMemo } from 'react';
import { getApiBaseUrl } from '../utils/apiBase';

/**
 * Returns the API base URL, memoized for performance.
 *
 * @example
 * const apiBaseUrl = useApiBase();
 * const response = await fetch(`${apiBaseUrl}/api/v1/organisations/`);
 */
export function useApiBase(): string {
  return useMemo(() => getApiBaseUrl(), []);
}

export default useApiBase;
