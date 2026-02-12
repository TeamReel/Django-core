/**
 * VideoQueuePage — Video processing job queue dashboard (B55).
 *
 * Shows all video jobs for the current project with real-time progress,
 * status filtering, and cancel/retry actions.
 *
 * Route: /studio/videos
 * Sidebar: CONTENT section
 */
import { useState, useMemo } from 'react';
import { PageContent, PageHeader } from '@django-core/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  useVideoJobs,
  getJobStatusDisplay,
  getJobTypeDisplay,
  type VideoJobStatus,
  type VideoJob,
} from '../../hooks/useVideoJobs';

type FilterStatus = 'all' | VideoJobStatus;

const STATUS_FILTERS: { value: FilterStatus; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '📋' },
  { value: 'queued', label: 'Queued', icon: '⏳' },
  { value: 'processing', label: 'Processing', icon: '🔄' },
  { value: 'completed', label: 'Completed', icon: '✅' },
  { value: 'failed', label: 'Failed', icon: '❌' },
  { value: 'cancelled', label: 'Cancelled', icon: '🚫' },
];

function formatDuration(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return '—';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const sec = Math.round((e - s) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remainSec = sec % 60;
  return `${min}m ${remainSec}s`;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Progress Bar Component ──────────────────────────────────────────────────

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div style={{
      width: '100%',
      height: 6,
      borderRadius: 3,
      backgroundColor: 'var(--app-border, #e5e7eb)',
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${Math.min(percent, 100)}%`,
        height: '100%',
        borderRadius: 3,
        backgroundColor: percent >= 100 ? '#059669' : '#2563eb',
        transition: 'width 0.5s ease-out',
      }} />
    </div>
  );
}

// ── Job Card Component ──────────────────────────────────────────────────────

function JobCard({
  job,
  onCancel,
  onRetry,
}: {
  job: VideoJob;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const statusDisplay = getJobStatusDisplay(job.status);
  const typeDisplay = getJobTypeDisplay(job.job_type);
  const isActive = job.status === 'queued' || job.status === 'processing';

  return (
    <div style={{
      padding: 16,
      borderRadius: 10,
      border: '1px solid var(--app-border, #e5e7eb)',
      backgroundColor: 'var(--app-surface-2, #fff)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{typeDisplay.icon}</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--app-text)' }}>
            {typeDisplay.label}
          </span>
          <span style={{
            fontSize: 11,
            fontFamily: 'monospace',
            color: 'var(--app-text-secondary, #6b7280)',
          }}>
            {job.id.slice(0, 8)}
          </span>
        </div>

        <span style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '3px 10px',
          borderRadius: 12,
          color: statusDisplay.color,
          backgroundColor: statusDisplay.bgColor,
        }}>
          {statusDisplay.icon} {statusDisplay.label}
        </span>
      </div>

      {/* Progress bar for active jobs */}
      {isActive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <ProgressBar percent={job.progress_percent} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--app-text-secondary, #6b7280)', minWidth: 32 }}>
            {job.progress_percent}%
          </span>
        </div>
      )}

      {/* Meta row */}
      <div style={{
        display: 'flex',
        gap: 16,
        fontSize: 12,
        color: 'var(--app-text-secondary, #6b7280)',
        flexWrap: 'wrap',
      }}>
        <span>Created: {formatTime(job.created_at)}</span>
        {job.started_at && (
          <span>Duration: {formatDuration(job.started_at, job.completed_at)}</span>
        )}
        {job.preset_name && <span>Preset: {job.preset_name}</span>}
        {job.retry_count > 0 && <span>Retries: {job.retry_count}</span>}
      </div>

      {/* Error message */}
      {job.error_message && (
        <div style={{
          fontSize: 12,
          color: '#dc2626',
          backgroundColor: '#fef2f2',
          padding: '8px 12px',
          borderRadius: 6,
          borderLeft: '3px solid #dc2626',
        }}>
          {job.error_message}
        </div>
      )}

      {/* Workflow info */}
      {job.workflow_instance && (
        <div style={{
          fontSize: 11,
          color: 'var(--app-text-secondary, #6b7280)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          🔄 Workflow: {job.workflow_instance.template_name} — {job.workflow_instance.current_state}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {job.status === 'queued' && (
          <button
            onClick={() => onCancel(job.id)}
            style={{
              fontSize: 12,
              padding: '5px 12px',
              borderRadius: 6,
              border: '1px solid #dc2626',
              backgroundColor: 'transparent',
              color: '#dc2626',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}
        {job.status === 'failed' && (
          <button
            onClick={() => onRetry(job.id)}
            style={{
              fontSize: 12,
              padding: '5px 12px',
              borderRadius: 6,
              border: '1px solid #2563eb',
              backgroundColor: '#2563eb',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function VideoQueuePage() {
  const { context } = useContextSwitcher();
  const projectId = context.project?.id;

  const [filter, setFilter] = useState<FilterStatus>('all');

  const { jobs, loading, error, refresh, cancelJob, retryJob } = useVideoJobs({
    projectId: projectId || 0,
  });

  // Filter + sort
  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (filter !== 'all') {
      result = result.filter(j => j.status === filter);
    }
    return result;
  }, [jobs, filter]);

  // Counts per status
  const counts = useMemo(() => ({
    all: jobs.length,
    queued: jobs.filter(j => j.status === 'queued').length,
    processing: jobs.filter(j => j.status === 'processing').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    cancelled: jobs.filter(j => j.status === 'cancelled').length,
  }), [jobs]);

  if (!projectId) {
    return (
      <>
        <PageHeader
          title="Video Queue"
          subtitle="Select a project to view video processing jobs."
          actions={null}
        />
        <PageContent>
          <div style={{
            textAlign: 'center',
            padding: 60,
            color: 'var(--app-text-secondary, #6b7280)',
          }}>
            Select a project from the context switcher to view video jobs.
          </div>
        </PageContent>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Video Queue"
        subtitle={`${counts.processing} processing, ${counts.queued} queued — real-time progress tracking`}
        actions={
          <button
            onClick={refresh}
            style={{
              fontSize: 12,
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid var(--app-border, #e5e7eb)',
              backgroundColor: 'transparent',
              color: 'var(--app-text, #111)',
              cursor: 'pointer',
            }}
          >
            ↻ Refresh
          </button>
        }
      />

      <PageContent>
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              style={{
                fontSize: 12,
                padding: '5px 12px',
                borderRadius: 16,
                border: `1px solid ${filter === opt.value ? '#2563eb' : 'var(--app-border, #e5e7eb)'}`,
                backgroundColor: filter === opt.value ? '#dbeafe' : 'transparent',
                color: filter === opt.value ? '#2563eb' : 'var(--app-text-secondary, #6b7280)',
                cursor: 'pointer',
                fontWeight: filter === opt.value ? 600 : 400,
              }}
            >
              {opt.icon} {opt.label} ({counts[opt.value]})
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && jobs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--app-text-secondary, #6b7280)' }}>
            Loading video jobs...
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            fontSize: 13,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredJobs.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: 60,
            color: 'var(--app-text-secondary, #6b7280)',
          }}>
            <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🎬</span>
            <p style={{ fontSize: 14, marginBottom: 4 }}>No video jobs {filter !== 'all' ? `with status "${filter}"` : ''}</p>
            <p style={{ fontSize: 12 }}>Video jobs appear here when content is generated with video output.</p>
          </div>
        )}

        {/* Job list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onCancel={cancelJob}
              onRetry={retryJob}
            />
          ))}
        </div>
      </PageContent>
    </>
  );
}
