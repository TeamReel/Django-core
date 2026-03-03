/**
 * ActiveJobsModal — View and manage active processing jobs
 *
 * Shows all membership variants currently being processed (intro/celebration videos).
 * Allows monitoring progress and cancelling jobs.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Button } from '@django-core/design-system';
import { Modal } from '../ui';
import { getApiBaseUrl } from '../../utils/apiBase';

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

import { getCsrfToken } from '../../utils/csrf';

// ============================================================================
// Styles
// ============================================================================



const jobRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 14px',
  borderRadius: '8px',
  border: '1px solid var(--app-border, #333)',
  marginBottom: '8px',
  background: 'var(--app-surface-2, #252540)',
};

const progressBarContainerStyle: React.CSSProperties = {
  height: '6px',
  borderRadius: '3px',
  background: 'var(--app-border, #333)',
  overflow: 'hidden',
  flex: 1,
  minWidth: '80px',
};

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

  const apiBase = getApiBaseUrl();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase}/api/v1/video/jobs/active-processing-jobs/?project=${projectId}`,
        {
          credentials: 'include',
          headers: {
            'X-Project-ID': projectId,
          },
        }
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch active jobs: ${res.status}`);
      }
      const json = await res.json();
      // Handle API envelope: { status, data: { jobs: [...] } }
      const data = json.data || json;
      setJobs(data.jobs || []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [apiBase, projectId]);

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
        const res = await fetch(`${apiBase}/api/v1/video/jobs/cancel-asset-processing/`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
            'X-Project-ID': projectId,
          },
          body: JSON.stringify({
            membership_id: job.membership_id,
            asset_type: job.asset_type,
            kit_type: job.kit_type,
            variant_id: job.variant_id,
          }),
        });
        if (!res.ok) {
          console.error('Failed to cancel job:', await res.text());
        }
        // Refresh immediately
        await fetchJobs();
      } catch (err) {
        console.error('Error cancelling job:', err);
      } finally {
        setCancellingIds((prev) => {
          const next = new Set(prev);
          next.delete(jobKey);
          return next;
        });
      }
    },
    [apiBase, projectId, fetchJobs]
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
            <div className="text-center" style={{ color: 'var(--app-muted-text, #888)', padding: '40px' }}>
              Laden...
            </div>
          )}

          {error && (
            <div
              className="py-12 px-16 rounded-8 mb-16"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--color-red-500)',
              }}
            >
              {error}
            </div>
          )}

          {!loading && jobs.length === 0 && !error && (
            <div
              className="text-center"
              style={{
                color: 'var(--app-muted-text, #888)',
                padding: '40px',
              }}
            >
              <div className="mb-12" style={{ fontSize: '32px' }}>✅</div>
              Geen actieve verwerkingsjobs
            </div>
          )}

          {jobs.map((job) => {
            const jobKey = getJobKey(job);
            const isCancelling = cancellingIds.has(jobKey) || job.processing_state === 'cancelling';
            const progress = getProgress(job);
            const startTime = formatStartTime(job.processing_started_at);

            return (
              <div key={jobKey} style={jobRowStyle}>
                {/* Info */}
                <div className="flex-1-min">
                  <div className="fs-14 fw-500 mb-4">
                    {job.member_name}
                  </div>
                  <div className="fs-12" style={{ color: 'var(--app-muted-text, #888)' }}>
                    {getAssetLabel(job.asset_type)} • {job.kit_type}
                    {job.variant_id && ` • ${job.variant_id.replace(/_/g, ' ')}`}
                    {startTime && ` • ${startTime}`}
                  </div>
                </div>

                {/* Progress */}
                <div className="flex-row gap-10" style={{ minWidth: '150px' }}>
                  {progress !== null ? (
                    <>
                      <div style={progressBarContainerStyle}>
                        <div
                          className="h-full"
                          style={{
                            width: `${progress}%`,
                            background: isCancelling ? 'var(--color-amber-400)' : 'var(--color-blue-500)',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <span className="fs-12" style={{ color: 'var(--app-muted-text, #888)', minWidth: '40px' }}>
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
                    style={{ flexShrink: 0 }}
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
          className="mt-16 py-12 px-16 rounded-8 fs-13"
          style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#60a5fa',
          }}
        >
          💡 Video processing draait op de server. Je kunt dit venster sluiten - de verwerking gaat door.
          De pagina wordt elke 5 seconden automatisch vernieuwd.
        </div>
      )}
    </Modal>
  );
};

export default ActiveJobsModal;
