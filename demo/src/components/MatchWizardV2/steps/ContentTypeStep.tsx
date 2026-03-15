/**
 * ContentTypeStep – Step 2: Select content type
 *
 * C2: Auto-selects the content phase (pre/during/post) based on
 * match.start_time using useMatchPhase. User can still switch manually.
 *
 * Groups content items by output type (Video / Afbeelding / Tekst) for
 * clearer visual hierarchy. Phase tabs use a modern segmented control style.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { ChevronRight, Clock, Play, Check, AlertTriangle, RefreshCw, Video, Image, FileText } from 'lucide-react';
import { useWizard } from '../../Wizard';
import { useMatchWizard } from '../MatchWizardContext';
import { useTemplatesData } from '../hooks';
import { useMatchPhase } from '@/hooks/useMatchPhase';
import { CONTENT_TYPES, LINEUP_REQUIRED_SUBTYPES, HAS_OPTIONS_SUBTYPES, type ContentType, type OutputType } from '../types';
import styles from '../MatchWizardV2.module.css';

/* ── Output-type group metadata ────────────────────────── */
const OUTPUT_GROUP_META: Record<OutputType, { label: string; icon: React.ElementType }> = {
  video: { label: 'Video', icon: Video },
  image: { label: 'Afbeelding', icon: Image },
  text: { label: 'Tekst', icon: FileText },
};

const OUTPUT_ORDER: OutputType[] = ['video', 'image', 'text'];

export function ContentTypeStep() {
  const { goTo } = useWizard();
  const {
    selectedContentPhase,
    setSelectedContentPhase,
    setPendingContent,
    templatesError,
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
    setPendingContent({
      key: content.key,
      label: content.label,
      subtype: content.subtype,
      templateType: content.templateType,
    });

    selectTemplateForSubtype(content.subtype);

    if (LINEUP_REQUIRED_SUBTYPES.has(content.subtype)) {
      goTo('lineup');
    } else if (HAS_OPTIONS_SUBTYPES.has(content.subtype)) {
      goTo('options');
    } else {
      goTo('review');
    }
  };

  // Group items by output type
  const groupedItems = useMemo(() => {
    const items = CONTENT_TYPES[selectedContentPhase];
    const groups: Partial<Record<OutputType, ContentType[]>> = {};
    for (const item of items) {
      (groups[item.outputType] ??= []).push(item);
    }
    return OUTPUT_ORDER
      .filter((t) => groups[t] && groups[t]!.length > 0)
      .map((t) => ({ type: t, ...OUTPUT_GROUP_META[t], items: groups[t]! }));
  }, [selectedContentPhase]);

  const phases = [
    { key: 'pre' as const, label: 'Voor', icon: Clock },
    { key: 'during' as const, label: 'Tijdens', icon: Play },
    { key: 'post' as const, label: 'Na', icon: Check },
  ];

  return (
    <div className="flex-col gap-16">
      {/* Phase segmented control */}
      <div className={styles.phaseTabBar}>
        {phases.map(({ key, label, icon: Icon }) => {
          const isActive = selectedContentPhase === key;
          const isRecommended = matchPhase.confidence === 'auto' && matchPhase.phase === key;
          const count = CONTENT_TYPES[key].length;
          return (
            <button
              key={key}
              onClick={() => setSelectedContentPhase(key)}
              className={styles.phaseTab}
              data-active={isActive}
              aria-pressed={isActive}
            >
              <Icon size={15} />
              <span className={styles.phaseTabLabel}>{label}</span>
              <span className={styles.phaseTabCount}>{count}</span>
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

      {/* Grouped content type cards */}
      <div className="flex-col gap-20">
        {groupedItems.map(({ type, label: groupLabel, icon: GroupIcon, items }) => (
          <section key={type} className={styles.contentGroup}>
            <header className={styles.contentGroupHeader}>
              <GroupIcon size={14} className={styles.contentGroupIcon} data-output={type} />
              <span className={styles.contentGroupLabel}>{groupLabel}</span>
              <span className={styles.contentGroupCount}>{items.length}</span>
            </header>

            <div className={styles.contentGroupGrid} data-output={type}>
              {items.map((content) => {
                const Icon = content.icon;
                const needsLineup = LINEUP_REQUIRED_SUBTYPES.has(content.subtype);

                return (
                  <button
                    key={content.key}
                    onClick={() => handleContentSelect(content)}
                    className={styles.contentCard}
                    data-output={content.outputType}
                  >
                    <div className={styles.thumbArea} data-output={content.outputType}>
                      {content.thumbnail ? (
                        <img src={content.thumbnail} alt={content.label} className={styles.thumbImg} loading="lazy" />
                      ) : (
                        <Icon size={24} className={styles.thumbIcon} />
                      )}
                    </div>
                    <div className={styles.contentCardBody}>
                      <div className={styles.contentCardTitle}>{content.label}</div>
                      <div className={styles.contentCardDesc}>
                        {content.description}{needsLineup && ' · Opstelling nodig'}
                      </div>
                    </div>
                    <ChevronRight size={18} className={styles.contentCardChevron} />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
