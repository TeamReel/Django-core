import { useState, useCallback, useEffect, useRef } from 'react';
import { createApiClient } from '@django-core/api-client';

export interface SearchResult {
  id: number;
  title: string;
  description: string;
  url: string;
  image_url: string | null;
  content_type: string;
  highlight: string;
}

export interface GroupedSearchResults {
  users?: SearchResult[];
  organisations?: SearchResult[];
  projects?: SearchResult[];
}

export interface PaginatedSearchResults {
  count: number;
  next: string | null;
  previous: string | null;
  results: SearchResult[];
}

export function useSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const searchGlobal = useCallback(async (query: string): Promise<GroupedSearchResults | null> => {
    if (!query.trim()) {
      return null;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsSearching(true);
    setError(null);

    try {
      // Use VITE_API_BASE_URL if available, otherwise fallback to empty string (relative)
      // Note: Other parts of the app seem to use https://api.teamreel.app/api/v1
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.teamreel.app';
      const api = createApiClient({ baseUrl });

      const params = new URLSearchParams({ q: query });
      // Ensure we don't double-slash if baseUrl ends with / and endpoint starts with /
      // But createApiClient usually handles concatenation.
      // However, the endpoint here includes /api/v1/search/ which duplicates /api/v1 if baseUrl has it.
      // Let's check if baseUrl already includes /api/v1

      let endpoint = '/api/v1/search/';
      if (baseUrl.includes('/api/v1')) {
         endpoint = '/search/';
      }

      console.log(`[useSearch] Searching global: "${query}" at ${baseUrl}${endpoint}`);

      const response = await api.get<any>(`${endpoint}?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

      console.log('[useSearch] Response:', response);

      // Handle envelope format { status: 'success', data: { ... } }
      if (response.data && response.data.data) {
          return response.data.data;
      }
      return response.data ?? null;
    } catch (err: any) {
      console.error('[useSearch] Error:', err);
      if (err.name === 'AbortError') {
        return null;
      }
      setError(err.message || 'Search failed');
      return null;
    } finally {
      setIsSearching(false);
    }
  }, []);

  const searchFiltered = useCallback(
    async (query: string, types: string[], page = 1): Promise<PaginatedSearchResults | null> => {
      if (!query.trim()) {
        return null;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsSearching(true);
      setError(null);

      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.teamreel.app';
        const api = createApiClient({ baseUrl });

        let endpoint = '/api/v1/search/';
        if (baseUrl.includes('/api/v1')) {
           endpoint = '/search/';
        }

        const params = new URLSearchParams({
          q: query,
          types: types.join(','),
          page: page.toString(),
        });
        const response = await api.get<any>(`${endpoint}?${params.toString()}`, {
          signal: abortControllerRef.current.signal,
        });

        // Handle envelope format { status: 'success', data: { ... } }
        if (response.data && response.data.data) {
            return response.data.data;
        }
        return response.data ?? null;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return null;
        }
        setError(err.message || 'Search failed');
        return null;
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    searchGlobal,
    searchFiltered,
    isSearching,
    error,
  };
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
