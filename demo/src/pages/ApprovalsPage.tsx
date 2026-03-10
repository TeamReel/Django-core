/**
 * QueuePage — Unified queue dashboard combining three data sources:
 * 1. Workflow instances (content approval state machines)
 * 2. AI generation jobs (image/video/text AI output)
 * 3. Video processing jobs (transcode, compose, lineup, thumbnail)
 *
 * Route: /approvals (also handles redirects from /studio/videos)
 * Sidebar: CONTENT section → "Queue"
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { PullToRefresh } from '@django-core/design-system';
import { useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { logger } from '@/utils/logger';
import MobileTabBar from '../components/MobileTabBar';
import { useUserRole } from '../components/PermissionGuards';
import {
  useWorkflowInstances,
  type TransitionHistoryEntry,
} from '../hooks/useWorkflows';
import { WorkflowStatusBadge } from '../components/Workflows/WorkflowStatusBadge';
import { WorkflowActionButtons } from '../components/Workflows/WorkflowActionButtons';
import {
  useGenerationJobs,
  reviewJob,
  type GenerationJob,
  type GenJobStatus,
} from '../hooks/useGenerationJobs';
import {
  useVideoJobs,
  type VideoJob,
} from '../hooks/useVideoJobs';

import {
  type FilterState,
  type ContentTypeFilter,
  type VideoFollowUpInfo,
  type PhotoCompositeFollowUpInfo,
  CONTENT_TYPE_CHIPS,
  filterAiJobsByTab,
  filterVideoJobsByTab,
  matchesFilter,
  getEntityLabel,
  sortPriority,
} from './approvalsTypes';
import { VideoFollowUpModal, PhotoCompositeFollowUpModal } from './FollowUpModals';
import { ReviewModal, VideoReviewModal } from './ReviewModals';
import { ApprovalsJobList } from './ApprovalsJobList';
import s from './ApprovalsPage.module.css';

const tabTitles: Record<FilterState, { title: string; subtitle: string }> = {
  all: { title: 'Queue', subtitle: 'Alle items — workflows, AI-generatie en video processing.' },
  review: { title: 'Needs Review', subtitle: 'Items die wachten op beoordeling.' },
  active: { title: 'In Progress', subtitle: 'Actieve workflows, AI-jobs en video processing.' },
  completed: { title: 'Approved', subtitle: 'Goedgekeurde en afgeronde items.' },
  rejected: { title: 'Rejected', subtitle: 'Afgewezen en mislukte items.' },
  ai_queue: { title: 'AI Queue', subtitle: 'Alle AI-generatie jobs.' },
  video: { title: 'Video Processing', subtitle: 'Transcode, compose en lineup jobs.' },
};

export default function ApprovalsPage() {
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

  // ── Toast notifications ──
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);
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

  // ── AI Generation Jobs ──
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
      ? { ...j, approval_status: optimisticApprovals[j.task_id] as any }
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

  // ── Swipe-to-approve/reject handlers (X1) ──
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

  return (
    <>
      {/* Toasts */}
      <div className={s.toastContainer} style={{ pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding: '12px 18px', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'white', backgroundColor: t.type === 'success' ? 'var(--color-green-600)' : 'var(--color-red-600)', boxShadow: 'var(--shadow-md)', pointerEvents: 'auto', maxWidth: 360 }}>
            {t.message}
          </div>
        ))}
      </div>

      {resolvedModalJob && (
        <ReviewModal
          job={resolvedModalJob}
          reviewList={needsReviewJobs}
          onClose={() => setModalJob(null)}
          onReviewed={handleModalAction}
        />
      )}

      {modalVideoJob && (
        <VideoReviewModal
          job={modalVideoJob}
          onClose={() => setModalVideoJob(null)}
          onActionComplete={() => { setModalVideoJob(null); refreshVideoJobs(); }}
          pushToast={pushToast}
          approveJob={approveVideoJob}
          rejectJob={rejectVideoJob}
        />
      )}

      {videoFollowUp && (
        <VideoFollowUpModal
          info={videoFollowUp}
          onClose={() => setVideoFollowUp(null)}
          onSubmitted={(count) => {
            pushToast(`🎬 ${count} video${count > 1 ? "'s" : ''} in de wachtrij gezet!`, 'success');
            setVideoFollowUp(null);
            refreshAiJobs();
          }}
        />
      )}

      {photoCompositeFollowUp && (
        <PhotoCompositeFollowUpModal
          info={photoCompositeFollowUp}
          onClose={() => setPhotoCompositeFollowUp(null)}
          onSubmitted={() => {
            pushToast('🎬 Video in de wachtrij gezet!', 'success');
            setPhotoCompositeFollowUp(null);
            refreshAiJobs();
          }}
        />
      )}

      <div className={s.page}>
        {/* ── Header ── */}
        <div className={s.headerRow}>
          <div className={s.titleBlock}>
            <h1>{tabTitles[filter].title}</h1>
            <p>{tabTitles[filter].subtitle}</p>
          </div>
          <div className={s.actions}>
            {needsReviewJobs.length > 0 && (filter === 'ai_queue' || filter === 'review' || filter === 'all') && (
              <button onClick={() => openModal(needsReviewJobs[0])} className={s.btnBeginReview}>
                Beoordelen ({needsReviewJobs.length})
              </button>
            )}
            <button onClick={() => { refresh(); refreshAiJobs(); refreshVideoJobs(); }} className={s.btnRefresh} title="Vernieuwen">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <PullToRefresh
          onRefresh={async () => { refresh(); refreshAiJobs(); refreshVideoJobs(); }}
          pullText="Trek om te vernieuwen"
          releaseText="Laat los om te vernieuwen"
          refreshingText="Vernieuwen..."
        >
        {/* RBAC: Member (All, Review, Approved, Rejected), Admin (all 7) */}
        <MobileTabBar
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'review', label: 'Needs Review' },
            ...(!isPlayer && !isSupporter ? [{ id: 'active', label: 'In Progress' }] : []),
            { id: 'completed', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
            ...(!isPlayer && !isSupporter ? [{ id: 'ai_queue', label: 'AI Queue' }] : []),
            ...(!isPlayer && !isSupporter ? [{ id: 'video', label: 'Video' }] : []),
          ]}
          activeTab={filter}
          basePath="/approvals"
        />

        <div className={s.tabContent}>
        {(error || actionError || aiError || videoError) && (
          <div className={s.errorBanner}>{actionError || error || aiError || videoError}</div>
        )}

        {(loading || aiLoading || videoLoading) && (
          <div className={s.skeleton}>
            <div className={s.skeletonCard} />
            <div className={s.skeletonCard} />
            <div className={s.skeletonCard} />
            <div className={s.skeletonCard} />
          </div>
        )}

        {!loading && !aiLoading && !videoLoading && filtered.length === 0 && visibleAiJobs.length === 0 && visibleVideoJobs.length === 0 && (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>📭</div>
            <div className={s.emptyTitle}>Geen items</div>
            <div className="fs-12">Er zijn geen items voor dit filter.</div>
          </div>
        )}

        {!aiLoading && !videoLoading && (visibleAiJobs.length > 0 || visibleVideoJobs.length > 0) && (
          <div className={s.chipsRow}>
            {CONTENT_TYPE_CHIPS.map(chip => {
              const count = contentTypeCounts[chip.key];
              const isActive = contentType === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => setContentType(chip.key)}
                  className={`${s.chip} ${isActive ? s.chipActive : ''}`}
                  disabled={count === 0 && chip.key !== 'all'}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                  <span className={s.chipBadge}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {!aiLoading && !videoLoading && (
          <ApprovalsJobList
            visibleAiJobs={visibleAiJobs}
            visibleVideoJobs={visibleVideoJobs}
            contentType={contentType}
            openModal={openModal}
            openVideoModal={setModalVideoJob}
            cancelVideoJob={cancelVideoJob}
            retryVideoJob={retryVideoJob}
            hasWorkflowInstances={filtered.length > 0}
            onSwipeApproveAi={handleSwipeApproveAi}
            onSwipeRejectAi={handleSwipeRejectAi}
            onSwipeApproveVideo={handleSwipeApproveVideo}
            onSwipeRejectVideo={handleSwipeRejectVideo}
          />
        )}

        {filter !== 'ai_queue' && filter !== 'video' && !loading && filtered.length > 0 && (
          <div className="flex-col gap-10">
            {filtered.map(instance => (
              <div
                key={instance.id}
                className={s.workflowCard}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div className={s.workflowCardHeader}>
                  <div>
                    <div className={s.workflowBadgeRow}>
                      <span className={s.entityTypeBadge}>{getEntityLabel(instance.content_type_name)}</span>
                      <span className={s.entityTitle}>
                        {instance.context?.title || instance.context?.name || `#${instance.object_id}`}
                      </span>
                    </div>
                    <div className={s.workflowMeta}>
                      {instance.workflow_name} · Updated {new Date(instance.updated_at).toLocaleDateString()}
                      {instance.created_by_username && ` · by ${instance.created_by_username}`}
                    </div>
                  </div>
                  <WorkflowStatusBadge state={instance.current_state} />
                </div>
                {instance.available_actions.length > 0 && (
                  <WorkflowActionButtons
                    instanceId={instance.id}
                    availableActions={instance.available_actions}
                    onTransitionComplete={handleTransitionComplete}
                    onError={setActionError}
                    size="sm"
                  />
                )}
              </div>
            ))}
          </div>
        )}
        </div>{/* tabContent */}
      </PullToRefresh>
    </div>{/* page */}
    </>
  );
}
