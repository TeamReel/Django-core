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
      const api = createApiClient();
      const params = new URLSearchParams({ q: query });
      const response = await api.get<GroupedSearchResults>(`/api/v1/search/?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

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
        const api = createApiClient();
        const params = new URLSearchParams({
          q: query,
          types: types.join(','),
          page: page.toString(),
        });
        const response = await api.get<PaginatedSearchResults>(`/api/v1/search/?${params.toString()}`, {
          signal: abortControllerRef.current.signal,
        });

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
