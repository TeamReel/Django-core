/**
 * useQueueCounts — Lightweight hook for queue tab badges.
 *
 * Polls AI generation jobs + video processing jobs and computes
 * per-tab counts for the sidebar. Uses a long poll interval (30s)
 * to minimize overhead when visible in the sidebar.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiBaseUrl } from '../utils/apiBase';
import type { GenerationJob, GenJobStatus } from './useGenerationJobs';

export interface QueueCounts {
  /** Needs Review = AI completed + pending_review */
  review: number;
  /** In Progress = AI queued/processing + Video queued/processing */
  active: number;
  /** Approved + Completed */
  completed: number;
  /** Rejected + Failed + Cancelled */
  rejected: number;
  /** All AI jobs */
  ai_queue: number;
  /** All video jobs */
  video: number;
  /** Total of all items */
  all: number;
}

const EMPTY_COUNTS: QueueCounts = {
  review: 0,
  active: 0,
  completed: 0,
  rejected: 0,
  ai_queue: 0,
  video: 0,
  all: 0,
};

export function useQueueCounts(pollInterval = 30000): QueueCounts {
  const [counts, setCounts] = useState<QueueCounts>(EMPTY_COUNTS);
  const mountedRef = useRef(true);

  const fetchCounts = useCallback(async () => {
    const apiBase = getApiBaseUrl();

    try {
      const [aiRes, videoRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/generative/jobs/?limit=200`, { credentials: 'include' }).then(r =>
          r.ok ? r.json() : null,
        ),
        fetch(`${apiBase}/api/v1/video/jobs/?limit=200`, { credentials: 'include' }).then(r =>
          r.ok ? r.json() : null,
        ),
      ]);

      if (!mountedRef.current) return;

      // Parse AI jobs
      const aiPayload = aiRes?.data ?? aiRes;
      const aiJobs: GenerationJob[] = aiPayload?.results ?? (Array.isArray(aiPayload) ? aiPayload : []);

      // Parse video jobs — handle both envelope and direct formats
      const videoPayload = videoRes?.data ?? videoRes;
      let videoJobs: { status: string; job_type?: string }[] = [];
      if (videoPayload?.results && Array.isArray(videoPayload.results)) {
        videoJobs = videoPayload.results;
      } else if (videoPayload?.data && Array.isArray(videoPayload.data.results)) {
        videoJobs = videoPayload.data.results;
      } else if (videoPayload?.data && Array.isArray(videoPayload.data)) {
        videoJobs = videoPayload.data;
      } else if (Array.isArray(videoPayload)) {
        videoJobs = videoPayload;
      }

      // Count per tab
      const aiReview = aiJobs.filter(
        j => j.status === 'completed' && (j.approval_status === 'pending_review' || !j.approval_status),
      ).length;

      // Video jobs ready for review: completed + workflow in ready_for_review state
      const videoReview = videoJobs.filter(
        (j: any) => j.status === 'completed' && j.workflow_instance?.current_state === 'ready_for_review',
      ).length;

      const review = aiReview + videoReview;

      const aiActive = aiJobs.filter(
        j => j.status === 'queued' || j.status === 'waiting' || j.status === 'processing',
      ).length;
      const videoActive = videoJobs.filter(
        j => j.status === 'queued' || j.status === 'processing',
      ).length;

      const aiApproved = aiJobs.filter(j => j.approval_status === 'approved').length;
      const videoCompleted = videoJobs.filter(
        (j: any) => j.status === 'completed' && j.workflow_instance?.current_state !== 'ready_for_review',
      ).length;

      const aiRejected = aiJobs.filter(j => j.approval_status === 'rejected').length;
      const videoFailed = videoJobs.filter(
        j => j.status === 'failed' || j.status === 'cancelled',
      ).length;

      setCounts({
        review,
        active: aiActive + videoActive,
        completed: aiApproved + videoCompleted,
        rejected: aiRejected + videoFailed,
        ai_queue: aiJobs.length,
        video: videoJobs.length,
        all: aiJobs.length + videoJobs.length,
      });
    } catch {
      // Silently ignore — don't break sidebar if queue API is down
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchCounts();
    if (!pollInterval) return;
    const timer = setInterval(fetchCounts, pollInterval);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [fetchCounts, pollInterval]);

  return counts;
}
