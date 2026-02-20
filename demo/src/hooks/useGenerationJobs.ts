/**
 * useGenerationJobs — AI Generation Queue hook
 *
 * Polls /api/v1/generative/jobs/ and surfaces:
 * - Full job list (for the AI Queue tab)
 * - Active job count (for the header/sidebar badge)
 * - Toast notifications when a job transitions to completed/failed
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiBaseUrl } from '../utils/apiBase';

// ─── Types ──────────────────────────────────────────────────────────────────

export type GenJobStatus = 'queued' | 'waiting' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface GenerationJob {
  task_id: string;
  template_id: string;
  label: string;
  output_type: 'image' | 'video';
  output_asset_type: string;
  project_id: string | null;
  membership_id: string | null;
  status: GenJobStatus;
  progress: number;
  message: string;
  error_message: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface UseGenerationJobsOptions {
  /** Filter by status (comma-separated). Default: all */
  status?: string;
  /** Filter to specific project */
  project_id?: string;
  /** Filter to specific membership */
  membership_id?: string;
  /** Poll interval in ms. Default 8000 (8s). Set 0 to disable polling. */
  pollInterval?: number;
  /** Called when a job transitions to completed or failed */
  onStatusChange?: (job: GenerationJob, prevStatus: GenJobStatus) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useGenerationJobs(options: UseGenerationJobsOptions = {}) {
  const { status, project_id, membership_id, pollInterval = 8000, onStatusChange } = options;

  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track previous statuses to detect transitions
  const prevStatusMap = useRef<Record<string, GenJobStatus>>({});

  const fetchJobs = useCallback(async () => {
    const apiBaseUrl = getApiBaseUrl();
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (project_id) params.set('project_id', project_id);
    if (membership_id) params.set('membership_id', membership_id);
    params.set('limit', '100');

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/generative/jobs/?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Backend uses EnvelopeJSONRenderer → actual payload is under data.data
      const payload = data.data ?? data;
      const newJobs: GenerationJob[] = payload.results ?? (Array.isArray(payload) ? payload : []);

      // Detect status changes and fire callback
      if (onStatusChange) {
        for (const job of newJobs) {
          const prev = prevStatusMap.current[job.task_id];
          if (prev && prev !== job.status && (job.status === 'completed' || job.status === 'failed')) {
            onStatusChange(job, prev);
          }
        }
      }

      // Update prev status map
      for (const job of newJobs) {
        prevStatusMap.current[job.task_id] = job.status;
      }

      setJobs(newJobs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [status, project_id, membership_id, onStatusChange]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchJobs();
  }, [fetchJobs]);

  // Polling
  useEffect(() => {
    if (!pollInterval) return;
    const timer = setInterval(fetchJobs, pollInterval);
    return () => clearInterval(timer);
  }, [fetchJobs, pollInterval]);

  // Derived counts
  const activeJobs = jobs.filter((j) => j.status === 'queued' || j.status === 'waiting' || j.status === 'processing');
  const activeCount = activeJobs.length;

  return {
    jobs,
    activeJobs,
    activeCount,
    loading,
    error,
    refresh: fetchJobs,
  };
}

/** Lightweight hook for just the active job count (badge in header/sidebar). */
export function useGenerationJobsBadge() {
  const { activeCount, refresh } = useGenerationJobs({ pollInterval: 10000 });
  return { activeCount, refresh };
}
