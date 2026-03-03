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
import { useLocation } from 'react-router-dom';
import MobileTabBar from '../components/MobileTabBar';
import { PageContent, PageHeader } from '@django-core/page-templates';
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
  const location = useLocation();
  const rawTab = new URLSearchParams(location.search).get('tab') || 'all';
  const filter: FilterState = (['all', 'review', 'active', 'completed', 'rejected', 'ai_queue', 'video'] as const).includes(rawTab as FilterState)
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
          const approvedVariants = result?.output_variants?.filter((v: any) => v.approved === true) || [];
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
          const approvedVariants = result?.output_variants?.filter((v: any) => v.approved === true) || [];
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
      pushToast(e instanceof Error ? e.message : 'Review mislukt', 'error');
      setOptimisticApprovals(prev => { const n = { ...prev }; delete n[taskId]; return n; });
    }
  }, [modalJob, mergedJobs, needsReviewJobs, pushToast]);

  const visibleAiJobs = filterAiJobsByTab(mergedJobs, filter);
  const visibleVideoJobs = useMemo(() => filterVideoJobsByTab(videoJobs, filter), [videoJobs, filter]);

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
          <div key={t.id} style={{ padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, color: '#fff', backgroundColor: t.type === 'success' ? '#16a34a' : '#dc2626', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', pointerEvents: 'auto', maxWidth: 360 }}>
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

      <PageHeader
        title={tabTitles[filter].title}
        subtitle={tabTitles[filter].subtitle}
        actions={
          <div className="flex-row gap-8">
            {needsReviewJobs.length > 0 && (filter === 'ai_queue' || filter === 'review' || filter === 'all') && (
              <button onClick={() => openModal(needsReviewJobs[0])} className={s.btnBeginReview}>
                Begin beoordelen ({needsReviewJobs.length})
              </button>
            )}
            <button onClick={() => { refresh(); refreshAiJobs(); refreshVideoJobs(); }} className={s.btnRefresh}>
              ↻ Refresh
            </button>
          </div>
        }
      />

      <PageContent>
        <MobileTabBar
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'review', label: 'Needs Review' },
            { id: 'active', label: 'In Progress' },
            { id: 'completed', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'ai_queue', label: 'AI Queue' },
            { id: 'video', label: 'Video' },
          ]}
          activeTab={filter}
          basePath="/approvals"
        />

        {(error || actionError || aiError || videoError) && (
          <div className={s.errorBanner}>{actionError || error || aiError || videoError}</div>
        )}

        {(loading || aiLoading || videoLoading) && (
          <div className={s.loadingCenter}>Loading...</div>
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
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${isActive ? 'var(--color-blue-600)' : 'var(--app-border, #e5e7eb)'}`,
                    backgroundColor: isActive ? 'var(--color-blue-600)' : 'var(--app-surface, #fff)',
                    color: isActive ? '#fff' : 'var(--app-text-secondary, #6b7280)',
                    cursor: count > 0 || chip.key === 'all' ? 'pointer' : 'default',
                    opacity: count > 0 || chip.key === 'all' ? 1 : 0.4,
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--app-surface-2, #f3f4f6)',
                    borderRadius: 99, padding: '1px 6px', minWidth: 18, textAlign: 'center',
                  }}>
                    {count}
                  </span>
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
      </PageContent>
    </>
  );
}
