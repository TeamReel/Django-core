/**
 * Video Review Modal for video processing jobs.
 */
import { useState } from 'react';
import {
  type VideoJob,
  getJobStatusDisplay,
  getJobTypeDisplay,
} from '../hooks/useVideoJobs';
import s from './ApprovalsPage.module.css';
import styles from './ReviewModals.module.css';
import { getErrorMessage } from '../utils/errorHelpers';
import { logger } from '@/utils/logger';

interface VideoReviewModalProps {
  job: VideoJob;
  onClose: () => void;
  onActionComplete: () => void;
  pushToast: (msg: string, type: 'success' | 'error') => void;
  approveJob: (jobId: string) => Promise<void>;
  rejectJob: (jobId: string) => Promise<void>;
}

export function VideoReviewModal({ job, onClose, onActionComplete, pushToast, approveJob, rejectJob }: VideoReviewModalProps) {
  const [reviewing, setReviewing] = useState<'approve' | 'reject' | null>(null);
  const wf = job.workflow_instance;
  const metaStatus = job.metadata?.approval_status;
  const isApproved = wf?.current_state === 'approved' || metaStatus === 'approved';
  const isRejected = wf?.current_state === 'rejected' || metaStatus === 'rejected';
  const isCompleted = job.status === 'completed';
  const isCanReview = isCompleted && !isApproved && !isRejected;

  const handleAction = async (action: 'approve' | 'reject') => {
    setReviewing(action);
    try {
      if (action === 'approve') {
        await approveJob(job.id);
      } else {
        await rejectJob(job.id);
      }
      pushToast(
        action === 'approve' ? '✅ Video goedgekeurd' : '✘ Video afgewezen',
        'success'
      );
      onActionComplete();
    } catch (err: unknown) {
      logger.error('Video review action failed', err);
      pushToast(getErrorMessage(err) || `Actie "${action}" mislukt`, 'error');
    } finally {
      setReviewing(null);
    }
  };

  const typeDisplay = getJobTypeDisplay(job.job_type);

  return (
    <div
      className={s.modalOverlay}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`${s.modalPanel} ${styles.modalPanel}`}>
        <div className={s.modalHeader}>
          <div className="flex-1">
            <div className={s.modalTitle15}>{typeDisplay.icon} {typeDisplay.label}</div>
            <div className={s.modalSubtitle11}>
              video · {new Date(job.created_at).toLocaleString('nl-NL')}
              {job.preset_name && <> · Preset: {job.preset_name}</>}
            </div>
          </div>
          <button onClick={onClose} className={s.closeBtn}>&times;</button>
        </div>

        <div className={s.previewArea}>
          {job.output_url ? (
            <video
              src={job.output_url}
              controls
              autoPlay
              playsInline
              className={s.previewVideo}
              poster={job.thumbnail_url || undefined}
            />
          ) : (
            <div className={s.emptyGallery}>
              <div className={s.emptyIcon}>🎬</div>
              <div>Video preview niet beschikbaar</div>
            </div>
          )}
        </div>

        <div className={s.modalFooter}>
          {isApproved && <div className={s.reviewApproved}>✔ Goedgekeurd</div>}
          {isRejected && <div className={s.reviewRejected}>✘ Afgewezen</div>}
          {isCanReview && <div className="flex-1" />}
          {!isCanReview && !isApproved && !isRejected && (
            <div className={s.reviewStatus}>Status: {job.status}</div>
          )}
          {isCanReview && (
            <>
              <button
                onClick={() => handleAction('reject')}
                disabled={!!reviewing}
                className={`${s.btnReject} ${styles.footerRejectBtn}`}
                data-state={reviewing === 'reject' ? 'active' : reviewing ? 'inactive' : 'idle'}
              >
                {reviewing === 'reject' ? '...' : '✘ Afwijzen'}
              </button>
              <button
                onClick={() => handleAction('approve')}
                disabled={!!reviewing}
                className={`${s.btnApprove} ${styles.footerApproveBtn}`}
                data-state={reviewing === 'approve' ? 'active' : reviewing ? 'inactive' : 'idle'}
              >
                {reviewing === 'approve' ? '...' : '✔ Goedkeuren'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
