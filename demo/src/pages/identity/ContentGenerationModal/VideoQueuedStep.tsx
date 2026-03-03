import React from 'react';
import { Button } from '@django-core/design-system';

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
    <div className="flex-col flex-center h-full py-32">
      <div className="w-full text-center" style={{ maxWidth: '448px' }}>

        {/* Completed: show inline video preview */}
        {videoOutputUrl ? (
          <>
            <div className="mx-auto mb-12 rounded-full flex-center" style={{
              background: videoApprovalStatus === 'approved' ? 'rgba(34,197,94,0.15)' : videoApprovalStatus === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
              width: '56px', height: '56px',
            }}>
              <span className="fs-24">{videoApprovalStatus === 'approved' ? '' : videoApprovalStatus === 'rejected' ? '' : ''}</span>
            </div>
            <h2 className="text-primary fs-18 fw-600 mb-12">
              {videoApprovalStatus === 'approved' ? 'Video goedgekeurd!' : videoApprovalStatus === 'rejected' ? 'Video afgewezen' : 'Video klaar!'}
            </h2>
            <div className="rounded-12 overflow-hidden mb-16" style={{ background: '#000' }}>
              <video
                src={videoOutputUrl}
                controls
                autoPlay
                playsInline
                className="w-full object-contain"
                style={{ maxHeight: 340 }}
                poster={videoThumbnailUrl || undefined}
              />
            </div>

            {/* Approval error */}
            {videoApprovalError && (
              <p className="fs-14 mb-12" style={{ color: '#f87171' }}>{videoApprovalError}</p>
            )}

            {/* Approve / Reject buttons (only when not yet decided) — merged duplicate style= */}
            {videoApprovalStatus === 'idle' || videoApprovalStatus === 'approving' || videoApprovalStatus === 'rejecting' ? (
              <div className="flex-center gap-12 mb-8">
                <button
                  onClick={() => handleVideoApproval('approve')}
                  disabled={videoApprovalStatus !== 'idle'}
                  className="inline-flex gap-8 fs-14 fw-600 rounded-8"
                  style={{
                    paddingLeft: '20px', paddingRight: '20px', paddingTop: '10px', paddingBottom: '10px',
                    transition: 'all 150ms ease',
                    background: videoApprovalStatus === 'approving' ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.15)',
                    color: '#22c55e',
                    border: '1px solid rgba(34,197,94,0.3)',
                    opacity: videoApprovalStatus !== 'idle' ? 0.6 : 1,
                    cursor: videoApprovalStatus !== 'idle' ? 'wait' : 'pointer',
                  }}
                >
                  {videoApprovalStatus === 'approving' ? 'Bezig...' : 'Goedkeuren'}
                </button>
                <button
                  onClick={() => handleVideoApproval('reject')}
                  disabled={videoApprovalStatus !== 'idle'}
                  className="inline-flex gap-8 fs-14 fw-600 rounded-8"
                  style={{
                    paddingLeft: '20px', paddingRight: '20px', paddingTop: '10px', paddingBottom: '10px',
                    transition: 'all 150ms ease',
                    background: videoApprovalStatus === 'rejecting' ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.1)',
                    color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.25)',
                    opacity: videoApprovalStatus !== 'idle' ? 0.6 : 1,
                    cursor: videoApprovalStatus !== 'idle' ? 'wait' : 'pointer',
                  }}
                >
                  {videoApprovalStatus === 'rejecting' ? 'Bezig...' : 'Afwijzen'}
                </button>
              </div>
            ) : (
              /* After decision — show result */
              <div className="flex-col gap-8 mb-8 items-center">
                <p className="fs-14 fw-500" style={{ color: videoApprovalStatus === 'approved' ? '#22c55e' : '#f87171' }}>
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
            <div className="mx-auto mb-12 rounded-full flex-center" style={{ background: 'rgba(239,68,68,0.15)', width: '56px', height: '56px' }}>
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
            <div className="mx-auto mb-12 rounded-full flex-center" style={{ background: 'rgba(59,130,246,0.12)', width: '56px', height: '56px' }}>
              <svg
                width="28" height="28" viewBox="0 0 24 24" fill="none"
                style={{ animation: 'spin 1s linear infinite' }}
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

            {/* Progress bar — merged duplicate style= */}
            <div className="w-full rounded-full mb-4" style={{ background: 'rgba(255,255,255,0.08)', height: '8px' }}>
              <div
                className="rounded-full"
                style={{
                  height: '8px',
                  transition: 'all 150ms ease',
                  width: `${Math.max(videoJobProgressRaw, videoJobStatus === 'processing' ? 5 : 0)}%`,
                  background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                }}
              />
            </div>
            <p className="fs-12 mb-20" style={{ color: 'var(--app-muted)' }}>
              {videoJobProgressRaw > 0 ? `${videoJobProgressRaw}%` : 'Wachten op verwerking…'}
            </p>

            <div className="flex-col gap-8 items-center">
              {/* Merged duplicate style= on link */}
              <a
                href="/approvals"
                className="inline-flex gap-8 px-16 py-8 fs-14 fw-500 rounded-8"
                style={{
                  transition: 'color 150ms, background 150ms',
                  color: '#60a5fa', background: 'rgba(59,130,246,0.12)',
                }}
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
