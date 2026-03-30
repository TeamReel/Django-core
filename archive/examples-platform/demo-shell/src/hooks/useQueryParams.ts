/**
 * useQueryParams Hook
 *
 * Wrapper around useSearchParams for managing URL query parameters with type safety.
 * Provides convenient get/set/delete/clear methods for query param manipulation.
 */

import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Custom hook for managing URL query parameters
 *
 * @example
 * const queryParams = useQueryParams();
 *
 * // Get a parameter
 * const page = queryParams.get('page', '1');
 *
 * // Set a parameter
 * queryParams.set('page', '2');
 *
 * // Delete a parameter
 * queryParams.delete('sort');
 *
 * // Get all parameters
 * const all = queryParams.getAll();
 */
export function useQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  /**
   * Get a single query parameter
   */
  const get = useCallback(
    (key: string, defaultValue?: string): string | null => {
      const value = searchParams.get(key);
      return value ?? defaultValue ?? null;
    },
    [searchParams]
  );

  /**
   * Get all query parameters as an object
   */
  const getAll = useCallback((): Record<string, string> => {
    const result: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }, [searchParams]);

  /**
   * Set a query parameter (replaces if exists)
   */
  const set = useCallback(
    (key: string, value: string | null | undefined) => {
      const newParams = new URLSearchParams(searchParams);

      if (value === null || value === undefined) {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }

      setSearchParams(newParams, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  /**
   * Set multiple query parameters at once
   */
  const setMultiple = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const newParams = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          newParams.delete(key);
        } else {
          newParams.set(key, String(value));
        }
      });

      setSearchParams(newParams, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  /**
   * Delete a query parameter
   */
  const deleteParam = useCallback(
    (key: string) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete(key);
      setSearchParams(newParams, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  /**
   * Clear all query parameters
   */
  const clear = useCallback(() => {
    setSearchParams({}, { replace: false });
  }, [setSearchParams]);

  /**
   * Check if a parameter exists
   */
  const has = useCallback(
    (key: string): boolean => {
      return searchParams.has(key);
    },
    [searchParams]
  );

  /**
   * Get parameter as number (with validation)
   */
  const getNumber = useCallback(
    (key: string, defaultValue?: number): number | null => {
      const value = searchParams.get(key);
      if (value === null) {
        return defaultValue ?? null;
      }
      const num = parseInt(value, 10);
      return isNaN(num) ? (defaultValue ?? null) : num;
    },
    [searchParams]
  );

  /**
   * Get parameter as boolean
   */
  const getBoolean = useCallback(
    (key: string, defaultValue?: boolean): boolean | null => {
      const value = searchParams.get(key);
      if (value === null) {
        return defaultValue ?? null;
      }
      return value === 'true' || value === '1' || value === 'yes';
    },
    [searchParams]
  );

  return {
    get,
    getAll,
    set,
    setMultiple,
    delete: deleteParam,
    clear,
    has,
    getNumber,
    getBoolean,
    // Expose underlying searchParams for advanced use
    searchParams,
    setSearchParams,
  };
}

export default useQueryParams;
