/**
 * ContentGenerationModal — Video job polling sub-hook
 *
 * Manages video job state, polling, and approval actions.
 */
import { useState, useEffect, useRef } from 'react';
import { videoApi } from '../../../api';

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface UseVideoJobPollingParams {
  isOpen: boolean;
  step: string;
  onGenerated?: (message?: string) => void;
}

export interface UseVideoJobPollingReturn {
  videoJobId: string | null;
  setVideoJobId: React.Dispatch<React.SetStateAction<string | null>>;
  videoJobStatus: string | null;
  videoJobError: string | null;
  videoJobProgressRaw: number;
  videoJobMeta: Record<string, unknown>;
  videoOutputUrl: string | null;
  videoThumbnailUrl: string | null;
  videoApprovalStatus: 'idle' | 'approving' | 'rejecting' | 'approved' | 'rejected';
  videoApprovalError: string | null;
  resetVideo: () => void;
  abortActiveVideoJobPoll: () => void;
  handleVideoApproval: (action: 'approve' | 'reject') => Promise<void>;
}

/* ================================================================== */
/*  Hook                                                               */
/* ================================================================== */

export function useVideoJobPolling({
  isOpen,
  step,
  onGenerated,
}: UseVideoJobPollingParams): UseVideoJobPollingReturn {
  const [videoJobId, setVideoJobId] = useState<string | null>(null);
  const [videoJobStatus, setVideoJobStatus] = useState<string | null>(null);
  const [videoJobError, setVideoJobError] = useState<string | null>(null);
  const [videoJobProgressRaw, setVideoJobProgressRaw] = useState<number>(0);
  const [videoJobMeta, setVideoJobMeta] = useState<Record<string, unknown>>({});
  const [videoOutputUrl, setVideoOutputUrl] = useState<string | null>(null);
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState<string | null>(null);
  const [videoApprovalStatus, setVideoApprovalStatus] = useState<'idle' | 'approving' | 'rejecting' | 'approved' | 'rejected'>('idle');
  const [videoApprovalError, setVideoApprovalError] = useState<string | null>(null);

  const activeVideoJobPollRef = useRef<AbortController | null>(null);

  const abortActiveVideoJobPoll = () => {
    const ctrl = activeVideoJobPollRef.current;
    if (ctrl) {
      ctrl.abort();
      activeVideoJobPollRef.current = null;
    }
  };

  const resetVideo = () => {
    setVideoJobId(null);
    setVideoJobStatus(null);
    setVideoJobError(null);
    setVideoJobProgressRaw(0);
    setVideoJobMeta({});
    setVideoOutputUrl(null);
    setVideoThumbnailUrl(null);
    setVideoApprovalStatus('idle');
    setVideoApprovalError(null);
  };

  // Abort on close
  useEffect(() => {
    if (!isOpen) abortActiveVideoJobPoll();
    return () => abortActiveVideoJobPoll();
  }, [isOpen]);

  // Poll video job status
  useEffect(() => {
    if (step !== 'video_queued' || !videoJobId || !isOpen) return;

    const controller = new AbortController();
    activeVideoJobPollRef.current = controller;

    let attempts = 0;
    const maxAttempts = 120;

    const poll = async () => {
      while (!controller.signal.aborted && attempts < maxAttempts) {
        attempts++;
        try {
          const job = await videoApi.getJob(videoJobId, controller.signal) as any;

          setVideoJobStatus(job.status);
          setVideoJobProgressRaw(job.progress_percent || 0);

          if (job.status === 'completed') {
            const outUrl = job.output_url || job.output_file?.url;
            if (outUrl) setVideoOutputUrl(outUrl);
            if (job.thumbnail_url) setVideoThumbnailUrl(job.thumbnail_url);
            break;
          }
          if (job.status === 'failed') {
            setVideoJobError(job.error_message || null);
            break;
          }
        } catch (err: unknown) {
          console.error(err);
          if (err instanceof Error && err.name === 'AbortError') return;
          // HTTP errors (ApiError) → stop polling; network errors → retry
          if (typeof (err as any)?.status === 'number') break;
          console.warn('Poll error:', err);
        }
        await new Promise(r => setTimeout(r, 5000));
      }
    };

    poll();
    return () => controller.abort();
  }, [step, videoJobId, isOpen]);

  // Approve / reject
  const handleVideoApproval = async (action: 'approve' | 'reject') => {
    if (!videoJobId) return;
    const isApprove = action === 'approve';
    setVideoApprovalStatus(isApprove ? 'approving' : 'rejecting');
    setVideoApprovalError(null);
    try {
      if (isApprove) {
        await videoApi.approveJob(videoJobId);
      } else {
        await videoApi.rejectJob(videoJobId);
      }
      setVideoApprovalStatus(isApprove ? 'approved' : 'rejected');
      if (isApprove) onGenerated?.('Video goedgekeurd en opgeslagen.');
    } catch (err) {
      console.error(err);
      setVideoApprovalError(err instanceof Error ? err.message : `${action} failed`);
      setVideoApprovalStatus('idle');
    }
  };

  return {
    videoJobId,
    setVideoJobId,
    videoJobStatus,
    videoJobError,
    videoJobProgressRaw,
    videoJobMeta,
    videoOutputUrl,
    videoThumbnailUrl,
    videoApprovalStatus,
    videoApprovalError,
    resetVideo,
    abortActiveVideoJobPoll,
    handleVideoApproval,
  };
}
