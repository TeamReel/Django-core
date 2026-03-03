import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppIcon } from './AppIcon';
import s from './TopNavbar.module.css';
import type { GenerationJob } from '../hooks/useGenerationJobs';
import type { PhotoCompositeFollowUpInfo } from './topNavbarHelpers';

/* ═══════════════════════════════════════════════════════════════
   1. Photo Composite Follow-Up Modal
   ═══════════════════════════════════════════════════════════════ */

interface NavbarPhotoCompositeFollowUpModalProps {
  info: PhotoCompositeFollowUpInfo;
  onClose: () => void;
  onSubmitted: () => void;
}

export function NavbarPhotoCompositeFollowUpModal({ info, onClose, onSubmitted }: NavbarPhotoCompositeFollowUpModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitVideo = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { getApiBaseUrl } = await import('../utils/apiBase');
      const apiBase = getApiBaseUrl();
      const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? '';

      const body = {
        template_id: 'photo_composite_video',
        parameters: {},
        variant_count: 1,
        project_id: info.projectId,
        membership_id: info.membershipId,
        output_asset_type: 'photo_composite_video',
        input_image_urls: { person_photo: info.approvedImageUrl },
        output_type: 'video',
        require_approval: true,
      };

      const res = await fetch(`${apiBase}/api/v1/generative/assets/generate/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.data?.error || err?.error || `HTTP ${res.status}`);
      }
      setSubmitted(true);
    } catch (e) {
      console.error('Failed to submit photo_composite_video:', e);
      setError(e instanceof Error ? e.message : 'Generatie mislukt');
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget && !submitting) onClose(); }}
      className={s.modalOverlayHigh}
    >
      <div className={s.followUpPanel}>
        {/* Header */}
        <div className={s.followUpHeader}>
          <div className="flex-between">
            <div>
              <div className={s.followUpTitle}>
                {submitted ? '\u2705 Video in de wachtrij!' : '\ud83c\udfac Video genereren?'}
              </div>
              <div className={s.followUpSubtitle}>
                {submitted
                  ? 'De video wordt gegenereerd en verschijnt binnenkort in de approval queue.'
                  : `Foto composite goedgekeurd voor ${info.memberName}. Wil je de geanimeerde video versie genereren?`
                }
              </div>
            </div>
            {!submitting && <button onClick={onClose} className={s.closeBtnMuted}>{'\u2715'}</button>}
          </div>
        </div>

        {/* Preview */}
        {!submitted && (
          <div className={s.followUpPreview}>
            <img
              src={info.approvedImageUrl}
              alt="Approved composite"
              className={s.followUpImg}
            />
          </div>
        )}

        {error && (
          <div className={s.followUpError}>{error}</div>
        )}

        {/* Footer */}
          <div className={s.followUpFooter} style={{ justifyContent: submitted ? 'center' : undefined }}>
          {submitted ? (
            <button
              onClick={() => { onSubmitted(); onClose(); }}
              className={s.btnPrimary}
            >
              Sluiten
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={submitting}
                className={s.followUpSkipBtn}
                style={{ cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.5 : 1 }}
              >
                Overslaan
              </button>
              <button
                onClick={handleSubmitVideo}
                disabled={submitting}
                className={s.followUpSubmitBtn}
                style={{ cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? 'Bezig...' : '\ud83d\ude80 Genereer Video'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   2. Quick Review Modal (Queue review from navbar)
   ═══════════════════════════════════════════════════════════════ */

export interface QuickReviewModalProps {
  queueModalTab: 'review' | 'in-progress';
  setQueueModalTab: (tab: 'review' | 'in-progress') => void;
  pendingReviewJobs: GenerationJob[];
  inProgressJobs: GenerationJob[];
  quickReviewIdx: number;
  setQuickReviewIdx: (fn: number | ((prev: number) => number)) => void;
  selectedVariantIdxs: Set<number>;
  setSelectedVariantIdxs: (fn: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  quickReviewBusy: boolean;
  handleQuickReview: (action: 'approve' | 'reject') => Promise<void>;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export function NavbarQuickReviewModal({
  queueModalTab,
  setQueueModalTab,
  pendingReviewJobs,
  inProgressJobs,
  quickReviewIdx,
  setQuickReviewIdx,
  selectedVariantIdxs,
  setSelectedVariantIdxs,
  quickReviewBusy,
  handleQuickReview,
  onClose,
  onNavigate,
}: QuickReviewModalProps) {
  const jobsToShow = queueModalTab === 'review' ? pendingReviewJobs : inProgressJobs;
  const job = queueModalTab === 'review' ? jobsToShow[quickReviewIdx] : null;

  // Empty state
  if (jobsToShow.length === 0) {
    return (
      <div onClick={onClose} className={s.modalOverlay}>
        <div onClick={e => e.stopPropagation()} className={s.modalPanelCentered}>
          <div className={s.tabsRowCenter}>
            <button
              onClick={() => { setQueueModalTab('review'); setQuickReviewIdx(0); }}
              className={s.tabBtn} style={{ background: queueModalTab === 'review' ? 'var(--color-blue-600)' : 'var(--app-border, #334155)' }}
            >
              Te Reviewen ({pendingReviewJobs.length})
            </button>
            <button
              onClick={() => setQueueModalTab('in-progress')}
              className={s.tabBtn} style={{ background: queueModalTab === 'in-progress' ? 'var(--color-amber-400)' : 'var(--app-border, #334155)' }}
            >
              In Progress ({inProgressJobs.length})
            </button>
          </div>
          <div className={`mb-12 ${s.emptyIcon}`}>{queueModalTab === 'review' ? '\u2705' : '\u23f3'}</div>
          <div className={`mb-8 ${s.modalTitle}`}>
            {queueModalTab === 'review' ? 'Alles beoordeeld!' : 'Geen actieve jobs'}
          </div>
          <div className={s.textSecondary13} style={{ marginBottom: 20 }}>
            {queueModalTab === 'review' ? 'Er zijn geen items meer die review nodig hebben.' : 'Er zijn geen jobs in uitvoering.'}
          </div>
          <div className={s.actionsRowCenter}>
            <button onClick={() => { onClose(); onNavigate('/approvals'); }} className={s.btnSecondary}>
              Open Queue {'\u2192'}
            </button>
            <button onClick={onClose} className={s.btnPrimary}>Sluiten</button>
          </div>
        </div>
      </div>
    );
  }

  // In-progress tab: list view
  if (queueModalTab === 'in-progress') {
    return (
      <div onClick={onClose} className={s.modalOverlay}>
        <div onClick={e => e.stopPropagation()} className={s.modalPanel} style={{ width: '100%', maxWidth: 560, maxHeight: '80vh' }}>
          <div className={s.modalHeader}>
            <div className="flex-between mb-12">
              <div className={s.modalTitle}>Queue</div>
              <button onClick={onClose} className={s.closeBtn}>{'\u2715'}</button>
            </div>
            <div className={s.tabsRow}>
              <button
                onClick={() => { setQueueModalTab('review'); setQuickReviewIdx(0); }}
                className={s.tabBtn} style={{ background: 'var(--app-border, #334155)' }}
              >
                Te Reviewen ({pendingReviewJobs.length})
              </button>
              <button
                onClick={() => setQueueModalTab('in-progress')}
                className={s.tabBtn} style={{ background: 'var(--color-amber-400)' }}
              >
                In Progress ({inProgressJobs.length})
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-16">
            {inProgressJobs.map((j) => (
              <div key={j.task_id} className="flex-row gap-12 p-12 rounded-8 mb-8" style={{ background: 'var(--app-background, #0f172a)' }}>
                <div className={s.jobIcon} style={{ backgroundColor: j.status === 'processing' ? 'var(--color-amber-400)' : 'var(--app-muted-text)' }}>
                  {j.status === 'processing' ? '\u2699\ufe0f' : '\u23f3'}
                </div>
                <div className="flex-1">
                  <div className="fs-13 fw-600 text-primary">{j.label || j.template_id}</div>
                  <div className={s.textSecondary11}>
                    {j.status === 'processing' ? 'Bezig...' : 'In wachtrij'} {'\u00b7'} {new Date(j.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className={`flex-between ${s.modalFooter}`}>
            <button onClick={() => { onClose(); onNavigate('/approvals?tab=ai_queue'); }} className={s.btnSecondary}>
              Open Queue {'\u2192'}
            </button>
            <button onClick={onClose} className={s.btnPrimary}>Sluiten</button>
          </div>
        </div>
      </div>
    );
  }

  // Review tab: no current job
  if (!job) {
    return (
      <div onClick={onClose} className={s.modalOverlay}>
        <div onClick={e => e.stopPropagation()} className={s.modalPanelCenteredLarge}>
          <div className={`mb-12 ${s.emptyIcon}`}>{'\u2705'}</div>
          <div className={s.modalTitle} style={{ marginBottom: 8 }}>Alles beoordeeld!</div>
          <div className="fs-13 mb-8 text-secondary">Er zijn geen items meer die review nodig hebben.</div>
          <button onClick={onClose} className={s.btnPrimary}>Sluiten</button>
        </div>
      </div>
    );
  }

  // Build variants
  const variants = job.output_variants?.length
    ? job.output_variants
    : job.output_url
    ? [{ variant_index: 0, presigned_url: job.output_url, storage_path: '', file_asset_id: null as null, mime_type: job.output_type === 'video' ? 'video/mp4' : 'image/jpeg', filename: '', approved: null as null }]
    : [];

  const isVideo = (v: { mime_type?: string; filename?: string }) =>
    v.mime_type?.startsWith('video/') || v.filename?.endsWith('.mp4') || job.output_type === 'video';

  return (
    <div onClick={onClose} className={s.modalOverlay}>
      <div
        onClick={e => e.stopPropagation()}
        className={s.modalPanel} style={{ width: '100%', maxWidth: variants.length > 1 ? 900 : 640, maxHeight: '92vh' }}
      >
        {/* Header with tabs */}
        <div className={s.modalHeader}>
          <div className={s.tabsRow} style={{ marginBottom: 12 }}>
            <button
              onClick={() => setQueueModalTab('review')}
              className={s.tabBtnSmall}
              style={{ backgroundColor: 'var(--app-primary, #3b82f6)', color: '#fff' }}
            >
              Te Reviewen ({pendingReviewJobs.length})
            </button>
            <button
              onClick={() => setQueueModalTab('in-progress')}
              className={s.tabBtnSmall}
              style={{ backgroundColor: 'var(--app-surface-elevated, #334155)', color: 'var(--app-text-secondary, #9ca3af)' }}
            >
              In Progress ({inProgressJobs.length})
            </button>
            <button
              onClick={() => { onClose(); onNavigate('/queue'); }}
              className={s.btnGhost}
              style={{ marginLeft: 'auto' }}
            >
              Volledige Queue {'\u2192'}
            </button>
          </div>
          <div className="flex-row gap-12">
            <div className="flex-1">
              <div className={s.modalTitle15}>{job.label || job.template_id}</div>
              <div className={s.modalSubtitle}>
                {job.output_type} {'\u00b7'} {new Date(job.created_at).toLocaleString()}
                {pendingReviewJobs.length > 0 && ` \u00b7 ${quickReviewIdx + 1} van ${pendingReviewJobs.length}`}
              </div>
            </div>
            <div className={s.tabsRow} style={{ gap: 4 }}>
              <button
                disabled={quickReviewIdx <= 0}
                onClick={() => { setQuickReviewIdx((i: number) => Math.max(0, i - 1)); setSelectedVariantIdxs(new Set()); }}
                className={s.navArrow}
                style={{ cursor: quickReviewIdx > 0 ? 'pointer' : 'not-allowed', opacity: quickReviewIdx > 0 ? 1 : 0.4 }}
              >
                {'\u2039'}
              </button>
              <button
                disabled={quickReviewIdx >= pendingReviewJobs.length - 1}
                onClick={() => { setQuickReviewIdx((i: number) => Math.min(pendingReviewJobs.length - 1, i + 1)); setSelectedVariantIdxs(new Set()); }}
                className={s.navArrow}
                style={{ cursor: quickReviewIdx < pendingReviewJobs.length - 1 ? 'pointer' : 'not-allowed', opacity: quickReviewIdx < pendingReviewJobs.length - 1 ? 1 : 0.4 }}
              >
                {'\u203a'}
              </button>
            </div>
            <button onClick={onClose} className={s.closeBtn}>{'\u2715'}</button>
          </div>
        </div>

        {/* Variants */}
        <div className="flex-1 overflow-y-auto p-16">
          <div style={{
            display: 'grid',
            gridTemplateColumns: variants.length > 1 ? `repeat(${Math.min(variants.length, 4)}, 1fr)` : '1fr',
            gap: 12,
            justifyItems: 'center',
          }}>
            {variants.map((v) => (
              <div
                key={v.variant_index}
                onClick={() => variants.length > 1 ? setSelectedVariantIdxs((prev: Set<number>) => { const next = new Set(prev); if (next.has(v.variant_index)) next.delete(v.variant_index); else next.add(v.variant_index); return next; }) : undefined}
                className={s.variantCard}
                style={{
                  border: selectedVariantIdxs.has(v.variant_index) ? '3px solid #16a34a' : '1px solid var(--app-border, #334155)',
                  maxWidth: variants.length === 1 ? 420 : '100%',
                  cursor: variants.length > 1 ? 'pointer' : 'default',
                  opacity: variants.length > 1 && selectedVariantIdxs.size > 0 && !selectedVariantIdxs.has(v.variant_index) ? 0.5 : 1,
                }}
              >
                {variants.length > 1 && (
                  <div className={s.variantCheckmark} style={{ backgroundColor: selectedVariantIdxs.has(v.variant_index) ? '#16a34a' : 'rgba(0,0,0,0.5)' }}>
                    {selectedVariantIdxs.has(v.variant_index) ? '\u2713' : (v.variant_index + 1)}
                  </div>
                )}
                {v.presigned_url && isVideo(v) ? (
                  <video src={v.presigned_url} controls muted playsInline autoPlay loop className={s.previewMedia} />
                ) : v.presigned_url ? (
                  <img src={v.presigned_url} alt={`Variant ${v.variant_index + 1}`} className={s.previewMedia} />
                ) : (
                  <div className={s.noPreview}>Geen preview</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex-between ${s.modalFooter}`}>
          <button
            onClick={() => handleQuickReview('reject')}
            disabled={quickReviewBusy}
            className={s.rejectBtn}
            style={{ cursor: quickReviewBusy ? 'wait' : 'pointer', opacity: quickReviewBusy ? 0.6 : 1 }}
          >
            {'\u274c'} Afwijzen
          </button>
          <div className="flex-row gap-8">
            <button onClick={() => { onClose(); onNavigate('/approvals?tab=review'); }} className={s.btnSecondary}>
              Open Queue {'\u2192'}
            </button>
            <button
              onClick={() => handleQuickReview('approve')}
              disabled={quickReviewBusy}
              className={s.approveBtn}
              style={{ cursor: quickReviewBusy ? 'wait' : 'pointer', opacity: quickReviewBusy ? 0.6 : 1 }}
            >
              {'\u2705'} {variants.length > 1 && selectedVariantIdxs.size > 0 ? `${selectedVariantIdxs.size === variants.length ? 'Alles' : Array.from(selectedVariantIdxs).map(i => `#${i + 1}`).join(' + ')} Goedkeuren` : 'Goedkeuren'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3. Notifications Modal
   ═══════════════════════════════════════════════════════════════ */

export interface NotificationsModalProps {
  notificationsList: Array<{ id: string; message: string; is_read: boolean; created_at: string; title?: string; read?: boolean }>;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export function NavbarNotificationsModal({ notificationsList, onClose, onNavigate }: NotificationsModalProps) {
  return (
    <div onClick={onClose} className={s.modalOverlay}>
      <div onClick={e => e.stopPropagation()} className={s.modalPanel} style={{ width: '100%', maxWidth: 480, maxHeight: '70vh' }}>
        <div className={s.modalHeaderRow}>
          <div className="flex-1">
            <div className={s.modalTitle15}>Notificaties</div>
            <div className={s.modalSubtitle}>{notificationsList.length} recente notificaties</div>
          </div>
          <button onClick={() => { onClose(); onNavigate('/notifications'); }} className={s.btnGhost}>
            Alle Notificaties {'\u2192'}
          </button>
          <button onClick={onClose} className={s.closeBtn}>{'\u2715'}</button>
        </div>
        <div className="flex-1 overflow-y-auto p-16">
          {notificationsList.length === 0 ? (
            <div className="text-center p-24 text-secondary">
              <div className={`mb-8 ${s.emptyIcon32}`}>{'\ud83d\udced'}</div>
              <div className="fs-14">Geen notificaties</div>
            </div>
          ) : (
            <div className="flex-col gap-8">
              {notificationsList.slice(0, 10).map((notif: any) => (
                <div
                  key={notif.id}
                  style={{
                    padding: 12, borderRadius: 8,
                    backgroundColor: notif.read ? 'var(--app-surface-elevated, #334155)' : 'rgba(59, 130, 246, 0.15)',
                    border: notif.read ? '1px solid var(--app-border, #475569)' : '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                >
                  <div className={s.notifMessage} style={{ fontWeight: notif.read ? 400 : 600 }}>
                    {notif.title || notif.message}
                  </div>
                  {notif.message && notif.title && (
                    <div className={s.notifDetail}>{notif.message}</div>
                  )}
                  <div className={s.textSecondary10}>{new Date(notif.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4. Credits Modal
   ═══════════════════════════════════════════════════════════════ */

export interface CreditsModalProps {
  myCreditsBalance: string | null;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export function NavbarCreditsModal({ myCreditsBalance, onClose, onNavigate }: CreditsModalProps) {
  return (
    <div onClick={onClose} className={s.modalOverlay}>
      <div onClick={e => e.stopPropagation()} className={s.modalPanel} style={{ width: '100%', maxWidth: 400 }}>
        <div className={s.modalHeaderRow}>
          <div className="flex-1">
            <div className={s.modalTitle15}>Credits</div>
          </div>
          <button onClick={onClose} className={s.closeBtn}>{'\u2715'}</button>
        </div>
        <div className="p-24 text-center">
          <div className={s.creditsBalance}>{myCreditsBalance}</div>
          <div className={s.creditsLabel}>beschikbare credits</div>
          <button onClick={() => { onClose(); onNavigate('/credits'); }} className={s.creditsLink}>
            Bekijk Credits Overzicht {'\u2192'}
          </button>
        </div>
      </div>
    </div>
  );
}
