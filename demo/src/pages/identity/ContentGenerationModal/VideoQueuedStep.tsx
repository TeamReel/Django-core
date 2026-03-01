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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: '32px', paddingBottom: '32px' }}>
      <div style={{ width: '100%', maxWidth: '448px', textAlign: 'center' }}>

        {/* Completed: show inline video preview */}
        {videoOutputUrl ? (
          <>
            <div style={{
              background: videoApprovalStatus === 'approved' ? 'rgba(34,197,94,0.15)' : videoApprovalStatus === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
              width: '56px', height: '56px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '12px',
              borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '24px' }}>{videoApprovalStatus === 'approved' ? '' : videoApprovalStatus === 'rejected' ? '' : ''}</span>
            </div>
            <h2 style={{ color: 'var(--app-text)', fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
              {videoApprovalStatus === 'approved' ? 'Video goedgekeurd!' : videoApprovalStatus === 'rejected' ? 'Video afgewezen' : 'Video klaar!'}
            </h2>
            <div style={{ background: '#000', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
              <video
                src={videoOutputUrl}
                controls
                autoPlay
                playsInline
                style={{ width: '100%', maxHeight: 340, objectFit: 'contain' }}
                poster={videoThumbnailUrl || undefined}
              />
            </div>

            {/* Approval error */}
            {videoApprovalError && (
              <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '12px' }}>{videoApprovalError}</p>
            )}

            {/* Approve / Reject buttons (only when not yet decided) — merged duplicate style= */}
            {videoApprovalStatus === 'idle' || videoApprovalStatus === 'approving' || videoApprovalStatus === 'rejecting' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
                <button
                  onClick={() => handleVideoApproval('approve')}
                  disabled={videoApprovalStatus !== 'idle'}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    paddingLeft: '20px', paddingRight: '20px', paddingTop: '10px', paddingBottom: '10px',
                    fontSize: '14px', fontWeight: 600, borderRadius: '8px', transition: 'all 150ms ease',
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
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    paddingLeft: '20px', paddingRight: '20px', paddingTop: '10px', paddingBottom: '10px',
                    fontSize: '14px', fontWeight: 600, borderRadius: '8px', transition: 'all 150ms ease',
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <p style={{ color: videoApprovalStatus === 'approved' ? '#22c55e' : '#f87171', fontSize: '14px', fontWeight: 500 }}>
                  {videoApprovalStatus === 'approved' ? 'Opgeslagen in wedstrijd content' : 'Video is afgewezen'}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
              <Button variant="ghost" size="sm" onClick={onClose}>Sluiten</Button>
            </div>
          </>
        ) : videoJobStatus === 'failed' ? (
          /* Failed */
          <>
            <div style={{ background: 'rgba(239,68,68,0.15)', width: '56px', height: '56px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '12px', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '24px' }}>!</span>
            </div>
            <h2 style={{ color: 'var(--app-text)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Generatie mislukt</h2>
            <p style={{ color: 'var(--app-muted)', fontSize: '14px', marginBottom: '16px' }}>
              Er is iets misgegaan bij het verwerken van je video. Probeer het opnieuw of neem contact op.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Button variant="ghost" size="sm" onClick={onClose}>Sluiten</Button>
            </div>
          </>
        ) : (
          /* Queued / Processing: spinner + progress bar — fixed animate-spin className + merged duplicate style= */
          <>
            <div style={{ background: 'rgba(59,130,246,0.12)', width: '56px', height: '56px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '12px', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg
                width="28" height="28" viewBox="0 0 24 24" fill="none"
                style={{ animation: 'spin 1s linear infinite' }}
              >
                <circle cx="12" cy="12" r="10" stroke="rgba(59,130,246,0.25)" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <h2 style={{ color: 'var(--app-text)', fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
              {videoJobStatus === 'processing' ? 'Video wordt gemaakt…' : 'In de wachtrij…'}
            </h2>
            <p style={{ color: 'var(--app-muted)', fontSize: '14px', marginBottom: '16px' }}>
              {videoJobStatus === 'processing'
                ? 'Je video wordt nu gegenereerd. Dit kan even duren.'
                : `Je ${selectedType?.label || 'video'} wordt op de achtergrond gegenereerd.`}
            </p>

            {/* Progress bar — merged duplicate style= */}
            <div style={{ background: 'rgba(255,255,255,0.08)', width: '100%', borderRadius: '9999px', height: '8px', marginBottom: '4px' }}>
              <div
                style={{
                  height: '8px',
                  borderRadius: '9999px',
                  transition: 'all 150ms ease',
                  width: `${Math.max(videoJobProgressRaw, videoJobStatus === 'processing' ? 5 : 0)}%`,
                  background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                }}
              />
            </div>
            <p style={{ color: 'var(--app-muted)', fontSize: '12px', marginBottom: '20px' }}>
              {videoJobProgressRaw > 0 ? `${videoJobProgressRaw}%` : 'Wachten op verwerking…'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              {/* Merged duplicate style= on link */}
              <a
                href="/approvals"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  paddingLeft: '16px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px',
                  fontSize: '14px', fontWeight: 500, borderRadius: '8px',
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
