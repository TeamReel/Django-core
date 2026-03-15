import React from 'react';
import { Check, Zap, Calendar, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { CONTENT_TYPES, LINEUP_REQUIRED_SUBTYPES } from './matchWizardTypes';
import type { useMatchWizardData } from './useMatchWizardData';
import styles from './MatchWizard.module.css';

type Data = ReturnType<typeof useMatchWizardData>;

interface ReviewStepProps {
  pendingContent: Data['pendingContent'];
  selectedMatch: Data['selectedMatch'];
  lineupFormation: Data['lineupFormation'];
  filledPositions: Data['filledPositions'];
  totalPositions: Data['totalPositions'];
  saveError: Data['saveError'];
  handleReviewConfirm: Data['handleReviewConfirm'];
}

export function ReviewStep({
  pendingContent,
  selectedMatch,
  lineupFormation,
  filledPositions,
  totalPositions,
  saveError,
  handleReviewConfirm,
}: ReviewStepProps) {
  if (!pendingContent || !selectedMatch) return null;

  const allTypes = [...CONTENT_TYPES.pre, ...CONTENT_TYPES.during, ...CONTENT_TYPES.post];
  const ct = allTypes.find(c => c.key === pendingContent.key);
  if (!ct) return null;

  const Icon = ct.icon;
  const needsLineup = LINEUP_REQUIRED_SUBTYPES.has(ct.subtype);
  const matchDate = new Date(selectedMatch.start_time);

  return (
    <div className="flex-col gap-16">
      {/* Large preview */}
      <div className={styles.reviewPreview} data-output={ct.outputType}>
        {ct.thumbnail ? (
          <img src={ct.thumbnail} alt={ct.label} className={styles.reviewPreviewImg} loading="lazy" />
        ) : (
          <Icon size={48} className={styles.reviewPreviewIcon} />
        )}
        <span className={styles.reviewOutputBadge} data-output={ct.outputType}>
          {ct.outputType === 'video' ? 'VIDEO' : ct.outputType === 'image' ? 'IMAGE' : 'TEXT'}
        </span>
      </div>

      {/* Content type label */}
      <div className="text-center">
        <div className="fw-700 text-primary fs-18">{ct.label}</div>
        <div className="fs-13 text-muted mt-4">{ct.description}</div>
      </div>

      {/* Summary card */}
      <div className={styles.reviewCard}>
        <div className={styles.reviewRow}>
          <Calendar size={16} className={styles.reviewRowIcon} />
          <span className="fw-600 fs-14 text-primary">{selectedMatch.title}</span>
        </div>
        <div className={styles.reviewRow}>
          <Clock size={16} className={styles.reviewRowIcon} />
          <span className="fs-13 text-muted">
            {matchDate.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long' })}{' '}
            om {matchDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {selectedMatch.location && (
          <div className={styles.reviewRow}>
            <MapPin size={16} className={styles.reviewRowIcon} />
            <span className="fs-13 text-muted">{selectedMatch.location}</span>
          </div>
        )}
        {needsLineup && (
          <div className={styles.reviewRow}>
            <Check size={16} className={styles.reviewRowIcon} />
            <span className="fs-13 text-muted">
              Opstelling: {lineupFormation} &middot; {filledPositions}/{totalPositions} posities ingevuld
            </span>
          </div>
        )}
      </div>

      <div className={styles.reviewActionsInline}>
        {saveError && (
          <div className={styles.errorBannerCompact}>
            <AlertTriangle size={16} className={styles.errorIcon} />
            <span className="fs-13 flex-1">{saveError}</span>
          </div>
        )}
        <button
          onClick={handleReviewConfirm}
          className={`w-full rounded-12 border-none fw-600 cursor-pointer flex-center gap-8 text-white fs-15 ${styles.primaryBtn}`}
        >
          <Zap size={18} />Genereer content
        </button>
      </div>
    </div>
  );
}
