/**
 * MatchWizardSteps — Extracted step components for the Match Wizard
 *
 * Each step is now a standalone component that receives data via props.
 * This enables use with the generic Wizard system.
 */
import React from 'react';
import { ChevronRight, Check, Play, Clock, Calendar, MapPin, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import SmartEmptyState from '../SmartEmptyState';
import { formatRelativeTime, getDateUrgency } from '../../utils/relativeTime';
import { CONTENT_TYPES, LINEUP_REQUIRED_SUBTYPES, type ContentType, type ContentPhase } from '../matchWizardTypes';
import type { Activity } from '../../hooks/useActivities';
import styles from '../MatchWizard.module.css';

// ─── Step 1: Match Selection ──────────────────────────────

export interface MatchSelectStepProps {
  matches: Activity[];
  selectedMatch: Activity | null;
  loading: boolean;
  error: string | null;
  onSelectMatch: (match: Activity) => void;
  onRetry: () => void;
}

export function MatchSelectStep({
  matches,
  selectedMatch,
  loading,
  error,
  onSelectMatch,
  onRetry,
}: MatchSelectStepProps) {
  if (error) {
    return (
      <div className={styles.errorBanner}>
        <AlertTriangle size={20} className={styles.errorIcon} />
        <div className="flex-1-min">
          <div className="fw-600 fs-14 text-primary">Fout bij laden</div>
          <div className="fs-13 text-muted">{error}</div>
        </div>
        <button onClick={onRetry} className={styles.retryBtn}>
          <RefreshCw size={16} />Opnieuw
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center p-32 text-muted">Laden...</div>;
  }

  if (matches.length === 0) {
    return <SmartEmptyState type="matches" compact hideActions />;
  }

  return (
    <div className="flex-col gap-10">
      {matches.map((match) => {
        const isSelected = selectedMatch?.id === match.id;
        const date = new Date(match.start_time);
        const relativeTime = formatRelativeTime(date, 'nl');
        const urgency = getDateUrgency(date);

        return (
          <button
            key={match.id}
            onClick={() => onSelectMatch(match)}
            className={styles.matchCard}
            data-selected={isSelected}
          >
            <div
              className={`rounded-12 flex-center fw-700 fs-14 ${styles.dateBadge}`}
              data-urgency={urgency}
            >
              {date.getDate()}
            </div>
            <div className="flex-1-min">
              <div className="fw-600 text-primary truncate fs-15">{match.title}</div>
              <div className="fs-13 text-muted">
                {relativeTime} &middot; {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            {isSelected
              ? <Check size={22} className={styles.iconCheck} />
              : <ChevronRight size={20} className={styles.iconChevron} />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Step 2: Content Type Selection ───────────────────────

export interface ContentTypeStepProps {
  selectedPhase: ContentPhase;
  onPhaseChange: (phase: ContentPhase) => void;
  onContentSelect: (content: ContentType) => void;
  error: string | null;
  onRetry: () => void;
}

export function ContentTypeStep({
  selectedPhase,
  onPhaseChange,
  onContentSelect,
  error,
  onRetry,
}: ContentTypeStepProps) {
  const phases = [
    { key: 'pre' as const, label: 'Voor', icon: Clock },
    { key: 'during' as const, label: 'Tijdens', icon: Play },
    { key: 'post' as const, label: 'Na', icon: Check },
  ];

  return (
    <div className="flex-col gap-16">
      {/* Phase tabs */}
      <div className={`flex-row gap-4 bg-surface-2 rounded-10 ${styles.phaseTabBar}`}>
        {phases.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onPhaseChange(key)}
            className={`flex-1 flex-center gap-6 rounded-8 border-none fs-13 cursor-pointer transition ${styles.phaseTab}`}
            data-active={selectedPhase === key}
          >
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={20} className={styles.errorIcon} />
          <div className="flex-1-min">
            <div className="fw-600 fs-14 text-primary">Sjablonen laden mislukt</div>
            <div className="fs-13 text-muted">{error}</div>
          </div>
          <button onClick={onRetry} className={styles.retryBtn}>
            <RefreshCw size={16} />Opnieuw
          </button>
        </div>
      )}

      {/* Content type cards */}
      <div className="flex-col gap-10">
        {CONTENT_TYPES[selectedPhase].map((content) => {
          const Icon = content.icon;
          const needsLineup = LINEUP_REQUIRED_SUBTYPES.has(content.subtype);

          return (
            <button
              key={content.key}
              onClick={() => onContentSelect(content)}
              className={styles.contentCard}
            >
              <div className={styles.thumbArea} data-output={content.outputType}>
                {content.thumbnail ? (
                  <img src={content.thumbnail} alt={content.label} className={styles.thumbImg} />
                ) : (
                  <Icon size={28} className={styles.thumbIcon} />
                )}
                <span className={styles.outputBadge} data-output={content.outputType}>
                  {content.outputType === 'video' ? 'VIDEO' : content.outputType === 'image' ? 'IMAGE' : 'TEXT'}
                </span>
              </div>
              <div className="flex-1-min">
                <div className="fw-600 text-primary fs-15">{content.label}</div>
                <div className="fs-12 text-muted leading-body">
                  {content.description}{needsLineup && ' · Opstelling nodig'}
                </div>
              </div>
              <ChevronRight size={20} className={styles.iconChevron} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 5: Review & Confirm ─────────────────────────────

export interface ReviewStepProps {
  selectedMatch: Activity;
  contentLabel: string;
  contentDescription: string;
  contentIcon: typeof Calendar;
  outputType: 'video' | 'image' | 'text';
  thumbnail?: string;
  lineupFormation?: string;
  filledPositions?: number;
  totalPositions?: number;
  needsLineup: boolean;
  saveError: string | null;
  onConfirm: () => void;
}

export function ReviewStep({
  selectedMatch,
  contentLabel,
  contentDescription,
  contentIcon: Icon,
  outputType,
  thumbnail,
  lineupFormation,
  filledPositions,
  totalPositions,
  needsLineup,
  saveError,
  onConfirm,
}: ReviewStepProps) {
  const matchDate = new Date(selectedMatch.start_time);

  return (
    <div className="flex-col gap-16">
      {/* Large preview */}
      <div className={styles.reviewPreview} data-output={outputType}>
        {thumbnail ? (
          <img src={thumbnail} alt={contentLabel} className={styles.reviewPreviewImg} />
        ) : (
          <Icon size={48} className={styles.reviewPreviewIcon} />
        )}
        <span className={styles.reviewOutputBadge} data-output={outputType}>
          {outputType === 'video' ? 'VIDEO' : outputType === 'image' ? 'IMAGE' : 'TEXT'}
        </span>
      </div>

      {/* Content type label */}
      <div className="text-center">
        <div className="fw-700 text-primary fs-18">{contentLabel}</div>
        <div className="fs-13 text-muted mt-4">{contentDescription}</div>
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
        {needsLineup && lineupFormation && (
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
          onClick={onConfirm}
          className={`w-full rounded-12 border-none fw-600 cursor-pointer flex-center gap-8 text-white fs-15 ${styles.primaryBtn}`}
        >
          <Zap size={18} />Genereer content
        </button>
      </div>
    </div>
  );
}
