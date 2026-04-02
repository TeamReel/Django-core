/**
 * ReviewStep – Step 5: Review and confirm generation
 */
import React from 'react';
import { Calendar, Clock, MapPin, Check, AlertTriangle, Zap } from 'lucide-react';
import { useWizard } from '../../Wizard';
import { useMatchWizard } from '../MatchWizardContext';
import { CONTENT_TYPES, LINEUP_REQUIRED_SUBTYPES } from '../types';
import { useSquadReadiness } from '../../../hooks/useSquadReadiness';
import styles from '../MatchWizardV2.module.css';

export interface ReviewStepProps {
  onGenerate: () => Promise<string | undefined>;
  saveError: string | null;
}

export function ReviewStep({ onGenerate, saveError }: ReviewStepProps) {
  const { setSubmitting, goTo } = useWizard();
  const {
    selectedMatch,
    pendingContent,
    lineupFormation,
    filledPositions,
    totalPositions,
  } = useMatchWizard();

  const projectId = selectedMatch?.project?.id
    ? String(selectedMatch.project.id)
    : undefined;

  const { data: readiness } = useSquadReadiness(projectId);

  if (!selectedMatch || !pendingContent) {
    return <div className="text-center p-32 text-muted">Geen content geselecteerd</div>;
  }

  // Find content type info
  const allTypes = [...CONTENT_TYPES.pre, ...CONTENT_TYPES.during, ...CONTENT_TYPES.post];
  const ct = allTypes.find(c => c.key === pendingContent.key);
  if (!ct) return null;

  const Icon = ct.icon;
  const needsLineup = LINEUP_REQUIRED_SUBTYPES.has(ct.subtype);
  const matchDate = new Date(selectedMatch.start_time);

  const missingCount = readiness
    ? readiness.total_members - readiness.ready_members
    : 0;
  const showReadinessWarning = needsLineup && readiness && missingCount > 0;

  const handleConfirm = async () => {
    setSubmitting(true);
    goTo('generating');

    try {
      const result = await onGenerate();

      switch (result) {
        case 'success':
          goTo('success');
          break;
        case 'video_queued':
          goTo('video_queued');
          break;
        case 'error':
          goTo('error');
          break;
        case 'abort':
          // User cancelled — stay on generating (will be handled by close)
          break;
        default:
          // Unexpected result or undefined (e.g. validation error) — go back to review
          goTo('review');
          break;
      }
    } catch {
      goTo('error');
    } finally {
      setSubmitting(false);
    }
  };

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

      {/* Actions */}
      <div className={styles.stepActions}>
        {showReadinessWarning && (
          <div className={styles.warnBannerCompact}>
            <AlertTriangle size={16} className={styles.warnIcon} />
            <span className="fs-13 flex-1">
              {missingCount} {missingCount === 1 ? 'speler mist' : 'spelers missen'} een foto — {missingCount === 1 ? 'deze krijgt' : 'deze krijgen'} een silhouet
            </span>
          </div>
        )}
        {saveError && (
          <div className={styles.errorBannerCompact}>
            <AlertTriangle size={16} className={styles.errorIcon} />
            <span className="fs-13 flex-1">{saveError}</span>
          </div>
        )}
        <button
          onClick={handleConfirm}
          className={`w-full rounded-12 border-none fw-600 cursor-pointer flex-center gap-8 text-white fs-15 ${styles.primaryBtn}`}
        >
          <Zap size={18} />Genereer content
        </button>
      </div>
    </div>
  );
}
