import { useState, useCallback } from 'react';
import { getApiBaseUrl } from '../utils/apiBase';

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
            const baseUrl = getApiBaseUrl();
            const url = new URL(`${baseUrl}/api/v1/media/items/`);

            if (cursor) {
                url.searchParams.set('cursor', cursor);
            }

            if (filters) {
                if (filters.q) url.searchParams.set('q', filters.q);
                if (filters.project) url.searchParams.set('project', filters.project);
                if (filters.state) url.searchParams.set('state', filters.state);
                if (filters.file_type) url.searchParams.set('file_type', filters.file_type);
                if (filters.ordering) url.searchParams.set('ordering', filters.ordering);
                if (filters.tags && filters.tags.length > 0) {
                     // Array handling depends on backend (usually repeat keys or comma separated)
                     // DjangoFilterBackend typically uses repeat keys ?tags=x&tags=y
                     filters.tags.forEach(tag => url.searchParams.append('tags', tag));
                }
            }

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`Error fetching media items: ${response.statusText}`);
            }

            const data: FetchResponse = await response.json();
            setItems(data.results);
            setPagination({ next: data.next || null, previous: data.previous || null });

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
