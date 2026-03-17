import { useState, useCallback } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import s from './TopNavbarModals.module.css';
import styles from './NavbarModals.module.css';
import type { GenerationJob } from '../hooks/useGenerationJobs';
import type { VideoJob } from '../types/api';
import { videoApi } from '../api';
import { logger } from '@/utils/logger';

/* ─── Constants ──────────────────────────────────────────────────── */

const VIDEO_TYPE_LABELS: Record<string, string> = {
  lineup: 'Lineup Video',
  goal_celebration: 'Doelpunt Video',
  match_intro: 'Match Intro',
  then_vs_now: 'Transformatie',
  transcode: 'Transcode',
  thumbnail: 'Thumbnail',
  compose: 'Compose',
};

/* ─── Props ──────────────────────────────────────────────────────── */

export interface QuickReviewModalProps {
  queueModalTab: 'review' | 'in-progress';
  setQueueModalTab: (tab: 'review' | 'in-progress') => void;
  pendingReviewJobs: GenerationJob[];
  pendingReviewVideoJobs: VideoJob[];
  inProgressJobs: GenerationJob[];
  inProgressVideoJobs: VideoJob[];
  quickReviewIdx: number;
  setQuickReviewIdx: (fn: number | ((prev: number) => number)) => void;
  selectedVariantIdxs: Set<number>;
  setSelectedVariantIdxs: (fn: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  quickReviewBusy: boolean;
  handleQuickReview: (action: 'approve' | 'reject') => Promise<void>;
  refreshVideoJobs: () => Promise<void>;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

/* ─── Component ──────────────────────────────────────────────────── */

export function NavbarQuickReviewModal({
  queueModalTab,
  setQueueModalTab,
  pendingReviewJobs,
  pendingReviewVideoJobs,
  inProgressJobs,
  inProgressVideoJobs,
  quickReviewIdx,
  setQuickReviewIdx,
  selectedVariantIdxs,
  setSelectedVariantIdxs,
  quickReviewBusy,
  handleQuickReview,
  refreshVideoJobs,
  onClose,
  onNavigate,
}: QuickReviewModalProps) {
  useEscapeKey(onClose);

  const totalInProgress = inProgressJobs.length + inProgressVideoJobs.length;
  const totalReview = pendingReviewJobs.length + pendingReviewVideoJobs.length;

  /* ── Video job approve/reject ─────────────────────────────────── */
  const [videoReviewBusy, setVideoReviewBusy] = useState<string | null>(null);

  const handleVideoReview = useCallback(async (jobId: string, action: 'approve' | 'reject') => {
    setVideoReviewBusy(jobId);
    try {
      if (action === 'approve') {
        await videoApi.approveJob(jobId);
      } else {
        await videoApi.rejectJob(jobId);
      }
      refreshVideoJobs();
    } catch (err) {
      logger.error('Video review failed', err);
    } finally {
      setVideoReviewBusy(null);
    }
  }, [refreshVideoJobs]);

  /* ── Inline AI review expand state ────────────────────────────── */
  const [expandedAiJobId, setExpandedAiJobId] = useState<string | null>(null);

  /* ── Tab content renderers ────────────────────────────────────── */

  const renderReviewContent = () => {
    if (totalReview === 0) {
      return (
        <div className="flex-col items-center justify-center flex-1 p-24">
          <div className={`mb-12 ${s.emptyIcon}`}>{'\u2705'}</div>
          <div className={`mb-8 ${s.modalTitle}`}>Alles beoordeeld!</div>
          <div className={s.textSecondary13}>
            Er zijn geen items meer die review nodig hebben.
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-16">
        {/* AI generation jobs needing review */}
        {pendingReviewJobs.map((j, idx) => {
          const isExpanded = expandedAiJobId === j.task_id;
          const thumb = j.output_variants?.[0]?.presigned_url || j.output_url;
          const isVideo = j.output_type === 'video' || j.output_variants?.[0]?.mime_type?.startsWith('video/');

          return (
            <div key={j.task_id} className={`rounded-8 mb-8 ${styles.jobRow}`}>
              {/* Row */}
              <div
                className="flex-row gap-12 p-12 cursor-pointer"
                onClick={() => setExpandedAiJobId(isExpanded ? null : j.task_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedAiJobId(isExpanded ? null : j.task_id); } }}
              >
                {/* Thumbnail */}
                {thumb && !isVideo ? (
                  <img
                    src={thumb}
                    alt=""
                    className={s.reviewThumb}
                  />
                ) : (
                  <div className={`${s.jobIcon} ${styles.jobIconStatus} ${s.jobIconBlue}`}>
                    {isVideo ? '\ud83c\udfa5' : '\ud83d\uddbc\ufe0f'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="fs-13 fw-600 text-primary">{j.label || j.template_id}</div>
                  <div className={s.textSecondary11}>
                    {j.output_type} {'\u00b7'} {new Date(j.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <div className="flex-row gap-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => { setQuickReviewIdx(idx); handleQuickReview('reject'); }}
                    disabled={quickReviewBusy}
                    className={`${s.btnSecondary} ${s.btnRejectXs}`}
                    title="Afwijzen"
                  >
                    {'\u2715'}
                  </button>
                  <button
                    onClick={() => { setQuickReviewIdx(idx); setSelectedVariantIdxs(new Set()); handleQuickReview('approve'); }}
                    disabled={quickReviewBusy}
                    className={`${s.btnPrimary} ${s.btnApproveXs}`}
                    title="Goedkeuren"
                  >
                    {'\u2713'}
                  </button>
                </div>
              </div>

              {/* Expanded preview */}
              {isExpanded && thumb && (
                <div className={`p-12 ${s.expandedPreview}`}>
                  {isVideo ? (
                    <video
                      src={thumb}
                      controls
                      muted
                      playsInline
                      autoPlay
                      loop
                      className={s.previewMedia}
                    />
                  ) : (
                    <img
                      src={thumb}
                      alt={j.label || 'Preview'}
                      className={s.previewMedia}
                    />
                  )}
                  {/* Multi-variant selector */}
                  {j.output_variants && j.output_variants.length > 1 && (
                    <div className="flex-row gap-8 mt-8 overflow-x-auto">
                      {j.output_variants.map((v) => (
                        <img
                          key={v.variant_index}
                          src={v.presigned_url}
                          alt={`Variant ${v.variant_index + 1}`}
                          onClick={() => setSelectedVariantIdxs((prev: Set<number>) => {
                            const next = new Set(prev);
                            if (next.has(v.variant_index)) next.delete(v.variant_index); else next.add(v.variant_index);
                            return next;
                          })}
                          className={s.variantThumb}
                          data-selected={selectedVariantIdxs.has(v.variant_index)}
                          data-dimmed={selectedVariantIdxs.size > 0 && !selectedVariantIdxs.has(v.variant_index)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Video jobs needing review */}
        {pendingReviewVideoJobs.map((j) => {
          const busy = videoReviewBusy === j.id;
          return (
            <div key={j.id} className={`flex-row gap-12 p-12 rounded-8 mb-8 ${styles.jobRow}`}>
              <div className={`${s.jobIcon} ${s.jobIconBlue}`}>
                {'\ud83c\udfa5'}
              </div>
              <div className="flex-1">
                <div className="fs-13 fw-600 text-primary">
                  {VIDEO_TYPE_LABELS[j.job_type] || j.job_type}
                </div>
                <div className={s.textSecondary11}>
                  Video {'\u00b7'} {new Date(j.created_at).toLocaleTimeString()}
                </div>
              </div>
              {j.output_url && (
                <a
                  href={j.output_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${s.btnSecondary} ${s.btnLinkXs}`}
                  title="Bekijk video"
                  onClick={(e) => e.stopPropagation()}
                >
                  {'\u25b6'}
                </a>
              )}
              <div className="flex-row gap-4">
                <button
                  onClick={() => handleVideoReview(j.id, 'reject')}
                  disabled={busy}
                  className={`${s.btnSecondary} ${s.btnRejectXs}`}
                  data-busy={busy}
                  title="Afwijzen"
                >
                  {'\u2715'}
                </button>
                <button
                  onClick={() => handleVideoReview(j.id, 'approve')}
                  disabled={busy}
                  className={`${s.btnPrimary} ${s.btnApproveXs}`}
                  data-busy={busy}
                  title="Goedkeuren"
                >
                  {'\u2713'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderInProgressContent = () => {
    if (totalInProgress === 0) {
      return (
        <div className="flex-col items-center justify-center flex-1 p-24">
          <div className={`mb-12 ${s.emptyIcon}`}>{'\u23f3'}</div>
          <div className={`mb-8 ${s.modalTitle}`}>Geen actieve jobs</div>
          <div className={s.textSecondary13}>
            Er zijn geen jobs in uitvoering.
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-16">
        {inProgressJobs.map((j) => (
          <div key={j.task_id} className={`flex-row gap-12 p-12 rounded-8 mb-8 ${styles.jobRow}`}>
            <div className={`${s.jobIcon} ${styles.jobIconStatus}`} data-processing={j.status === 'processing'}>
              {j.status === 'processing' ? '\u2699\ufe0f' : j.status === 'retrying' ? '\ud83d\udd04' : '\u23f3'}
            </div>
            <div className="flex-1">
              <div className="fs-13 fw-600 text-primary">{j.label || j.template_id}</div>
              <div className={s.textSecondary11}>
                {j.status === 'processing' ? 'Bezig...' : j.status === 'retrying' ? 'Opnieuw proberen...' : 'In wachtrij'} {'\u00b7'} {new Date(j.created_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {inProgressVideoJobs.map((j) => (
          <div key={j.id} className={`flex-row gap-12 p-12 rounded-8 mb-8 ${styles.jobRow}`}>
            <div className={`${s.jobIcon} ${styles.jobIconStatus}`} data-processing={j.status === 'processing'}>
              {j.status === 'processing' ? '\u2699\ufe0f' : '\u23f3'}
            </div>
            <div className="flex-1">
              <div className="fs-13 fw-600 text-primary">
                {VIDEO_TYPE_LABELS[j.job_type] || j.job_type}
              </div>
              <div className={s.textSecondary11}>
                {j.status === 'processing'
                  ? `Bezig... ${j.progress_percent > 0 ? `(${j.progress_percent}%)` : ''}`
                  : 'In wachtrij'} {'\u00b7'} {new Date(j.created_at).toLocaleTimeString()}
              </div>
            </div>
            {j.status === 'processing' && j.progress_percent > 0 && (
              <div className={`fs-12 fw-700 ${s.progressPercent}`}>
                {j.progress_percent}%
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  /* ── Render: single unified panel ────────────────────────────── */

  return (
    <div onClick={onClose} className={s.modalOverlay} role="presentation">
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full ${s.modalPanel} ${styles.inProgressPanel}`}
        role="dialog"
        aria-label="Queue"
      >
        {/* Header */}
        <div className={s.modalHeader}>
          <div className="flex-between mb-12">
            <div className={s.modalTitle}>Queue</div>
            <button onClick={onClose} className={s.closeBtn}>{'\u2715'}</button>
          </div>
          <div className={s.tabsRow}>
            <button
              onClick={() => { setQueueModalTab('review'); setQuickReviewIdx(0); setExpandedAiJobId(null); }}
              className={`${s.tabBtn} ${queueModalTab === 'review' ? styles.tabBtnReview : styles.tabBtnInactive}`}
              data-active={queueModalTab === 'review'}
            >
              Te Reviewen ({totalReview})
            </button>
            <button
              onClick={() => setQueueModalTab('in-progress')}
              className={`${s.tabBtn} ${queueModalTab === 'in-progress' ? styles.tabBtnAmberActive : styles.tabBtnInactive}`}
              data-active={queueModalTab === 'in-progress'}
            >
              In Progress ({totalInProgress})
            </button>
          </div>
        </div>

        {/* Content */}
        {queueModalTab === 'review' ? renderReviewContent() : renderInProgressContent()}

        {/* Footer */}
        <div className={`flex-between ${s.modalFooter}`}>
          <button
            onClick={() => { onClose(); onNavigate(queueModalTab === 'review' ? '/approvals?tab=review' : '/approvals?tab=ai_queue'); }}
            className={s.btnSecondary}
          >
            Open Queue {'\u2192'}
          </button>
          <button onClick={onClose} className={s.btnPrimary}>Sluiten</button>
        </div>
      </div>
    </div>
  );
}
