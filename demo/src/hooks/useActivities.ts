import { api } from '@/api';
import { useAsync } from '@/hooks/useAsync';

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
    parent_period?: { id: string; name: string } | null;
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
  const { data, loading, error } = useAsync(
    async () => {
      const { results } = await api.list<Activity>('/activities/', {
        params: {
          page_size: limit,
          project_id,
          organisation_id,
          ordering: '-start_time',
        },
      });
      return results;
    },
    [limit, project_id, organisation_id],
  );

  return { activities: data || [], loading, error };
}
