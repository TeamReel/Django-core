/**
 * ActiveJobsModal — View and manage active processing jobs
 *
 * Shows all membership variants currently being processed (intro/celebration videos).
 * Allows monitoring progress and cancelling jobs.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Button } from '@django-core/design-system';
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

function getCsrfToken(): string {
  return (
    document.cookie
      .split('; ')
      .find((r) => r.startsWith('csrftoken='))
      ?.split('=')[1] || ''
  );
}

// ============================================================================
// Styles
// ============================================================================

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9000,
  background: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
};

const modalStyle: React.CSSProperties = {
  background: 'var(--app-surface, #1a1a2e)',
  borderRadius: '12px',
  width: '100%',
  maxWidth: '700px',
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  border: '1px solid var(--app-border, #333)',
};

const headerStyle: React.CSSProperties = {
  padding: '20px 24px',
  borderBottom: '1px solid var(--app-border, #333)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const bodyStyle: React.CSSProperties = {
  padding: '24px',
  overflowY: 'auto',
  flex: 1,
};

const footerStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderTop: '1px solid var(--app-border, #333)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '12px',
};

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
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚙️</span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Actieve Jobs</h2>
            <Badge variant="info">{jobs.length} actief</Badge>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--app-muted-text, #888)',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          {loading && jobs.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--app-muted-text, #888)', padding: '40px' }}>
              Laden...
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#ef4444',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          {!loading && jobs.length === 0 && !error && (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--app-muted-text, #888)',
                padding: '40px',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                    {job.member_name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--app-muted-text, #888)' }}>
                    {getAssetLabel(job.asset_type)} • {job.kit_type}
                    {job.variant_id && ` • ${job.variant_id.replace(/_/g, ' ')}`}
                    {startTime && ` • ${startTime}`}
                  </div>
                </div>

                {/* Progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '150px' }}>
                  {progress !== null ? (
                    <>
                      <div style={progressBarContainerStyle}>
                        <div
                          style={{
                            height: '100%',
                            width: `${progress}%`,
                            background: isCancelling ? '#f59e0b' : '#3b82f6',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--app-muted-text, #888)', minWidth: '40px' }}>
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
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#60a5fa',
              }}
            >
              💡 Video processing draait op de server. Je kunt dit venster sluiten - de verwerking gaat door.
              De pagina wordt elke 5 seconden automatisch vernieuwd.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          {jobs.filter((j) => j.processing_state === 'processing').length > 1 && (
            <Button variant="outline" onClick={cancelAllJobs}>
              Alles annuleren
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            Sluiten
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ActiveJobsModal;
