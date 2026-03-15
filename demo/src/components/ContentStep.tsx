import React from 'react';
import { ChevronRight, Check, Play, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { CONTENT_TYPES, LINEUP_REQUIRED_SUBTYPES, type ContentType } from './matchWizardTypes';
import type { useMatchWizardData } from './useMatchWizardData';
import styles from './MatchWizard.module.css';

type Data = ReturnType<typeof useMatchWizardData>;

interface ContentStepProps {
  selectedContentPhase: Data['selectedContentPhase'];
  setSelectedContentPhase: Data['setSelectedContentPhase'];
  templatesError: Data['templatesError'];
  retryTemplates: Data['retryTemplates'];
  handleContentSelect: Data['handleContentSelect'];
}

export function ContentStep({
  selectedContentPhase,
  setSelectedContentPhase,
  templatesError,
  retryTemplates,
  handleContentSelect,
}: ContentStepProps) {
  return (
    <div className="flex-col gap-16">
      {/* Phase tabs */}
      <div className={`flex-row gap-4 bg-surface-2 rounded-10 ${styles.phaseTabBar}`}>
        {([
          { key: 'pre', label: 'Voor', icon: Clock },
          { key: 'during', label: 'Tijdens', icon: Play },
          { key: 'post', label: 'Na', icon: Check },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key}
            onClick={() => setSelectedContentPhase(key)}
            className={`flex-1 flex-center gap-6 rounded-8 border-none fs-13 cursor-pointer transition ${styles.phaseTab}`}
            data-active={selectedContentPhase === key}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Content type cards */}
      {templatesError ? (
        <div className={styles.errorBanner}>
          <AlertTriangle size={20} className={styles.errorIcon} />
          <div className="flex-1-min">
            <div className="fw-600 fs-14 text-primary">Sjablonen laden mislukt</div>
            <div className="fs-13 text-muted">{templatesError}</div>
          </div>
          <button onClick={retryTemplates} className={styles.retryBtn}>
            <RefreshCw size={16} />Opnieuw
          </button>
        </div>
      ) : null}
      <div className="flex-col gap-10">
        {CONTENT_TYPES[selectedContentPhase].map((content: ContentType) => {
          const Icon = content.icon;
          const needsLineup = LINEUP_REQUIRED_SUBTYPES.has(content.subtype);
          return (
            <button key={content.key}
              onClick={() => handleContentSelect(content.key, content.label, content.subtype, content.templateType)}
              className={styles.contentCard}>
              <div className={styles.thumbArea} data-output={content.outputType}>
                {content.thumbnail ? (
                  <img src={content.thumbnail} alt={content.label} className={styles.thumbImg} loading="lazy" />
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
