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

type UnifiedItem =
  | { kind: 'ai'; job: GenerationJob; sortDate: number }
  | { kind: 'video'; job: VideoJob; sortDate: number };

const statusIcon: Record<GenJobStatus, string> = {
  queued: '⏳', waiting: '⏳', processing: '', completed: '✅', failed: '❌', cancelled: '',
};
const statusColor: Record<GenJobStatus, string> = {
  queued: 'var(--app-muted-text)', waiting: 'var(--app-muted-text)', processing: 'var(--color-blue-600)', completed: '#16a34a', failed: '#dc2626', cancelled: '#9ca3af',
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
    <div className="flex-col gap-8" style={{ marginBottom: hasWorkflowInstances ? 24 : 0 }}>
      {unifiedItems.map(item => {
        if (item.kind === 'ai') {
          const job = item.job;
          const isActive = job.status === 'processing' || job.status === 'queued' || job.status === 'waiting';
          const isReviewable = job.status === 'completed' && (job.approval_status === 'pending_review' || !job.approval_status);
          const approvalBadge = job.approval_status === 'approved'
            ? { label: 'Goedgekeurd', color: '#16a34a' }
            : job.approval_status === 'rejected'
            ? { label: 'Afgewezen', color: '#dc2626' }
            : job.status === 'completed' ? { label: 'Te beoordelen', color: '#d97706' }
            : null;
          const typeBadgeColor = job.output_type === 'video' ? '#8b5cf6' : job.output_type === 'image' ? '#d946ef' : '#6366f1';
          const typeBadgeLabel = job.output_type === 'video' ? 'AI VIDEO' : job.output_type === 'image' ? 'AI IMAGE' : 'AI';

          return (
            <div
              key={`ai-${job.task_id}`}
              onClick={() => job.status === 'completed' && openModal(job)}
              style={{
                padding: '14px 16px', backgroundColor: 'var(--app-surface, #fff)', borderRadius: 10,
                border: `1px solid ${job.status === 'failed' ? '#fca5a5' : isReviewable ? '#fde68a' : 'var(--app-border, #e5e7eb)'}`,
                transition: 'box-shadow 0.15s', cursor: job.status === 'completed' ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', gap: 14,
              }}
              onMouseEnter={e => { if (job.status === 'completed') e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.09)'; }}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
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
                  <div className={s.progressTrack} style={{ marginTop: 6 }}>
                    <div style={{ height: '100%', width: `${job.progress || 0}%`, backgroundColor: 'var(--color-blue-600)', borderRadius: 99, transition: 'width 0.4s ease', minWidth: job.progress ? 0 : '8%' }} />
                  </div>
                )}
                {job.status === 'failed' && job.error_message && (
                  <div className={s.errorInline}>{job.error_message}</div>
                )}
              </div>
              <div className={s.badgesCol}>
                <span style={{ fontSize: 10, fontWeight: 700, color: typeBadgeColor, backgroundColor: `${typeBadgeColor}18`, borderRadius: 99, padding: '2px 8px', letterSpacing: '0.04em' }}>
                  {typeBadgeLabel}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: statusColor[job.status], backgroundColor: `${statusColor[job.status]}18`, borderRadius: 99, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {job.status}
                </span>
                {approvalBadge && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: approvalBadge.color, backgroundColor: `${approvalBadge.color}18`, borderRadius: 99, padding: '2px 8px' }}>
                    {approvalBadge.label}
                  </span>
                )}
              </div>
              {job.status === 'completed' && <span className={s.chevron}>›</span>}
            </div>
          );
        } else {
          const vJob = item.job;
          const statusDisplay = getJobStatusDisplay(vJob.status);
          const typeDisplay = getJobTypeDisplay(vJob.job_type);
          const isActive = vJob.status === 'queued' || vJob.status === 'processing';
          const isClickable = vJob.status === 'completed';

          return (
            <div
              key={`video-${vJob.id}`}
              onClick={() => isClickable && openVideoModal(vJob)}
              style={{
                padding: '14px 16px', backgroundColor: 'var(--app-surface, #fff)', borderRadius: 10,
                border: `1px solid ${vJob.status === 'failed' ? '#fca5a5' : isActive ? '#93c5fd' : isClickable && vJob.workflow_instance?.current_state === 'ready_for_review' ? '#fde68a' : 'var(--app-border, #e5e7eb)'}`,
                display: 'flex', flexDirection: 'column', gap: 10,
                cursor: isClickable ? 'pointer' : 'default',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => { if (isClickable) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.09)'; }}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div className="flex-between">
                <div className="flex-row gap-8">
                  <span className="fs-18">{typeDisplay.icon}</span>
                  <span className="fw-600 fs-13 text-primary">{typeDisplay.label}</span>
                  <span className={s.jobShortId}>{vJob.id.slice(0, 8)}</span>
                </div>
                <div className="flex-row gap-6">
                  <span className={s.pillBadge} style={{ color: '#0891b2', background: '#0891b218' }}>
                    {vJob.job_type === 'lineup' ? 'LINEUP' : vJob.job_type === 'goal_celebration' ? 'GOAL' : 'VIDEO'}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, color: statusDisplay.color, backgroundColor: `${statusDisplay.color}18`, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {statusDisplay.icon} {statusDisplay.label}
                  </span>
                </div>
              </div>

              {isActive && (
                <div className="flex-row gap-8">
                  <div className={s.progressTrackThick}>
                    <div style={{ width: `${Math.min(vJob.progress_percent, 100)}%`, height: '100%', borderRadius: 3, backgroundColor: vJob.progress_percent >= 100 ? '#059669' : 'var(--color-blue-600)', transition: 'width 0.5s ease-out' }} />
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
                    <span className={s.pillBadge} style={{ color: '#d97706', background: '#d9770618' }}>Te beoordelen</span>
                  )}
                  {vJob.workflow_instance.current_state === 'approved' && (
                    <span className={s.pillBadge} style={{ color: '#16a34a', background: '#16a34a18' }}>Goedgekeurd</span>
                  )}
                  {vJob.workflow_instance.current_state === 'rejected' && (
                    <span className={s.pillBadge} style={{ color: '#dc2626', background: '#dc262618' }}>Afgewezen</span>
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
