/**
 * Unified job list: AI generation + video processing jobs interleaved by date.
 */
import { useMemo } from 'react';
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

const statusIcon: Record<GenJobStatus, string> = {
  queued: '⏳', waiting: '⏳', processing: '', completed: '✅', failed: '❌', cancelled: '',
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
          const isActive = job.status === 'processing' || job.status === 'queued' || job.status === 'waiting';
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

          return (
            <div
              key={`ai-${job.task_id}`}
              onClick={() => isClickable && openModal(job)}
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
              {isClickable && <span className={s.chevron}>›</span>}
            </div>
          );
        } else {
          const vJob = item.job;
          const statusDisplay = getJobStatusDisplay(vJob.status);
          const typeDisplay = getJobTypeDisplay(vJob.job_type);
          const isActive = vJob.status === 'queued' || vJob.status === 'processing';
          const isClickable = vJob.status === 'completed';
          const videoBorderState = vJob.status === 'failed' ? 'failed'
            : isActive ? 'active'
            : isClickable && vJob.workflow_instance?.current_state === 'ready_for_review' ? 'review'
            : 'default';

          return (
            <div
              key={`video-${vJob.id}`}
              onClick={() => isClickable && openVideoModal(vJob)}
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
                  🔄 Workflow: {vJob.workflow_instance.template_name} — {vJob.workflow_instance.current_state}
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

              {isClickable && (
                <div className={s.hintRow}>
                  <span className={s.hintText}>
                    {vJob.workflow_instance?.available_actions?.length ? 'Klik om te beoordelen' : 'Klik voor preview'}
                  </span>
                  <span className={s.chevron}>›</span>
                </div>
              )}

              {(isActive || vJob.status === 'failed') && (
                <div className={s.actionsRow}>
                  {isActive && (
                    <button onClick={() => cancelVideoJob(vJob.id)} className={s.btnCancel}>Cancel</button>
                  )}
                  {vJob.status === 'failed' && (
                    <button onClick={() => retryVideoJob(vJob.id)} className={s.btnRetry}>Retry</button>
                  )}
                </div>
              )}
            </div>
          );
        }
      })}
    </div>
  );
}
