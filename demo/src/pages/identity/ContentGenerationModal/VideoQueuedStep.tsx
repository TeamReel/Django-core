import React from 'react';
import { Button } from '@django-core/design-system';
import styles from './VideoQueuedStep.module.css';

interface VideoQueuedStepProps {
  videoOutputUrl: string | null;
  videoJobStatus: string;
  videoJobProgressRaw: number;
  videoThumbnailUrl: string | null;
  videoApprovalStatus: string;
  videoApprovalError: string | null;
  handleVideoApproval: (action: 'approve' | 'reject') => void;
  selectedType: { type: string; subtype: string; label: string } | null;
  onClose: () => void;
}

export function VideoQueuedStep({
  videoOutputUrl,
  videoJobStatus,
  videoJobProgressRaw,
  videoThumbnailUrl,
  videoApprovalStatus,
  videoApprovalError,
  handleVideoApproval,
  selectedType,
  onClose,
}: VideoQueuedStepProps) {
  return (
    <div className={`flex-col flex-center h-full py-32 ${styles.container}`}>
      <div className={`w-full text-center ${styles.contentWrapper}`}>

        {/* Completed: show inline video preview */}
        {videoOutputUrl ? (
          <>
            <div
              className={`mx-auto mb-12 rounded-full flex-center ${styles.statusIcon}`}
              data-variant={videoApprovalStatus === 'rejected' ? 'error' : 'success'}
            >
              <span className="fs-24">{videoApprovalStatus === 'approved' ? '' : videoApprovalStatus === 'rejected' ? '' : ''}</span>
            </div>
            <h2 className="text-primary fs-18 fw-600 mb-12">
              {videoApprovalStatus === 'approved' ? 'Video goedgekeurd!' : videoApprovalStatus === 'rejected' ? 'Video afgewezen' : 'Video klaar!'}
            </h2>
            <div className={`rounded-12 overflow-hidden mb-16 ${styles.videoContainer}`}>
              <video
                src={videoOutputUrl}
                controls
                autoPlay
                playsInline
                className={`w-full object-contain ${styles.videoPlayer}`}
                poster={videoThumbnailUrl || undefined}
              />
            </div>

            {/* Approval error */}
            {videoApprovalError && (
              <p className={`fs-14 mb-12 ${styles.approvalError}`}>{videoApprovalError}</p>
            )}

            {/* Approve / Reject buttons (only when not yet decided) — merged duplicate style= */}
            {videoApprovalStatus === 'idle' || videoApprovalStatus === 'approving' || videoApprovalStatus === 'rejecting' ? (
              <div className="flex-center gap-12 mb-8">
                <button
                  onClick={() => handleVideoApproval('approve')}
                  disabled={videoApprovalStatus !== 'idle'}
                  className={`inline-flex gap-8 fs-14 fw-600 rounded-8 px-20 transition ${styles.approveButton}`}
                  data-loading={videoApprovalStatus === 'approving' ? 'true' : undefined}
                >
                  {videoApprovalStatus === 'approving' ? 'Bezig...' : 'Goedkeuren'}
                </button>
                <button
                  onClick={() => handleVideoApproval('reject')}
                  disabled={videoApprovalStatus !== 'idle'}
                  className={`inline-flex gap-8 fs-14 fw-600 rounded-8 px-20 transition ${styles.rejectButton}`}
                  data-loading={videoApprovalStatus === 'rejecting' ? 'true' : undefined}
                >
                  {videoApprovalStatus === 'rejecting' ? 'Bezig...' : 'Afwijzen'}
                </button>
              </div>
            ) : (
              /* After decision — show result */
              <div className="flex-col gap-8 mb-8 items-center">
                <p className={`fs-14 fw-500 ${styles.resultText}`} data-result={videoApprovalStatus}>
                  {videoApprovalStatus === 'approved' ? 'Opgeslagen in wedstrijd content' : 'Video is afgewezen'}
                </p>
              </div>
            )}

            <div className="flex-center gap-8 mt-4">
              <Button variant="ghost" size="sm" onClick={onClose}>Sluiten</Button>
            </div>
          </>
        ) : videoJobStatus === 'failed' ? (
          /* Failed */
          <>
            <div className={`mx-auto mb-12 rounded-full flex-center ${styles.statusIcon}`} data-variant="error">
              <span className="fs-24">!</span>
            </div>
            <h2 className="text-primary fs-18 fw-600 mb-8">Generatie mislukt</h2>
            <p className="fs-14 mb-16 text-muted">
              Er is iets misgegaan bij het verwerken van je video. Probeer het opnieuw of neem contact op.
            </p>
            <div className="flex-col gap-8 items-center">
              <Button variant="ghost" size="sm" onClick={onClose}>Sluiten</Button>
            </div>
          </>
        ) : (
          /* Queued / Processing: spinner + progress bar — fixed animate-spin className + merged duplicate style= */
          <>
            <div className={`mx-auto mb-12 rounded-full flex-center ${styles.statusIcon}`} data-variant="info">
              <svg
                width="28" height="28" viewBox="0 0 24 24" fill="none"
                className={styles.spinner}
              >
                <circle cx="12" cy="12" r="10" stroke="rgba(59,130,246,0.25)" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-primary fs-18 fw-600 mb-4">
              {videoJobStatus === 'processing' ? 'Video wordt gemaakt…' : 'In de wachtrij…'}
            </h2>
            <p className="fs-14 mb-16 text-muted">
              {videoJobStatus === 'processing'
                ? 'Je video wordt nu gegenereerd. Dit kan even duren.'
                : `Je ${selectedType?.label || 'video'} wordt op de achtergrond gegenereerd.`}
            </p>

            {/* Progress bar */}
            <div className={`w-full rounded-full mb-4 ${styles.progressTrack}`}>
              <div
                className={`rounded-full transition ${styles.progressFill}`}
                style={{ width: `${Math.max(videoJobProgressRaw, videoJobStatus === 'processing' ? 5 : 0)}%` }}
              />
            </div>
            <p className="fs-12 mb-20 text-muted">
              {videoJobProgressRaw > 0 ? `${videoJobProgressRaw}%` : 'Wachten op verwerking…'}
            </p>

            <div className="flex-col gap-8 items-center">
              <a
                href="/approvals"
                className={`inline-flex gap-8 px-16 py-8 fs-14 fw-500 rounded-8 transition ${styles.approvalsLink}`}
              >
                Ga naar Approvals
              </a>
              <Button variant="ghost" size="sm" onClick={onClose}>Sluiten</Button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
