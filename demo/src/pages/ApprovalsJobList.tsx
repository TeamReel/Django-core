/**
 * Unified job list: AI generation + video processing jobs interleaved by date.
 * Supports swipe-to-approve/reject on reviewable cards (X1).
 */
import React, { useMemo, useCallback } from 'react';
import { Check, X, Clock, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import SwipeableCard from '../components/SwipeableCard';
import { clickableProps } from '@/utils/a11y';
import {
  type GenerationJob,
  type GenJobStatus,
} from '../hooks/useGenerationJobs';
import {
  type VideoJob,
  getJobStatusDisplay,
  getJobTypeDisplay,
} from '../hooks/useVideoJobs';
import { type ContentTypeFilter, formatVideoDuration } from './approvalsTypes';
import s from './ApprovalsPage.module.css';
import styles from './ApprovalsJobList.module.css';

type UnifiedItem =
  | { kind: 'ai'; job: GenerationJob; sortDate: number }
  | { kind: 'video'; job: VideoJob; sortDate: number };

const statusIcon: Record<GenJobStatus, React.ReactNode> = {
  queued: <Clock size={14} aria-hidden="true" />, waiting: <Clock size={14} aria-hidden="true" />, processing: '', retrying: <RefreshCw size={14} aria-hidden="true" />, completed: <CheckCircle2 size={14} aria-hidden="true" />, failed: <XCircle size={14} aria-hidden="true" />, cancelled: '',
};

interface ApprovalsJobListProps {
  visibleAiJobs: GenerationJob[];
  visibleVideoJobs: VideoJob[];
  contentType: ContentTypeFilter;
  openModal: (job: GenerationJob) => void;
  openVideoModal: (job: VideoJob) => void;
  cancelVideoJob: (id: string) => void;
  retryVideoJob: (id: string) => void;
  hasWorkflowInstances: boolean;
  /** Swipe-to-approve an AI job (task_id) */
  onSwipeApproveAi?: (taskId: string) => void;
  /** Swipe-to-reject an AI job (task_id) */
  onSwipeRejectAi?: (taskId: string) => void;
  /** Swipe-to-approve a video job (id) */
  onSwipeApproveVideo?: (jobId: string) => void;
  /** Swipe-to-reject a video job (id) */
  onSwipeRejectVideo?: (jobId: string) => void;
}

export function ApprovalsJobList({
  visibleAiJobs,
  visibleVideoJobs,
  contentType,
  openModal,
  openVideoModal,
  cancelVideoJob,
  retryVideoJob,
  hasWorkflowInstances,
  onSwipeApproveAi,
  onSwipeRejectAi,
  onSwipeApproveVideo,
  onSwipeRejectVideo,
}: ApprovalsJobListProps) {
  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];
    for (const job of visibleAiJobs) {
      if (contentType === 'ai_video' && job.output_type !== 'video') continue;
      if (contentType === 'ai_image' && job.output_type !== 'image') continue;
      if (contentType === 'lineup_video' || contentType === 'video_processing') continue;
      items.push({ kind: 'ai', job, sortDate: new Date(job.created_at).getTime() });
    }
    for (const vj of visibleVideoJobs) {
      if (contentType === 'ai_video' || contentType === 'ai_image') continue;
      if (contentType === 'lineup_video' && vj.job_type !== 'lineup') continue;
      if (contentType === 'video_processing' && vj.job_type === 'lineup') continue;
      items.push({ kind: 'video', job: vj, sortDate: new Date(vj.created_at).getTime() });
    }
    return items.sort((a, b) => b.sortDate - a.sortDate);
  }, [visibleAiJobs, visibleVideoJobs, contentType]);

  if (unifiedItems.length === 0) return null;

  return (
    <div className={`flex-col gap-8 ${styles.root}`} data-has-workflow={hasWorkflowInstances}>
      {unifiedItems.map(item => {
        if (item.kind === 'ai') {
          const job = item.job;
          const isActive = job.status === 'processing' || job.status === 'queued' || job.status === 'waiting' || job.status === 'retrying';
          const isReviewable = job.status === 'completed' && (job.approval_status === 'pending_review' || !job.approval_status);
          const isClickable = job.status === 'completed';
          const approvalData = job.approval_status === 'approved'
            ? { label: 'Goedgekeurd', attr: 'approved' as const }
            : job.approval_status === 'rejected'
            ? { label: 'Afgewezen', attr: 'rejected' as const }
            : job.status === 'completed' ? { label: 'Te beoordelen', attr: 'review' as const }
            : null;
          const outputType = job.output_type === 'video' ? 'video' : job.output_type === 'image' ? 'image' : 'ai';
          const typeBadgeLabel = job.output_type === 'video' ? 'AI VIDEO' : job.output_type === 'image' ? 'AI IMAGE' : 'AI';
          const borderState = job.status === 'failed' ? 'failed' : isReviewable ? 'reviewable' : 'default';
          const canSwipe = isReviewable && !!onSwipeApproveAi && !!onSwipeRejectAi;

          const aiCardEl = (
            <div
              key={canSwipe ? undefined : `ai-${job.task_id}`}
              onClick={() => isClickable && openModal(job)}
              {...(isClickable ? clickableProps(() => openModal(job)) : {})}
              className={`${styles.aiCard} rounded-10 transition`}
              data-clickable={isClickable}
              data-border={borderState}
            >
              <span className={`fs-20 ${s.jobStatusIcon}`}>{statusIcon[job.status]}</span>
              <div className="flex-1 min-w-0">
                <div className={s.jobLabel}>{job.label || job.template_id}</div>
                <div className={s.jobMeta}>
                  {job.output_type} · {new Date(job.created_at).toLocaleString()}
                  {job.provider && <> · <span className="fw-600">{job.provider}</span></>}
                  {job.model && <> · {job.model}</>}
                  {job.duration_seconds != null && <> · {job.duration_seconds < 60 ? `${Math.round(job.duration_seconds)}s` : `${Math.floor(job.duration_seconds / 60)}m ${Math.round(job.duration_seconds % 60)}s`}</>}
                  {(job.variant_count ?? 0) > 1 && <> · {job.variant_count} varianten</>}
                </div>
                {isActive && (
                  <div className={`${s.progressTrack} ${styles.aiProgressTrack}`}>
                    <div
                      className={styles.aiProgressBar}
                      data-has-progress={Boolean(job.progress)}
                      style={{ width: `${job.progress || 0}%` }}
                    />
                  </div>
                )}
                {job.status === 'failed' && job.error_message && (
                  <div className={s.errorInline}>{job.error_message}</div>
                )}
                {job.status === 'retrying' && (
                  <div className={`${s.errorInline} ${styles.warningText}`}>
                    <RefreshCw size={14} aria-hidden="true" /> AI model tijdelijk niet beschikbaar — wordt automatisch opnieuw geprobeerd…
                    {job.error_message && <> ({job.error_message.slice(0, 100)})</>}
                  </div>
                )}
              </div>
              <div className={s.badgesCol}>
                <span
                  className={`${styles.typeBadge} fw-700 rounded-full`}
                  data-type={outputType}
                >
                  {typeBadgeLabel}
                </span>
                <span
                  className={`${styles.aiStatusBadge} fw-700 rounded-full uppercase`}
                  data-status={job.status}
                >
                  {job.status}
                </span>
                {approvalData && (
                  <span
                    className={`${styles.approvalBadge} fw-700 rounded-full`}
                    data-approval={approvalData.attr}
                  >
                    {approvalData.label}
                  </span>
                )}
              </div>
              {isClickable && !canSwipe && <span className={s.chevron}>›</span>}
              {canSwipe && (
                <span className={styles.swipeHint}>↔</span>
              )}
            </div>
          );

          if (canSwipe) {
            return (
              <SwipeableCard
                key={`ai-${job.task_id}`}
                direction="both"
                threshold={80}
                onDismiss={(dir) => {
                  if (dir === 'right') onSwipeApproveAi!(job.task_id);
                  else onSwipeRejectAi!(job.task_id);
                }}
                className={styles.swipeWrapper}
                rightReveal={
                  <div className={styles.swipeRevealApprove}>
                    <Check size={22} strokeWidth={3} />
                    <span>Goedkeuren</span>
                  </div>
                }
                leftReveal={
                  <div className={styles.swipeRevealReject}>
                    <X size={22} strokeWidth={3} />
                    <span>Afwijzen</span>
                  </div>
                }
              >
                {aiCardEl}
              </SwipeableCard>
            );
          }

          return aiCardEl;
        } else {
          const vJob = item.job;
          const statusDisplay = getJobStatusDisplay(vJob.status);
          const typeDisplay = getJobTypeDisplay(vJob.job_type);
          const isActive = vJob.status === 'queued' || vJob.status === 'processing';
          const isClickable = vJob.status === 'completed';
          const isVideoReviewable = isClickable && vJob.workflow_instance?.current_state === 'ready_for_review';
          const canSwipeVideo = isVideoReviewable && !!onSwipeApproveVideo && !!onSwipeRejectVideo;
          const videoBorderState = vJob.status === 'failed' ? 'failed'
            : isActive ? 'active'
            : isVideoReviewable ? 'review'
            : 'default';

          const videoCardEl = (
            <div
              key={canSwipeVideo ? undefined : `video-${vJob.id}`}
              onClick={() => isClickable && openVideoModal(vJob)}
              {...(isClickable ? clickableProps(() => openVideoModal(vJob)) : {})}
              className={`${styles.videoCard} flex-col rounded-10 transition`}
              data-clickable={isClickable}
              data-border={videoBorderState}
            >
              <div className="flex-between">
                <div className="flex-row gap-8">
                  <span className="fs-18">{typeDisplay.icon}</span>
                  <span className="fw-600 fs-13 text-primary">{typeDisplay.label}</span>
                  <span className={s.jobShortId}>{vJob.id.slice(0, 8)}</span>
                </div>
                <div className="flex-row gap-6">
                  <span className={`${s.pillBadge} ${styles.videoTypePill}`}>
                    {vJob.job_type === 'lineup' ? 'LINEUP' : vJob.job_type === 'goal_celebration' ? 'GOAL' : 'VIDEO'}
                  </span>
                  <span
                    className={`${styles.videoStatusBadge} fw-700 rounded-full uppercase`}
                    data-status={vJob.status}
                  >
                    {statusDisplay.icon} {statusDisplay.label}
                  </span>
                </div>
              </div>

              {isActive && (
                <div className="flex-row gap-8">
                  <div className={s.progressTrackThick}>
                    <div
                      className={styles.videoProgressBar}
                      data-complete={vJob.progress_percent >= 100}
                      style={{ width: `${Math.min(vJob.progress_percent, 100)}%` }}
                    />
                  </div>
                  <span className={s.progressPercent}>{vJob.progress_percent}%</span>
                </div>
              )}

              <div className={s.metaRow}>
                <span>{new Date(vJob.created_at).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                {vJob.started_at && <span>Duur: {formatVideoDuration(vJob.started_at, vJob.completed_at)}</span>}
                {vJob.preset_name && <span>Preset: {vJob.preset_name}</span>}
                {vJob.retry_count > 0 && <span>Retries: {vJob.retry_count}</span>}
              </div>

              {vJob.error_message && (
                <div className={s.errorBordered}>{vJob.error_message}</div>
              )}

              {vJob.workflow_instance && (
                <div className={s.workflowInfo}>
                  Workflow: {vJob.workflow_instance.template_name} — {vJob.workflow_instance.current_state}
                  {vJob.workflow_instance.current_state === 'ready_for_review' && (
                    <span className={`${s.pillBadge} ${styles.workflowPillReview}`}>Te beoordelen</span>
                  )}
                  {vJob.workflow_instance.current_state === 'approved' && (
                    <span className={`${s.pillBadge} ${styles.workflowPillApproved}`}>Goedgekeurd</span>
                  )}
                  {vJob.workflow_instance.current_state === 'rejected' && (
                    <span className={`${s.pillBadge} ${styles.workflowPillRejected}`}>Afgewezen</span>
                  )}
                </div>
              )}

              {isClickable && !canSwipeVideo && (
                <div className={s.hintRow}>
                  <span className={s.hintText}>
                    {vJob.workflow_instance?.available_actions?.length ? 'Klik om te beoordelen' : 'Klik voor preview'}
                  </span>
                  <span className={s.chevron}>›</span>
                </div>
              )}
              {canSwipeVideo && (
                <div className={s.hintRow}>
                  <span className={s.hintText}>Swipe om te beoordelen</span>
                  <span className={styles.swipeHint}>↔</span>
                </div>
              )}

              {(isActive || vJob.status === 'failed') && (
                <div className={s.actionsRow}>
                  {isActive && (
                    <button onClick={(e) => { e.stopPropagation(); cancelVideoJob(vJob.id); }} className={s.btnCancel}>Cancel</button>
                  )}
                  {vJob.status === 'failed' && (
                    <button onClick={(e) => { e.stopPropagation(); retryVideoJob(vJob.id); }} className={s.btnRetry}>Retry</button>
                  )}
                </div>
              )}
            </div>
          );

          if (canSwipeVideo) {
            return (
              <SwipeableCard
                key={`video-${vJob.id}`}
                direction="both"
                threshold={80}
                onDismiss={(dir) => {
                  if (dir === 'right') onSwipeApproveVideo!(vJob.id);
                  else onSwipeRejectVideo!(vJob.id);
                }}
                className={styles.swipeWrapper}
                rightReveal={
                  <div className={styles.swipeRevealApprove}>
                    <Check size={22} strokeWidth={3} />
                    <span>Goedkeuren</span>
                  </div>
                }
                leftReveal={
                  <div className={styles.swipeRevealReject}>
                    <X size={22} strokeWidth={3} />
                    <span>Afwijzen</span>
                  </div>
                }
              >
                {videoCardEl}
              </SwipeableCard>
            );
          }

          return videoCardEl;
        }
      })}
    </div>
  );
}
