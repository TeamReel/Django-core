/**
 * useApprovalsData - Main data hook for the approvals page
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { logger } from '@/utils/logger';
import { useUserRole } from '../../components/PermissionGuards';
import {
  useWorkflowInstances,
  type TransitionHistoryEntry,
} from '../../hooks/useWorkflows';
import {
  useGenerationJobs,
  reviewJob,
  type GenerationJob,
  type GenJobStatus,
  type GenJobApprovalStatus,
} from '../../hooks/useGenerationJobs';
import {
  useVideoJobs,
  type VideoJob,
} from '../../hooks/useVideoJobs';
import {
  type FilterState,
  type ContentTypeFilter,
  type VideoFollowUpInfo,
  type PhotoCompositeFollowUpInfo,
  filterAiJobsByTab,
  filterVideoJobsByTab,
  matchesFilter,
  sortPriority,
} from '../approvalsTypes';
import type { ApprovalsToast } from './types';

const tabTitles: Record<FilterState, { title: string; subtitle: string }> = {
  all: { title: 'Queue', subtitle: 'Alle items — workflows, AI-generatie en video processing.' },
  review: { title: 'Needs Review', subtitle: 'Items die wachten op beoordeling.' },
  active: { title: 'In Progress', subtitle: 'Actieve workflows, AI-jobs en video processing.' },
  completed: { title: 'Approved', subtitle: 'Goedgekeurde en afgeronde items.' },
  rejected: { title: 'Rejected', subtitle: 'Afgewezen en mislukte items.' },
  ai_queue: { title: 'AI Queue', subtitle: 'Alle AI-generatie jobs.' },
  video: { title: 'Video Processing', subtitle: 'Transcode, compose en lineup jobs.' },
};

export function useApprovalsData() {
  const { isPlayer, isSupporter } = useUserRole();
  const location = useLocation();
  const rawTab = new URLSearchParams(location.search).get('tab') || 'all';
  const isAdmin = !isPlayer && !isSupporter;
  const allowedTabs = isAdmin
    ? ['all', 'review', 'active', 'completed', 'rejected', 'ai_queue', 'video'] as const
    : ['all', 'review', 'completed', 'rejected'] as const;
  const filter: FilterState = (allowedTabs as readonly string[]).includes(rawTab)
    ? (rawTab as FilterState)
    : 'all';

  const [actionError, setActionError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<ContentTypeFilter>('all');
  const [modalJob, setModalJob] = useState<GenerationJob | null>(null);
  const [modalVideoJob, setModalVideoJob] = useState<VideoJob | null>(null);
  const [videoFollowUp, setVideoFollowUp] = useState<VideoFollowUpInfo | null>(null);
  const [photoCompositeFollowUp, setPhotoCompositeFollowUp] = useState<PhotoCompositeFollowUpInfo | null>(null);
  const [optimisticApprovals, setOptimisticApprovals] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<ApprovalsToast[]>([]);

  const pushToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = String(Date.now());
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const askedPushRef = useRef(false);
  useEffect(() => {
    if (filter === 'ai_queue' && !askedPushRef.current && 'Notification' in window && Notification.permission === 'default') {
      askedPushRef.current = true;
      Notification.requestPermission();
    }
  }, [filter]);

  const handleJobStatusChange = useCallback((job: GenerationJob, _prev: GenJobStatus) => {
    const label = job.label || job.template_id;
    if (job.status === 'completed') {
      pushToast(`✅ AI job voltooid: ${label} — open AI Queue om te beoordelen`, 'success');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('AI Generatie voltooid', { body: `${label} — klaar voor beoordeling`, icon: '/favicon.ico' });
      }
    } else if (job.status === 'failed') {
      pushToast(`❌ AI job mislukt: ${label}`, 'error');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('AI Generatie mislukt', { body: label, icon: '/favicon.ico' });
      }
    }
  }, [pushToast]);

  const { jobs: aiJobs, loading: aiLoading, error: aiError, refresh: refreshAiJobs } = useGenerationJobs({
    pollInterval: filter === 'ai_queue' ? 5000 : 15000,
    onStatusChange: handleJobStatusChange,
  });

  const mergedJobs = aiJobs.map(j =>
    optimisticApprovals[j.task_id]
      ? { ...j, approval_status: optimisticApprovals[j.task_id] as GenJobApprovalStatus }
      : j
  );

  const { instances, loading, error, refresh } = useWorkflowInstances({ page_size: 100 });

  const {
    jobs: videoJobs,
    loading: videoLoading,
    error: videoError,
    refresh: refreshVideoJobs,
    cancelJob: cancelVideoJob,
    retryJob: retryVideoJob,
    approveJob: approveVideoJob,
    rejectJob: rejectVideoJob,
  } = useVideoJobs({ projectId: null });

  const handleTransitionComplete = useCallback(
    (_entry: TransitionHistoryEntry) => {
      setActionError(null);
      refresh();
    },
    [refresh]
  );

  const filtered = instances.filter(i => matchesFilter(i, filter)).sort(sortPriority);
  const needsReviewJobs = mergedJobs.filter(j => j.status === 'completed' && (j.approval_status === 'pending_review' || !j.approval_status));
  const resolvedModalJob = modalJob
    ? mergedJobs.find(j => j.task_id === modalJob.task_id) ?? modalJob
    : null;

  const openModal = (job: GenerationJob) => setModalJob(job);

  const handleModalAction = useCallback(async (taskId: string, action: 'approve' | 'reject') => {
    if (taskId === '__prev__') {
      const cur = modalJob ? needsReviewJobs.findIndex(j => j.task_id === modalJob.task_id) : 0;
      const prev = needsReviewJobs[cur - 1];
      if (prev) setModalJob(prev);
      return;
    }
    if (taskId === '__next__') {
      const cur = modalJob ? needsReviewJobs.findIndex(j => j.task_id === modalJob.task_id) : 0;
      const next = needsReviewJobs[cur + 1];
      if (next) setModalJob(next);
      return;
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    setOptimisticApprovals(prev => ({ ...prev, [taskId]: newStatus }));

    const remaining = needsReviewJobs.filter(j => j.task_id !== taskId);
    const curIdx = needsReviewJobs.findIndex(j => j.task_id === taskId);
    if (remaining.length > 0) {
      const nextIdx = Math.min(curIdx, remaining.length - 1);
      setModalJob(remaining[nextIdx]);
    } else {
      setModalJob(null);
    }

    try {
      const result = await reviewJob(taskId, action);
      pushToast(action === 'approve' ? '✅ Goedgekeurd!' : '❌ Afgewezen', 'success');

      if (action === 'approve') {
        const approvedJob = mergedJobs.find(j => j.task_id === taskId);
        if (approvedJob && approvedJob.template_id === 'fullbody_in_tenue' && approvedJob.membership_id) {
          const approvedVariants = result?.output_variants?.filter((v) => v.approved === true) || [];
          const imageUrl = approvedVariants[0]?.presigned_url || approvedJob.output_url;
          if (imageUrl) {
            const kitMatch = approvedJob.label?.match(/\((home|away|third|goalkeeper)\)/i);
            const kitType = kitMatch ? kitMatch[1].toLowerCase() : 'home';
            setVideoFollowUp({
              membershipId: approvedJob.membership_id,
              projectId: approvedJob.project_id || '',
              organisationId: '',
              approvedImageUrl: imageUrl,
              kitType,
              memberName: approvedJob.membership_name || approvedJob.label || 'Speler',
            });
          }
        }

        if (approvedJob && approvedJob.template_id === 'photo_composite_gemini' && approvedJob.membership_id) {
          const approvedVariants = result?.output_variants?.filter((v) => v.approved === true) || [];
          const imageUrl = approvedVariants[0]?.presigned_url || approvedJob.output_url;
          if (imageUrl) {
            setPhotoCompositeFollowUp({
              membershipId: approvedJob.membership_id,
              projectId: approvedJob.project_id || '',
              approvedImageUrl: imageUrl,
              memberName: approvedJob.membership_name || approvedJob.label || 'Speler',
            });
          }
        }
      }
    } catch (e) {
      logger.error('Review failed', e);
      pushToast(e instanceof Error ? e.message : 'Review mislukt', 'error');
      setOptimisticApprovals(prev => { const n = { ...prev }; delete n[taskId]; return n; });
    }
  }, [modalJob, mergedJobs, needsReviewJobs, pushToast]);

  const visibleAiJobs = filterAiJobsByTab(mergedJobs, filter);
  const visibleVideoJobs = useMemo(() => filterVideoJobsByTab(videoJobs, filter), [videoJobs, filter]);

  const handleSwipeApproveAi = useCallback((taskId: string) => {
    handleModalAction(taskId, 'approve');
  }, [handleModalAction]);

  const handleSwipeRejectAi = useCallback((taskId: string) => {
    handleModalAction(taskId, 'reject');
  }, [handleModalAction]);

  const handleSwipeApproveVideo = useCallback(async (jobId: string) => {
    try {
      await approveVideoJob(jobId);
      pushToast('✅ Video goedgekeurd!', 'success');
    } catch (e) {
      logger.error('Approve video failed', e);
      pushToast(e instanceof Error ? e.message : 'Goedkeuren mislukt', 'error');
    }
  }, [approveVideoJob, pushToast]);

  const handleSwipeRejectVideo = useCallback(async (jobId: string) => {
    try {
      await rejectVideoJob(jobId);
      pushToast('❌ Video afgewezen', 'success');
    } catch (e) {
      logger.error('Reject video failed', e);
      pushToast(e instanceof Error ? e.message : 'Afwijzen mislukt', 'error');
    }
  }, [rejectVideoJob, pushToast]);

  const contentTypeCounts = useMemo(() => ({
    all: visibleAiJobs.length + visibleVideoJobs.length,
    ai_video: visibleAiJobs.filter(j => j.output_type === 'video').length,
    ai_image: visibleAiJobs.filter(j => j.output_type === 'image').length,
    lineup_video: visibleVideoJobs.filter(j => j.job_type === 'lineup').length,
    video_processing: visibleVideoJobs.filter(j => j.job_type !== 'lineup').length,
  }), [visibleAiJobs, visibleVideoJobs]);

  const refreshAll = useCallback(() => {
    refresh();
    refreshAiJobs();
    refreshVideoJobs();
  }, [refresh, refreshAiJobs, refreshVideoJobs]);

  return {
    // State
    filter,
    isAdmin,
    isPlayer,
    isSupporter,
    contentType,
    setContentType,
    toasts,
    pushToast,

    // Modal state
    modalJob,
    setModalJob,
    modalVideoJob,
    setModalVideoJob,
    videoFollowUp,
    setVideoFollowUp,
    photoCompositeFollowUp,
    setPhotoCompositeFollowUp,
    resolvedModalJob,

    // Loading/error
    loading,
    aiLoading,
    videoLoading,
    error,
    aiError,
    videoError,
    actionError,
    setActionError,

    // Data
    filtered,
    visibleAiJobs,
    visibleVideoJobs,
    needsReviewJobs,
    contentTypeCounts,
    tabTitles,

    // Actions
    openModal,
    handleModalAction,
    handleTransitionComplete,
    handleSwipeApproveAi,
    handleSwipeRejectAi,
    handleSwipeApproveVideo,
    handleSwipeRejectVideo,
    cancelVideoJob,
    retryVideoJob,
    approveVideoJob,
    rejectVideoJob,
    refreshAll,
    refreshAiJobs,
    refreshVideoJobs,
  };
}
