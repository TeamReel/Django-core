import { useState, useEffect } from 'react';
import { useAuth } from '@django-core/auth-ui';
import { getApiBaseUrl } from '../utils/apiBase';

const DEBUG_LOGS = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === 'true');

export interface Activity {
  id: string;
  slug?: string;
  title: string;
  activity_type: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  metadata?: Record<string, unknown>;
  organisation?: {
    id: string;
    name: string;
    slug?: string;
  };
  project: {
    id: string;
    name: string;
    slug?: string;
    organisation_id?: string;
  };
  period?: {
    id: string;
    name: string;
  };
  opponent_project?: {
    id: string;
    name: string;
    slug?: string;
  } | null;
  participations?: Array<{
    id: string;
    member: { id: string | number; user_name: string };
    role: string;
    status: string;
    [key: string]: unknown;
  }>;
  participations_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface UseActivitiesOptions {
  limit?: number;
  project_id?: string;
  organisation_id?: string;
}

export function useActivities({ limit = 10, project_id, organisation_id }: UseActivitiesOptions = {}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivities() {
      try {
        setLoading(true);
        const apiBaseUrl = getApiBaseUrl();

        const params = new URLSearchParams();
        if (limit) params.append('page_size', String(limit));
        if (project_id) params.append('project_id', project_id);
        if (organisation_id) params.append('organisation_id', organisation_id);

        // Note: Sort by start_time descending (newest first)
        params.append('ordering', '-start_time');

        const url = `${apiBaseUrl}/api/v1/activities/?${params.toString()}`;
        if (DEBUG_LOGS) {
        }

        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            // Auth headers are handled by browser cookies in this demo setup or could be added here
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch activities: ${response.status}`);
        }

        const jsonData = await response.json();

        // Unwrap "Envelope" response format ({ status: 'success', data: ... })
        const payload = (jsonData.status === 'success' && jsonData.data) ? jsonData.data : jsonData;

        // Handle nested data structure: payload.data or payload.results or direct array
        const results = Array.isArray(payload) ? payload : (payload.data || payload.results || []);
        setActivities(results);
        setError(null);
      } catch (err: unknown) {
        console.error(err);
        if (DEBUG_LOGS) console.error('[useActivities] Error fetching activities:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchActivities();
  }, [limit, project_id, organisation_id]);

  return { activities, loading, error };
}
