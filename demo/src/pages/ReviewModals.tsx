/**
 * Review modals for AI generation jobs and video processing jobs.
 */
import { useState, useEffect } from 'react';
import {
  type GenerationJob,
} from '../hooks/useGenerationJobs';
import {
  type VideoJob,
  getJobStatusDisplay,
  getJobTypeDisplay,
} from '../hooks/useVideoJobs';
import s from './ApprovalsPage.module.css';
import styles from './ReviewModals.module.css';
import { getErrorMessage } from '../utils/errorHelpers';

// ─── AI Review Modal ─────────────────────────────────────────────

interface ReviewModalProps {
  job: GenerationJob;
  reviewList: GenerationJob[];
  onClose: () => void;
  onReviewed: (taskId: string, action: 'approve' | 'reject') => void;
}

export function ReviewModal({ job, reviewList, onClose, onReviewed }: ReviewModalProps) {
  const [reviewing, setReviewing] = useState<'approve' | 'reject' | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const initSelections = () => {
    const m: Record<number, boolean | null> = {};
    if (job.output_variants?.length) {
      for (const v of job.output_variants) {
        m[v.variant_index] = v.approved ?? null;
      }
    }
    return m;
  };
  const [selections, setSelections] = useState<Record<number, boolean | null>>(initSelections);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setSelections(initSelections()); setReviewError(null); }, [job.task_id]);

  const currentIdx = reviewList.findIndex(j => j.task_id === job.task_id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < reviewList.length - 1;
  const isCanReview = job.approval_status === 'pending_review' || !job.approval_status;

  const variants = job.output_variants?.length
    ? job.output_variants
    : job.output_url
    ? [{ variant_index: 0, presigned_url: job.output_url, storage_path: '', file_asset_id: null as null, mime_type: job.output_type === 'video' ? 'video/mp4' : 'image/jpeg', filename: '', approved: null as null }]
    : [];

  const toggleVariant = (idx: number, val: boolean) =>
    setSelections(prev => ({ ...prev, [idx]: prev[idx] === val ? null : val }));

  const selectAll = (val: boolean) => {
    const next: Record<number, boolean | null> = {};
    for (const v of variants) next[v.variant_index] = val;
    setSelections(next);
  };

  const handleSubmit = async (action: 'approve' | 'reject') => {
    setReviewing(action);
    setReviewError(null);
    try { onReviewed(job.task_id, action); } catch { /* handled externally */ } finally { setReviewing(null); }
  };

  const isVideo = (v: { mime_type: string; filename: string }) =>
    v.mime_type?.startsWith('video/') || v.filename?.endsWith('.mp4') || v.filename?.endsWith('.webm') || job.output_type === 'video';

  return (
    <div
      className={s.modalOverlay}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`${s.modalPanel} ${styles.modalPanel}`} data-multi-variant={variants.length > 1}>

        {/* Header */}
        <div className={s.modalHeader}>
          <div className="flex-1">
            <div className={s.modalTitle15}>{job.label || job.template_id}</div>
            <div className={s.modalSubtitle11}>
              {job.output_type} · {new Date(job.created_at).toLocaleString()}
              {reviewList.length > 0 && ` · ${currentIdx + 1} van ${reviewList.length}`}
              {variants.length > 1 && ` · ${variants.length} varianten`}
            </div>
            {(job.provider || job.model || job.duration_seconds != null) && (
              <div className={s.providerInfo}>
                {job.provider && <span>🤖 <strong>{job.provider}</strong></span>}
                {job.model && <span>📦 {job.model}</span>}
                {job.duration_seconds != null && <span>⏱️ {job.duration_seconds < 60 ? `${Math.round(job.duration_seconds)}s` : `${Math.floor(job.duration_seconds / 60)}m ${Math.round(job.duration_seconds % 60)}s`}</span>}
              </div>
            )}
          </div>
          <div className="flex-row gap-6">
            <button disabled={!hasPrev} onClick={() => onReviewed('__prev__', 'approve')} className={styles.navBtn} data-disabled={!hasPrev}>&#8249;</button>
            <button disabled={!hasNext} onClick={() => onReviewed('__next__', 'reject')} className={styles.navBtn} data-disabled={!hasNext}>&#8250;</button>
          </div>
          <button onClick={onClose} className={s.closeBtn}>&times;</button>
        </div>

        {/* Variants gallery */}
        <div className={`flex-1 overflow-y-auto ${styles.galleryArea}`} data-multi={variants.length > 1}>
          {variants.length === 0 && (
            <div className={s.emptyGallery}>
              <div className={s.emptyIcon}>&#128679;</div>
              <div>Preview niet beschikbaar</div>
              <div className={s.emptyHint}>Bestand nog niet opgeslagen — genereer opnieuw om op te slaan</div>
            </div>
          )}
          {variants.length > 0 && (
            <div className={s.variantsRow}>
              {variants.map(v => {
                const url = v.presigned_url || '';
                const sel = selections[v.variant_index];
                return (
                  <div key={v.variant_index} className={`flex-col ${styles.variantWrapper}`} data-single={variants.length === 1}>
                    <div className={`relative rounded-8 overflow-hidden transition ${styles.variantCard}`} data-selection={sel === true ? 'approved' : sel === false ? 'rejected' : 'none'}>
                      {url ? (
                        isVideo(v) ? (
                          <video src={url} controls autoPlay={variants.length === 1} loop className={`block ${styles.variantMedia}`} data-single={variants.length === 1} />
                        ) : (
                          <img src={url} alt={`Variant ${v.variant_index + 1}`} className={`block object-contain ${styles.variantMedia}`} data-single={variants.length === 1} />
                        )
                      ) : (
                        <div className={`flex-col flex-center gap-6 fs-12 ${styles.noPreview}`} data-single={variants.length === 1}>
                          <div className={styles.noPreviewIcon}>&#128679;</div>
                          <div>Geen preview</div>
                          {v.storage_path && <div className={s.storagePath}>{v.storage_path}</div>}
                        </div>
                      )}
                      {variants.length > 1 && (
                        <div className={s.variantBadge}>Variant {v.variant_index + 1}</div>
                      )}
                    </div>
                    {isCanReview && variants.length > 1 && (
                      <div className={s.variantBtnRow}>
                        <button
                          onClick={() => toggleVariant(v.variant_index, true)}
                          className={styles.variantApproveBtn}
                          data-selected={sel === true}
                        >
                          {sel === true ? '✔ Geselecteerd' : '✔ Kies'}
                        </button>
                        <button
                          onClick={() => toggleVariant(v.variant_index, false)}
                          className={styles.variantRejectBtn}
                          data-selected={sel === false}
                        >
                          {sel === false ? '✘ Afgewezen' : '✘ Afwijzen'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={s.modalFooter}>
          {reviewError && <div className={s.reviewError}>{reviewError}</div>}
          {!isCanReview && !reviewError && (
            <div className={s.reviewStatus}>
              {job.approval_status === 'approved' ? '✔ Goedgekeurd' : '✘ Afgewezen'}
            </div>
          )}
          {isCanReview && <div className="flex-1" />}
          {isCanReview && variants.length > 1 && (
            <div className={s.selectAllRow}>
              <button onClick={() => selectAll(true)} className={s.btnSelectAll}>Alles ✔</button>
              <button onClick={() => selectAll(false)} className={s.btnRejectAll}>Alles ✘</button>
            </div>
          )}
          {isCanReview && (
            <>
              <button
                onClick={() => handleSubmit('reject')}
                disabled={!!reviewing}
                className={`${s.btnReject} ${styles.footerRejectBtn}`}
                data-state={reviewing === 'reject' ? 'active' : reviewing ? 'inactive' : 'idle'}
              >
                {reviewing === 'reject' ? '...' : '✘ Afwijzen'}
              </button>
              <button
                onClick={() => handleSubmit('approve')}
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

// ─── Video Review Modal ───────────────────────────────────────────

interface VideoReviewModalProps {
  job: VideoJob;
  onClose: () => void;
  onActionComplete: () => void;
  pushToast: (msg: string, type: 'success' | 'error') => void;
  approveJob: (jobId: string) => Promise<any>;
  rejectJob: (jobId: string) => Promise<any>;
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
      console.error(err);
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
