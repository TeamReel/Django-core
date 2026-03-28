/**
 * Video job card components for AIStudioPage
 */
import React from 'react';
import { CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import type { VideoJobSummary } from './useStudioData';
import styles from './StudioJobComponents.module.css';

// ============================================================================
// Utility
// ============================================================================

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Zojuist';
  if (diffMin < 60) return `${diffMin} min geleden`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} uur geleden`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'dag' : 'dagen'} geleden`;
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function getJobTypeLabel(jobType: string): string {
  const labels: Record<string, string> = {
    lineup: 'Lineup Video',
    goal_celebration: 'Goal Celebration',
    match_intro: 'Match Intro',
    then_vs_now: 'Toen vs Nu',
    transcode: 'Transcode',
    compose: 'Compositie',
    thumbnail: 'Thumbnail',
  };
  return labels[jobType] || jobType;
}

// ============================================================================
// VideoJobCard — Active or recently completed video job
// ============================================================================

export function VideoJobCard({ job }: { job: VideoJobSummary }) {
  const isActive = job.status === 'queued' || job.status === 'processing';
  const isFailed = job.status === 'failed';
  const isCompleted = job.status === 'completed';

  return (
    <div className={styles.jobCard} data-status={job.status}>
      {/* Status icon */}
      <div className={styles.jobIcon}>
        {isActive && <Loader2 size={18} className={styles.jobSpinner} />}
        {isCompleted && <CheckCircle2 size={18} />}
        {isFailed && <AlertCircle size={18} />}
        {job.status === 'cancelled' && <X size={18} />}
      </div>

      {/* Info */}
      <div className={styles.jobInfo}>
        <span className={styles.jobType}>{getJobTypeLabel(job.job_type)}</span>
        <span className={styles.jobMeta}>
          {isActive && job.progress_percent > 0
            ? `${Math.round(job.progress_percent)}%`
            : isActive ? 'Wachtrij...' : ''}
          {isFailed && (job.error_message ? job.error_message.slice(0, 80) : 'Mislukt')}
          {isCompleted && formatRelativeDate(job.completed_at || job.created_at)}
        </span>
      </div>

      {/* Progress bar for active jobs */}
      {isActive && (
        <div className={styles.jobProgress}>
          <div className={styles.jobProgressFill} style={{ width: `${job.progress_percent || 5}%` }} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ActiveJobsStrip — Shows processing/queued jobs at top
// ============================================================================

export function ActiveJobsStrip({ jobs }: { jobs: VideoJobSummary[] }) {
  if (jobs.length === 0) return null;

  return (
    <div className={styles.activeJobsStrip}>
      <div className={styles.activeJobsHeader}>
        <Loader2 size={14} className={styles.jobSpinner} />
        <span className={styles.activeJobsTitle}>
          {jobs.length} video{jobs.length > 1 ? "'s" : ''} in verwerking
        </span>
      </div>
      <div className={styles.activeJobsList}>
        {jobs.map((job) => (
          <VideoJobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
