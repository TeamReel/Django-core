/**
 * ContentTypeStep – Step 2: Select content type
 *
 * C2: Auto-selects the content phase (pre/during/post) based on
 * match.start_time using useMatchPhase. User can still switch manually.
 */
import React, { useEffect, useRef } from 'react';
import { ChevronRight, Clock, Play, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { useWizard } from '../../Wizard';
import { useMatchWizard } from '../MatchWizardContext';
import { useTemplatesData } from '../hooks';
import { useMatchPhase } from '../../../hooks/useMatchPhase';
import { CONTENT_TYPES, LINEUP_REQUIRED_SUBTYPES, HAS_OPTIONS_SUBTYPES, type ContentType } from '../types';
import styles from '../MatchWizardV2.module.css';

export function ContentTypeStep() {
  const { goTo } = useWizard();
  const {
    selectedContentPhase,
    setSelectedContentPhase,
    setPendingContent,
    templatesError,
    isLineupRequired,
    hasOptions,
  } = useMatchWizard();

  const { fetchTemplates, selectTemplateForSubtype } = useTemplatesData();

  // C2: Detect phase from match time
  const { selectedMatch } = useMatchWizard();
  const matchPhase = useMatchPhase(selectedMatch?.start_time);
  const hasAutoSelected = useRef(false);

  // Fetch templates when step mounts
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Auto-select phase once when step first mounts
  useEffect(() => {
    if (!hasAutoSelected.current && matchPhase.confidence === 'auto') {
      setSelectedContentPhase(matchPhase.phase);
      hasAutoSelected.current = true;
    }
  }, [matchPhase.phase, matchPhase.confidence, setSelectedContentPhase]);

  const handleContentSelect = (content: ContentType) => {
    // Set pending content
    setPendingContent({
      key: content.key,
      label: content.label,
      subtype: content.subtype,
      templateType: content.templateType,
    });

    // Resolve and set template
    selectTemplateForSubtype(content.subtype);

    // Navigate based on content requirements
    if (LINEUP_REQUIRED_SUBTYPES.has(content.subtype)) {
      goTo('lineup');
    } else if (HAS_OPTIONS_SUBTYPES.has(content.subtype)) {
      goTo('options');
    } else {
      goTo('review');
    }
  };

  const phases = [
    { key: 'pre' as const, label: 'Voor', icon: Clock },
    { key: 'during' as const, label: 'Tijdens', icon: Play },
    { key: 'post' as const, label: 'Na', icon: Check },
  ];

  return (
    <div className="flex-col gap-16">
      {/* Phase tabs */}
      <div className={`flex-row gap-4 bg-surface-2 rounded-10 ${styles.phaseTabBar}`}>
        {phases.map(({ key, label, icon: Icon }) => {
          const isRecommended = matchPhase.confidence === 'auto' && matchPhase.phase === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedContentPhase(key)}
              className={`flex-1 flex-center gap-6 rounded-8 border-none fs-13 cursor-pointer transition ${styles.phaseTab}`}
              data-active={selectedContentPhase === key}
            >
              <Icon size={14} />{label}
              {isRecommended && <span className={styles.phaseRecommendedDot} />}
            </button>
          );
        })}
      </div>

      {/* Phase hint */}
      {matchPhase.confidence === 'auto' && (
        <div className={styles.phaseHint}>
          {matchPhase.hint}
        </div>
      )}

      {/* Error banner */}
      {templatesError && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={20} className={styles.errorIcon} />
          <div className="flex-1-min">
            <div className="fw-600 fs-14 text-primary">Sjablonen laden mislukt</div>
            <div className="fs-13 text-muted">{templatesError}</div>
          </div>
          <button onClick={fetchTemplates} className={styles.retryBtn}>
            <RefreshCw size={16} />Opnieuw
          </button>
        </div>
      )}

      {/* Content type cards */}
      <div className="flex-col gap-10">
        {CONTENT_TYPES[selectedContentPhase].map((content) => {
          const Icon = content.icon;
          const needsLineup = LINEUP_REQUIRED_SUBTYPES.has(content.subtype);

          return (
            <button
              key={content.key}
              onClick={() => handleContentSelect(content)}
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
                <div className="fs-12 text-muted" style={{ lineHeight: 1.4 }}>
                  {content.description}{needsLineup && ' · Opstelling nodig'}
                </div>
              </div>
              <ChevronRight size={20} className="text-muted" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
