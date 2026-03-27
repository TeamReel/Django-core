/**
 * useGenerationJobs — AI Generation Queue hook
 *
 * Polls /api/v1/generative/jobs/ and surfaces:
 * - Full job list (for the AI Queue tab)
 * - Active job count (for the header/sidebar badge)
 * - Toast notifications when a job transitions to completed/failed
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import type { RealtimeEvent } from '@/hooks/useRealtimeChannel';

// ─── Types ──────────────────────────────────────────────────────────────────

export type GenJobStatus = 'queued' | 'waiting' | 'processing' | 'retrying' | 'completed' | 'failed' | 'cancelled';
export type GenJobApprovalStatus = 'pending_review' | 'approved' | 'rejected';

/** One generated output variant (image or video). */
export interface OutputVariant {
  variant_index: number;
  storage_path: string;
  presigned_url: string;   // fresh URL generated server-side on every list request
  file_asset_id: string | null;
  mime_type: string;
  filename: string;
  approved: boolean | null; // null = not yet reviewed, true = approved, false = rejected
}

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
  approval_status: GenJobApprovalStatus | null;
  output_url: string;
  output_variants: OutputVariant[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // AI metadata
  provider: string | null;
  model: string | null;
  duration_seconds: number | null;
  content_duration_seconds: number | null;
  estimated_cost_eur: number | null;
  estimated_input_tokens: number | null;
  estimated_output_tokens: number | null;
  variant_count: number | null;
  // Resolved names for directory display
  project_name: string | null;
  club_name: string | null;
  membership_name: string | null;
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

export interface UseGenerationJobsReturn {
  jobs: GenerationJob[];
  activeJobs: GenerationJob[];
  activeCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useGenerationJobs(options: UseGenerationJobsOptions = {}): UseGenerationJobsReturn {
  const { status, project_id, membership_id, pollInterval = 15000, onStatusChange } = options;

  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track previous statuses to detect transitions
  const prevStatusMap = useRef<Record<string, GenJobStatus>>({});

  const fetchJobs = useCallback(async () => {
    if (document.hidden) return; // Skip while tab is in background
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (project_id) params.set('project_id', project_id);
    if (membership_id) params.set('membership_id', membership_id);
    params.set('limit', '100');

    try {
      const data = await api.get<GenerationJob[] | { results: GenerationJob[] }>(`/generative/jobs/?${params}`);
      const newJobs: GenerationJob[] = (!Array.isArray(data) && (data as { results?: GenerationJob[] }).results) || (Array.isArray(data) ? data : []);

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

      // Only update state if data actually changed (prevents unnecessary re-renders
      // that would reset video playback in modals, etc.)
      setJobs(prev => {
        const prevJson = JSON.stringify(prev.map(j => `${j.task_id}:${j.status}:${j.approval_status}:${j.progress}`));
        const nextJson = JSON.stringify(newJobs.map(j => `${j.task_id}:${j.status}:${j.approval_status}:${j.progress}`));
        return prevJson === nextJson ? prev : newJobs;
      });
      setError(null);
    } catch (e) {
      logger.error('useGenerationJobs fetch error', e);
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

  // Real-time: subscribe to project channel for instant status updates
  const REALTIME_EVENT_TYPES = new Set([
    'content.status_changed', 'content.approved', 'content.rejected',
    'generation.status_changed',
  ]);
  const { status: wsStatus } = useRealtimeChannel({
    channelType: 'project',
    channelId: project_id || null,
    onEvent: useCallback((event: RealtimeEvent) => {
      if (REALTIME_EVENT_TYPES.has(event.event_type)) fetchJobs();
    }, [fetchJobs]),
  });

  // Polling — slower when WS is connected, normal when disconnected
  const effectivePollInterval = wsStatus === 'connected' ? Math.max(pollInterval, 60_000) : pollInterval;
  useEffect(() => {
    if (!effectivePollInterval) return;
    let timer = setInterval(fetchJobs, effectivePollInterval);
    const onVisibility = () => {
      if (document.hidden) {
        clearInterval(timer);
      } else {
        fetchJobs();
        timer = setInterval(fetchJobs, pollInterval);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [fetchJobs, effectivePollInterval]);

  // Derived counts
  const activeJobs = jobs.filter((j) => j.status === 'queued' || j.status === 'waiting' || j.status === 'processing' || j.status === 'retrying');
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

export interface UseGenerationJobsBadgeReturn {
  activeCount: number;
  refresh: () => Promise<void>;
}

/** Lightweight hook for just the active job count (badge in header/sidebar). */
export function useGenerationJobsBadge(): UseGenerationJobsBadgeReturn {
  const { activeCount, refresh } = useGenerationJobs({ pollInterval: 10000 });
  return { activeCount, refresh };
}

/** Call the review endpoint to approve or reject a completed job (or specific variants). */
export async function reviewJob(
  taskId: string,
  action: 'approve' | 'reject',
  variantIndices?: number[],   // omit to review whole job
): Promise<{ approval_status: GenJobApprovalStatus; output_variants: OutputVariant[] }> {
  const body: Record<string, unknown> = { action };
  if (variantIndices !== undefined) body.variant_indices = variantIndices;
  const data = await api.post<{ approval_status: GenJobApprovalStatus; output_variants: OutputVariant[] }>(
    `/generative/jobs/${taskId}/review/`,
    body,
  );
  return data;
}
