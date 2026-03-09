/**
 * ActiveJobsModal — View and manage active processing jobs
 *
 * Shows all membership variants currently being processed (intro/celebration videos).
 * Allows monitoring progress and cancelling jobs.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Button } from '@django-core/design-system';
import { Modal } from '../ui';
import { api } from '@/api';
import styles from './ActiveJobsModal.module.css';

// ============================================================================
// Types
// ============================================================================

interface ActiveJob {
  membership_id: string;
  member_name: string;
  asset_type: string;
  kit_type: string;
  variant_id: string | null;
  processing_state: 'processing' | 'cancelling';
  progress_frames: number | null;
  total_frames: number | null;
  processing_started_at: string | null;
  raw_url: string | null;
}

interface ActiveJobsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

// ============================================================================
// Styles
// ============================================================================


// ============================================================================
// Component
// ============================================================================

export const ActiveJobsModal: React.FC<ActiveJobsModalProps> = ({
  isOpen,
  onClose,
  projectId,
}) => {
  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<any>('/video/jobs/active-processing-jobs/', {
        params: { project: projectId },
      });
      setJobs(data.jobs || []);
    } catch (err) {
      console.error(err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Poll for updates every 5 seconds when open
  useEffect(() => {
    if (!isOpen) return;
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [isOpen, fetchJobs]);

  const cancelJob = useCallback(
    async (job: ActiveJob) => {
      const jobKey = `${job.membership_id}-${job.asset_type}-${job.kit_type}-${job.variant_id}`;
      setCancellingIds((prev) => new Set(prev).add(jobKey));

      try {
        await api.post('/video/jobs/cancel-asset-processing/', {
          membership_id: job.membership_id,
          asset_type: job.asset_type,
          kit_type: job.kit_type,
          variant_id: job.variant_id,
        });
        // Refresh immediately
        await fetchJobs();
      } catch (err) {
        console.error(err);
        console.error('Error cancelling job:', err);
      } finally {
        setCancellingIds((prev) => {
          const next = new Set(prev);
          next.delete(jobKey);
          return next;
        });
      }
    },
    [projectId, fetchJobs]
  );

  const cancelAllJobs = useCallback(async () => {
    // Cancel all jobs in parallel
    await Promise.all(jobs.filter((j) => j.processing_state === 'processing').map(cancelJob));
  }, [jobs, cancelJob]);

  if (!isOpen) return null;

  const getJobKey = (job: ActiveJob) =>
    `${job.membership_id}-${job.asset_type}-${job.kit_type}-${job.variant_id}`;

  const getAssetLabel = (assetType: string) => {
    switch (assetType) {
      case 'intro':
        return 'Short Intro';
      case 'celebration':
        return 'Celebration';
      case 'fullbody':
        return 'Fullbody';
      case 'closeup':
        return 'Close-up';
      default:
        return assetType;
    }
  };

  const getProgress = (job: ActiveJob) => {
    if (job.progress_frames && job.total_frames && job.total_frames > 0) {
      return Math.round((job.progress_frames / job.total_frames) * 100);
    }
    return null;
  };

  const formatStartTime = (isoString: string | null) => {
    if (!isoString) return null;
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'zojuist gestart';
      if (diffMins < 60) return `${diffMins} min geleden`;
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} uur geleden`;
    } catch {
      return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<><span className="fs-20">⚙️</span> Actieve Jobs <Badge variant="info">{jobs.length} actief</Badge></>}
      size="md"
      footer={
        <>
          {jobs.filter((j) => j.processing_state === 'processing').length > 1 && (
            <Button variant="outline" onClick={cancelAllJobs}>
              Alles annuleren
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            Sluiten
          </Button>
        </>
      }
    >
          {loading && jobs.length === 0 && (
            <div className={`text-center ${styles.loadingState}`}>
              Laden...
            </div>
          )}

          {error && (
            <div
              className={`py-12 px-16 rounded-8 mb-16 ${styles.errorAlert}`}
            >
              {error}
            </div>
          )}

          {!loading && jobs.length === 0 && !error && (
            <div
              className={`text-center ${styles.emptyState}`}
            >
              <div className={`mb-12 ${styles.emptyIcon}`}></div>
              Geen actieve verwerkingsjobs
            </div>
          )}

          {jobs.map((job) => {
            const jobKey = getJobKey(job);
            const isCancelling = cancellingIds.has(jobKey) || job.processing_state === 'cancelling';
            const progress = getProgress(job);
            const startTime = formatStartTime(job.processing_started_at);

            return (
              <div key={jobKey} className={styles.jobRow}>
                {/* Info */}
                <div className="flex-1-min">
                  <div className="fs-14 fw-500 mb-4">
                    {job.member_name}
                  </div>
                  <div className={`fs-12 ${styles.jobSubtext}`}>
                    {getAssetLabel(job.asset_type)} • {job.kit_type}
                    {job.variant_id && ` • ${job.variant_id.replace(/_/g, ' ')}`}
                    {startTime && ` • ${startTime}`}
                  </div>
                </div>

                {/* Progress */}
                <div className={`flex-row gap-10 ${styles.progressArea}`}>
                  {progress !== null ? (
                    <>
                      <div className={styles.progressBarContainer}>
                        <div
                          className={`h-full ${styles.progressFill}`}
                          data-cancelling={isCancelling ? 'true' : undefined}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className={`fs-12 ${styles.progressText}`}>
                        {progress}%
                      </span>
                    </>
                  ) : (
                    <Badge variant={isCancelling ? 'warning' : 'info'}>
                      {isCancelling ? 'Bezig met annuleren...' : 'Bezig...'}
                    </Badge>
                  )}
                </div>

                {/* Cancel button */}
                {job.processing_state === 'processing' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancelJob(job)}
                    disabled={isCancelling}
                    className={styles.cancelBtn}
                  >
                    Annuleren
                  </Button>
                )}
              </div>
            );
          })}

      {/* Info notice */}
      {jobs.length > 0 && (
        <div
          className={`mt-16 py-12 px-16 rounded-8 fs-13 ${styles.infoNotice}`}
        >
          💡 Video processing draait op de server. Je kunt dit venster sluiten - de verwerking gaat door.
          De pagina wordt elke 5 seconden automatisch vernieuwd.
        </div>
      )}
    </Modal>
  );
};

export default ActiveJobsModal;
