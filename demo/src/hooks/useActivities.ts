import { useState, useEffect } from 'react';
import { api } from '@/api';
import { logger } from '@/utils/logger';

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

export interface UseActivitiesReturn {
  activities: Activity[];
  loading: boolean;
  error: string | null;
}

export function useActivities({ limit = 10, project_id, organisation_id }: UseActivitiesOptions = {}): UseActivitiesReturn {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivities() {
      try {
        setLoading(true);

        const { results } = await api.list<Activity>('/activities/', {
          params: {
            page_size: limit,
            project_id,
            organisation_id,
            ordering: '-start_time',
          },
        });
        setActivities(results);
        setError(null);
      } catch (err: unknown) {
        logger.error('useActivities fetch error', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchActivities();
  }, [limit, project_id, organisation_id]);

  return { activities, loading, error };
}
