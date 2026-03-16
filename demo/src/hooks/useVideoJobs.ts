/**
 * useVideoJobs Hook
 *
 * Manages video processing jobs (B55):
 * - List jobs with filters (status, type)
 * - Create new jobs
 * - Cancel queued jobs
 * - Retry failed jobs
 * - Poll for progress updates
 *
 * API: /api/v1/video/jobs/
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/api';
import { logger } from '@/utils/logger';

// ============================================================================
// Types
// ============================================================================

export type VideoJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type VideoJobType = 'transcode' | 'thumbnail' | 'compose' | 'lineup' | 'goal_celebration' | 'match_intro' | 'then_vs_now';

export interface VideoPreset {
  id: string;
  name: string;
  description: string;
  output_format: string;
  resolution: string;
  is_system: boolean;
}

export interface VideoJobWorkflowInfo {
  id: number;
  current_state: string;
  template_name: string;
  available_actions: string[];
}

export interface VideoJob {
  id: string;
  project: number;
  created_by: number | null;
  created_by_username?: string;
  job_type: VideoJobType;
  status: VideoJobStatus;
  progress_percent: number;
  input_file?: string | null;
  output_file?: string | { file_size?: number; url?: string; original_name?: string; storage_path?: string } | null;
  preset?: string | null;
  preset_name?: string;
  workflow_instance?: VideoJobWorkflowInfo | null;
  approval_status: string | null;
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  error_message?: string | null;
  error_code?: string | null;
  retry_count: number;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  output_url?: string | null;
  thumbnail_url?: string | null;
}

export interface CreateVideoJobParams {
  job_type: VideoJobType;
  input_file_id?: string;
  preset_id?: string;
  platform_export_id?: string;
  workflow_template_id?: string;
  config?: Record<string, unknown>;
}

// ============================================================================
// Helpers
// ============================================================================

async function videoApiFetch<T>(
  path: string,
  projectId?: string | number | null,
  options?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {};
  if (projectId) headers['X-Project-ID'] = String(projectId);

  // Build query params from path, add headers
  const method = options?.method || 'GET';

  if (method === 'GET') {
    const raw = await api.get<T>(path);
    return raw as T;
  } else if (method === 'POST') {
    const body = options?.body ? JSON.parse(options.body as string) : undefined;
    const raw = await api.post<T>(path, body);
    return raw as T;
  } else if (method === 'DELETE') {
    await api.delete(path);
    return {} as T;
  } else if (method === 'PATCH') {
    const body = options?.body ? JSON.parse(options.body as string) : undefined;
    const raw = await api.patch<T>(path, body);
    return raw as T;
  }

  return {} as T;
}

function unwrapResults<T>(payload: unknown): T[] {
  const p = payload as Record<string, unknown> | undefined;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(p?.results)) return p.results as T[];
  const d = p?.data as Record<string, unknown> | undefined;
  if (d && Array.isArray(d.results)) return d.results as T[];
  if (d && Array.isArray(d)) return d as T[];
  return [];
}

// ============================================================================
// Status Display Helpers
// ============================================================================

export function getJobStatusDisplay(status: VideoJobStatus): {
  color: string;
  bgColor: string;
  icon: string;
  label: string;
} {
  switch (status) {
    case 'queued':
      return { color: 'var(--app-muted-text)', bgColor: 'var(--app-surface-2)', icon: 'clock', label: 'Queued' };
    case 'processing':
      return { color: 'var(--color-blue-600)', bgColor: 'var(--color-blue-100)', icon: 'refresh-cw', label: 'Processing' };
    case 'completed':
      return { color: 'var(--color-green-600)', bgColor: 'var(--color-green-100)', icon: 'check-circle-2', label: 'Completed' };
    case 'failed':
      return { color: 'var(--color-red-500)', bgColor: 'var(--color-red-100)', icon: 'x-circle', label: 'Failed' };
    case 'cancelled':
      return { color: 'var(--color-neutral-400)', bgColor: 'var(--app-surface-2)', icon: 'ban', label: 'Cancelled' };
    default:
      return { color: 'var(--app-muted-text)', bgColor: 'var(--app-surface-2)', icon: 'file-question', label: status || 'Unknown' };
  }
}

export function getJobTypeDisplay(type: VideoJobType): {
  icon: string;
  label: string;
} {
  switch (type) {
    case 'transcode':
      return { icon: 'clapperboard', label: 'Transcode' };
    case 'thumbnail':
      return { icon: 'image', label: 'Thumbnail' };
    case 'compose':
      return { icon: 'palette', label: 'Compose' };
    case 'lineup':
      return { icon: 'clipboard-list', label: 'Lineup' };
    case 'goal_celebration':
      return { icon: 'circle-dot', label: 'Goal Celebration' };
    case 'match_intro':
      return { icon: 'clapperboard', label: 'Match Intro' };
    case 'then_vs_now':
      return { icon: 'refresh-cw', label: 'Transformation' };
    default:
      return { icon: 'package', label: type || 'Unknown' };
  }
}

// ============================================================================
// Hook: useVideoJobs
// ============================================================================

interface UseVideoJobsOptions {
  projectId?: string | number | null;
  status?: VideoJobStatus;
  jobType?: VideoJobType;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseVideoJobsReturn {
  jobs: VideoJob[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  cancelJob: (jobId: string) => Promise<void>;
  retryJob: (jobId: string) => Promise<void>;
  createJob: (params: CreateVideoJobParams) => Promise<VideoJob>;
  approveJob: (jobId: string) => Promise<VideoJob>;
  rejectJob: (jobId: string) => Promise<VideoJob>;
}

export function useVideoJobs(options: UseVideoJobsOptions): UseVideoJobsReturn {
  const { projectId, status, jobType, autoRefresh = true, refreshInterval = 10_000 } = options;

  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchJobs() {
      if (document.hidden) return; // Skip while tab is in background
      try {
        if (refreshKey === 0) setLoading(true);

        const params = new URLSearchParams();
        if (projectId) params.append('project', String(projectId));
        if (status) params.append('status', status);
        if (jobType) params.append('job_type', jobType);
        params.append('ordering', '-created_at');

        const data = await videoApiFetch<{ results?: VideoJob[] } | VideoJob[]>(
          `/video/jobs/?${params.toString()}`,
          projectId
        );

        if (!cancelled) {
          setJobs(unwrapResults<VideoJob>(data));
          setError(null);
        }
      } catch (err: unknown) {
        logger.error('useVideoJobs fetch error', err);
        if (!cancelled) {
          // 403 = user isn't a member of this project → treat as empty, not error
          const status = typeof err === 'object' && err !== null && 'status' in err ? err.status : undefined;
          if (status === 403) {
            logger.debug(`useVideoJobs: No access to project ${projectId}, returning empty jobs`);
            setJobs([]);
            setError(null);
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load video jobs');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchJobs();

    return () => { cancelled = true; };
  }, [projectId, status, jobType, refreshKey]);

  // Auto-refresh when there are active jobs
  useEffect(() => {
    if (!autoRefresh) return;

    const hasActiveJobs = jobs.some(j => j.status === 'queued' || j.status === 'processing');
    if (!hasActiveJobs) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(refresh, refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobs, autoRefresh, refreshInterval, refresh]);

  // ── Mutations ────────────────────────────────────────────────────

  const cancelJob = useCallback(async (jobId: string) => {
    await videoApiFetch<void>(
      `/video/jobs/${jobId}/`,
      projectId,
      { method: 'DELETE' }
    );
    refresh();
  }, [projectId, refresh]);

  const retryJob = useCallback(async (jobId: string) => {
    await videoApiFetch<VideoJob>(
      `/video/jobs/${jobId}/retry/`,
      projectId,
      { method: 'POST' }
    );
    refresh();
  }, [projectId, refresh]);

  const createJob = useCallback(async (params: CreateVideoJobParams) => {
    const result = await videoApiFetch<VideoJob>(
      '/video/jobs/',
      projectId,
      { method: 'POST', body: JSON.stringify(params) }
    );
    refresh();
    return result;
  }, [projectId, refresh]);

  const approveJob = useCallback(async (jobId: string) => {
    const result = await videoApiFetch<VideoJob>(
      `/video/jobs/${jobId}/approve/`,
      projectId,
      { method: 'POST' }
    );
    refresh();
    return result;
  }, [projectId, refresh]);

  const rejectJob = useCallback(async (jobId: string) => {
    const result = await videoApiFetch<VideoJob>(
      `/video/jobs/${jobId}/reject/`,
      projectId,
      { method: 'POST' }
    );
    refresh();
    return result;
  }, [projectId, refresh]);

  return {
    jobs,
    loading,
    error,
    refresh,
    cancelJob,
    retryJob,
    createJob,
    approveJob,
    rejectJob,
  };
}

// ============================================================================
// Hook: useVideoPresets
// ============================================================================

export interface UseVideoPresetsReturn {
  presets: VideoPreset[];
  loading: boolean;
}

export function useVideoPresets(projectId: string | number): UseVideoPresetsReturn {
  const [presets, setPresets] = useState<VideoPreset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    async function fetchPresets() {
      try {
        const data = await videoApiFetch<{ results?: VideoPreset[] } | VideoPreset[]>(
          '/video/presets/',
          projectId
        );
        if (!cancelled) {
          setPresets(unwrapResults<VideoPreset>(data));
        }
      } catch {
        // Non-critical, presets are optional
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPresets();
    return () => { cancelled = true; };
  }, [projectId]);

  return { presets, loading };
}
