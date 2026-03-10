import { useState, useCallback, useEffect, useRef } from 'react';
import { createApiClient } from '@django-core/api-client';
import { getApiBaseUrl } from '../utils/apiBase';
import { logger } from '@/utils/logger';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url: string | null;
  content_type: string;
  highlight: string;
}

export interface HierarchyNode {
  id: string;
  type: string;
  title: string;
  url: string;
  description?: string;
  children: HierarchyNode[];
  is_truncated?: boolean;
}

export interface HierarchyAnchor {
  id: string;
  type: string;
  title: string;
  url?: string;
  score?: number;
}

export interface HierarchyData {
  anchor: HierarchyAnchor;
  tree: HierarchyNode;
  anchor_path: string[];  // IDs from root to anchor
}

export interface GroupedSearchResults {
  clubs?: SearchResult[];
  teams?: SearchResult[];
  seasons?: SearchResult[];
  competitions?: SearchResult[];
  periods?: SearchResult[];
  matches?: SearchResult[];
  activities?: SearchResult[];
  users?: SearchResult[];
  organisations?: SearchResult[];
  projects?: SearchResult[];
  hierarchy?: HierarchyData;
}

export interface PaginatedSearchResults {
  count: number;
  next: string | null;
  previous: string | null;
  results: SearchResult[];
}

export interface UseSearchReturn {
  searchGlobal: (query: string) => Promise<GroupedSearchResults | null>;
  searchFiltered: (query: string, types: string[], page?: number) => Promise<PaginatedSearchResults | null>;
  searchHierarchical: (query: string) => Promise<GroupedSearchResults | null>;
  isSearching: boolean;
  error: string | null;
}

export function useSearch(): UseSearchReturn {
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
      // Use getApiBaseUrl() for consistent API base URL handling
      const baseUrl = getApiBaseUrl();
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

      const response = await api.get<any>(`${endpoint}?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

      // Handle envelope format { status: 'success', data: { ... } }
      if (response.data && response.data.data) {
          return response.data.data;
      }
      return response.data ?? null;
    } catch (err: unknown) {
      logger.error('useSearch error', err);
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }
      setError(err instanceof Error ? err.message : 'Search failed');
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
        const baseUrl = getApiBaseUrl();
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
      } catch (err: unknown) {
        logger.error('useSearch filtered error', err);
        if (err instanceof Error && err.name === 'AbortError') {
          return null;
        }
        setError(err instanceof Error ? err.message : 'Search failed');
        return null;
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const searchHierarchical = useCallback(async (query: string): Promise<GroupedSearchResults | null> => {
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
      const baseUrl = getApiBaseUrl();
      const api = createApiClient({ baseUrl });

      let endpoint = '/api/v1/search/';
      if (baseUrl.includes('/api/v1')) {
        endpoint = '/search/';
      }

      const params = new URLSearchParams({ q: query, hierarchy: 'true' });

      const response = await api.get<any>(`${endpoint}?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

      // Handle envelope format { status: 'success', data: { ... } }
      if (response.data && response.data.data) {
        return response.data.data;
      }
      return response.data ?? null;
    } catch (err: unknown) {
      logger.error('useSearch hierarchy error', err);
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }
      setError(err instanceof Error ? err.message : 'Hierarchical search failed');
      return null;
    } finally {
      setIsSearching(false);
    }
  }, []);

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
    searchHierarchical,
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
