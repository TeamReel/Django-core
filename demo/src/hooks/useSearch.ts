import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/api';
import { ApiError } from '@/api/errors';
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
      const data = await api.get<GroupedSearchResults>('/search/', {
        params: { q: query },
        signal: abortControllerRef.current.signal,
      });
      return data ?? null;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }
      logger.error('useSearch error', err);
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Search failed');
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
        const data = await api.get<PaginatedSearchResults>('/search/', {
          params: { q: query, types: types.join(','), page },
          signal: abortControllerRef.current.signal,
        });
        return data ?? null;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return null;
        }
        logger.error('useSearch filtered error', err);
        setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Search failed');
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
      const data = await api.get<GroupedSearchResults>('/search/', {
        params: { q: query, hierarchy: 'true' },
        signal: abortControllerRef.current.signal,
      });
      return data ?? null;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }
      logger.error('useSearch hierarchy error', err);
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Hierarchical search failed');
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
