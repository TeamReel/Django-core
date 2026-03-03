/**
 * VideoQueuePage — Video processing job queue dashboard (B55).
 *
 * Shows all video jobs for the current project with real-time progress,
 * status filtering, and cancel/retry actions.
 *
 * Route: /studio/videos
 * Sidebar: CONTENT section
 */
import { useState, useMemo, useCallback } from 'react';
import { PullToRefresh } from '@django-core/design-system';
import { useLocation, useNavigate } from 'react-router-dom';
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
    <div className="w-full overflow-hidden" style={{
      height: 6,
      borderRadius: 3,
      backgroundColor: 'var(--app-border, #e5e7eb)',
    }}>
      <div className="h-full" style={{
        width: `${Math.min(percent, 100)}%`,
        borderRadius: 3,
        backgroundColor: percent >= 100 ? '#059669' : 'var(--color-blue-600)',
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
    <div className="p-16 flex-col gap-10 border bg-surface-2" style={{
      borderRadius: 10,
    }}>
      {/* Header row */}
      <div className="flex-between">
        <div className="flex-row gap-8">
          <span className="fs-18">{typeDisplay.icon}</span>
          <span className="fw-600 fs-14 text-primary">
            {typeDisplay.label}
          </span>
          <span className="fs-11 text-secondary" style={{
            fontFamily: 'monospace',
          }}>
            {job.id.slice(0, 8)}
          </span>
        </div>

        <span className="fs-11 fw-600 rounded-12" style={{
          padding: '3px 10px',
          color: statusDisplay.color,
          backgroundColor: statusDisplay.bgColor,
        }}>
          {statusDisplay.icon} {statusDisplay.label}
        </span>
      </div>

      {/* Progress bar for active jobs */}
      {isActive && (
        <div className="flex-row gap-8">
          <div className="flex-1">
            <ProgressBar percent={job.progress_percent} />
          </div>
          <span className="fs-11 text-secondary" style={{ minWidth: 32 }}>
            {job.progress_percent}%
          </span>
        </div>
      )}

      {/* Meta row */}
      <div className="flex-row flex-wrap gap-16 fs-12 text-secondary">
        <span>Created: {formatTime(job.created_at)}</span>
        {job.started_at && (
          <span>Duration: {formatDuration(job.started_at, job.completed_at)}</span>
        )}
        {job.preset_name && <span>Preset: {job.preset_name}</span>}
        {job.retry_count > 0 && <span>Retries: {job.retry_count}</span>}
      </div>

      {/* Error message */}
      {job.error_message && (
        <div className="fs-12 py-8 px-12 rounded-6" style={{
          color: '#dc2626',
          backgroundColor: '#fef2f2',
          borderLeft: '3px solid #dc2626',
        }}>
          {job.error_message}
        </div>
      )}

      {/* Workflow info */}
      {job.workflow_instance && (
        <div className="fs-11 text-secondary flex-row gap-6">
          🔄 Workflow: {job.workflow_instance.template_name} — {job.workflow_instance.current_state}
        </div>
      )}

      {/* Actions */}
        <div className="gap-8 flex-row" style={{ justifyContent: 'flex-end' }}>
        {(job.status === 'queued' || job.status === 'processing') && (
          <button
            onClick={() => onCancel(job.id)}
            className="fs-12 rounded-6 bg-transparent cursor-pointer"
            style={{
              padding: '5px 12px',
              border: '1px solid #dc2626',
              color: '#dc2626',
            }}
          >
            Cancel
          </button>
        )}
        {job.status === 'failed' && (
          <button
            onClick={() => onRetry(job.id)}
            className="fs-12 rounded-6 cursor-pointer text-white"
            style={{
              padding: '5px 12px',
              border: '1px solid #2563eb',
              backgroundColor: 'var(--color-blue-600)',
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
  const location = useLocation();
  const navigate = useNavigate();
  const projectId = context.project?.id;

  // Read filter from URL ?tab= (set by sidebar Panel B)
  const rawTab = new URLSearchParams(location.search).get('tab') || 'all';
  const filter: FilterStatus = (['all', 'queued', 'processing', 'completed', 'failed', 'cancelled'] as const).includes(rawTab as FilterStatus)
    ? (rawTab as FilterStatus)
    : 'all';
  const setFilter = (f: FilterStatus) => navigate(`/studio/videos?tab=${f}`, { replace: true });

  const { jobs, loading, error, refresh, cancelJob, retryJob } = useVideoJobs({
    projectId: projectId || null,
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

  return (
    <>
      <PageHeader
        title="Video Queue"
        subtitle={`${counts.processing} processing, ${counts.queued} queued${!projectId ? ' — showing all projects' : ''}`}
        actions={
          <button
            onClick={refresh}
            className="fs-12 rounded-6 bg-transparent cursor-pointer"
            style={{
              padding: '6px 14px',
              border: '1px solid var(--app-border, #e5e7eb)',
              color: 'var(--app-text, #111)',
            }}
          >
            ↻ Refresh
          </button>
        }
      />

      <PageContent>
        <PullToRefresh
          onRefresh={async () => { refresh(); }}
          pullText="Trek om te vernieuwen"
          releaseText="Laat los om te vernieuwen"
          refreshingText="Vernieuwen..."
        >
        {/* Filter bar */}
        <div className="flex-wrap gap-6 mb-16 flex-row">
          {STATUS_FILTERS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className="fs-12 cursor-pointer"
              style={{
                padding: '5px 12px',
                borderRadius: 16,
                border: `1px solid ${filter === opt.value ? 'var(--color-blue-600)' : 'var(--app-border, #e5e7eb)'}`,
                backgroundColor: filter === opt.value ? '#dbeafe' : 'transparent',
                color: filter === opt.value ? 'var(--color-blue-600)' : 'var(--app-text-secondary, #6b7280)',
                fontWeight: filter === opt.value ? 600 : 400,
              }}
            >
              {opt.icon} {opt.label} ({counts[opt.value]})
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && jobs.length === 0 && (
          <div className="text-center text-secondary" style={{ padding: 40 }}>
            Loading video jobs...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-12 rounded-8 fs-13 mb-16" style={{
            backgroundColor: '#fef2f2',
            color: '#dc2626',
          }}>
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredJobs.length === 0 && (
          <div className="text-center text-secondary" style={{
            padding: 60,
          }}>
            <span className="block mb-12" style={{ fontSize: 48 }}>🎬</span>
            <p className="fs-14 mb-4">No video jobs {filter !== 'all' ? `with status "${filter}"` : ''}</p>
            <p className="fs-12">Video jobs appear here when content is generated with video output.</p>
          </div>
        )}

        {/* Job list */}
        <div className="flex-col gap-10">
          {filteredJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onCancel={cancelJob}
              onRetry={retryJob}
            />
          ))}
        </div>
      </PullToRefresh>
      </PageContent>
    </>
  );
}
