import { useState, useEffect } from 'react';
import { useAuth } from '@django-core/auth-ui';

export interface Activity {
  id: string;
  title: string;
  activity_type: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  project: {
    id: string;
    name: string;
  };
  period?: {
    id: string;
    name: string;
  };
}

interface UseActivitiesOptions {
  limit?: number;
  project_id?: string;
}

export function useActivities({ limit = 10, project_id }: UseActivitiesOptions = {}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivities() {
      try {
        setLoading(true);
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

        const params = new URLSearchParams();
        if (limit) params.append('limit', String(limit));
        if (project_id) params.append('project', project_id);

        // Note: Sort by start_time descending (newest first)
        params.append('ordering', '-start_time');

        const response = await fetch(`${apiBaseUrl}/api/v1/activities/?${params.toString()}`, {
          headers: {
            'Content-Type': 'application/json',
            // Auth headers are handled by browser cookies in this demo setup or could be added here
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch activities: ${response.status}`);
        }

        const data = await response.json();

        // Handle DRF pagination vs list results
        const results = Array.isArray(data) ? data : (data.results || []);
        setActivities(results);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching activities:', err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchActivities();
  }, [limit, project_id]);

  return { activities, loading, error };
}
