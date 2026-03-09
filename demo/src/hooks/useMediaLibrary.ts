import { useState, useCallback } from 'react';
import { api } from '@/api';
import type { ListResult } from '@/api';

export interface MediaTag {
  id: string;
  name: string;
  slug: string;
  is_system: boolean;
}

export interface MediaItem {
  id: string;
  project_id: string;
  file_id: string;
  title: string;
  description: string;
  mime_type: string;
  file_size_bytes: number;
  width?: number;
  height?: number;
  duration_seconds?: number;
  state: string;
  tags: MediaTag[];
  file_url?: string;
  created_by_name?: string;
  created_at?: string;
}

export interface MediaLibraryFilters {
    q?: string;
    project?: string;
    state?: string;
    tags?: string[];
    file_type?: string;
    ordering?: string;
}

interface FetchResponse {
    results: MediaItem[];
    next?: string | null;
    previous?: string | null;
}

export const useMediaLibrary = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<MediaItem[]>([]);
    const [pagination, setPagination] = useState<{next: string|null, previous: string|null}>({next: null, previous: null});

    const getAuthHeaders = () => {
        // Typically handled by browser cookies for session auth, or a token from context
        // This demo seems to verify credentials: 'include' logic.
        const headers: Record<string, string> = {
             'Content-Type': 'application/json',
        };
        // Add CSRF token if available
        const csrfToken = document.cookie
            .split('; ')
            .find((row) => row.startsWith('csrftoken='))
            ?.split('=')[1];
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }
        return headers;
    };

    const fetchItems = useCallback(async (filters?: MediaLibraryFilters, cursor?: string) => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string | number | boolean | undefined> = {};

            if (cursor) {
                params.cursor = cursor;
            }

            if (filters) {
                if (filters.q) params.q = filters.q;
                if (filters.project) params.project = filters.project;
                if (filters.state) params.state = filters.state;
                if (filters.file_type) params.file_type = filters.file_type;
                if (filters.ordering) params.ordering = filters.ordering;
                if (filters.tags && filters.tags.length > 0) {
                     // Join tags as comma-separated for now
                     params.tags = filters.tags.join(',');
                }
            }

            const result = await api.list<MediaItem>('/media/items/', { params });
            setItems(result.results);
            setPagination({ next: result.next || null, previous: result.previous || null });

        } catch (err: unknown) {
          console.error(err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        items,
        loading,
        error,
        pagination,
        fetchItems
    };
};
