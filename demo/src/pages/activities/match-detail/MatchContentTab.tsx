import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Wand2, X } from 'lucide-react';
import { getAssetUrl } from '@/hooks/useBrandProfile';
import {
  CONTENT_TYPES,
  type ContentTemplate,
} from '../../identity/ContentGenerationModal';
import type { MatchMediaItem } from '@/components/MediaAssetCard';
import type {
  Organisation,
  MatchDetail,
  Period,
  ContentItem,
  SavedAssetPreview,
} from './types';
import { ContentRow, getSyntheticTemplate } from './MatchContentComponents';
import styles from './MatchContentTab.module.css';

interface QueueItem {
  subtype: string;
  label: string;
}

interface MatchContentTabProps {
  match: MatchDetail;
  org: Organisation | null;
  competition: Period | null;
  templatesLoading: boolean;
  matchMediaLoading: boolean;
  isContentModalOpen: boolean;
  availableTemplates: Record<string, ContentTemplate[]>;
  getLatestMediaForSubtype: (subtype: string) => MatchMediaItem | null;
  getMediaHistoryForSubtype: (subtype: string) => MatchMediaItem[];
  getContentItemForSubtype: (subtype: string) => ContentItem | null;
  openContentModal: (template?: ContentTemplate, label?: string) => void;
  setSavedAssetPreview: (preview: SavedAssetPreview) => void;
  handleDeleteMediaItem: (item: MatchMediaItem) => void;
  handleRestoreMediaItem: (item: MatchMediaItem) => void;
}

export default function MatchContentTab({
  match,
  org,
  competition,
  templatesLoading,
  matchMediaLoading,
  isContentModalOpen,
  availableTemplates,
  getLatestMediaForSubtype,
  getMediaHistoryForSubtype,
  getContentItemForSubtype,
  openContentModal,
  setSavedAssetPreview,
  handleDeleteMediaItem,
  handleRestoreMediaItem,
}: MatchContentTabProps) {

  // ── Generate-All queue ──────────────────────────────────────────────
  const [generateAllActive, setGenerateAllActive] = useState(false);
  const [generateAllTotal, setGenerateAllTotal] = useState(0);
  const [generateAllDone, setGenerateAllDone] = useState(0);
  const generateAllQueueRef = useRef<QueueItem[]>([]);
  const prevModalOpenRef = useRef(false);

  /** Resolve the best matching template for a given subtype */
  const resolveTemplate = (subtype: string): ContentTemplate | undefined => {
    const templates = availableTemplates[subtype] || [];
    if ((subtype === 'lineup' || subtype === 'lineup_flyer') && templates.length > 0) {
      const formation = match?.metadata?.formation;
      if (formation) {
        const found = templates.find(
          (t) => t.formation_detail?.code === formation ||
            t.name.toLowerCase().includes(formation.toLowerCase().replace(/-/g, ''))
        );
        if (found) return found;
      }
      return templates[0];
    }
    return templates[0];
  };

  /** Open content generation for a given subtype */
  const handleGenerate = (subtype: string, label: string) => {
    const matched = resolveTemplate(subtype);
    if (matched) {
      openContentModal(matched, label);
    } else {
      const synthetic = getSyntheticTemplate(subtype);
      if (synthetic) {
        openContentModal(synthetic, label);
      } else {
        openContentModal(undefined, label);
      }
    }
  };

  /** Open preview overlay for a media item */
  const handlePreview = (mi: MatchMediaItem, label: string) => {
    const previewUrl = mi.file_url || getAssetUrl(mi.storage_path);
    if (previewUrl) {
      const isVid = Boolean(
        mi.mime_type?.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(previewUrl)
      );
      setSavedAssetPreview({ title: label, subtitle: 'Match media', url: previewUrl, isVideo: isVid });
    }
  };

  // ── Generate-All helpers ────────────────────────────────────────────

  /** Build list of subtypes that still need content */
  const pendingItems = useMemo<QueueItem[]>(() => {
    const items: QueueItem[] = [];
    for (const categoryKey of ['pre_match', 'during_match', 'post_match'] as const) {
      const category = CONTENT_TYPES[categoryKey];
      if (!category) continue;
      for (const item of category.items) {
        if (!item.enabled) continue;
        if (item.subtype === 'goal') continue; // goal is per-instance, skip in batch
        if (getLatestMediaForSubtype(item.subtype)) continue; // already has media
        const existing = getContentItemForSubtype(item.subtype);
        if (existing && ['queued', 'generating'].includes(existing.status)) continue;
        const hasTemplate = !!resolveTemplate(item.subtype);
        const templateNotRequired = ['match_intro', 'goal', 'poster', 'lineup_flyer'].includes(item.subtype);
        if (!hasTemplate && !templateNotRequired) continue;
        items.push({ subtype: item.subtype, label: item.label });
      }
    }
    return items;
  }, [availableTemplates, match, getLatestMediaForSubtype, getContentItemForSubtype]);

  /** Stable ref for opening the next queue item (avoids stale closures) */
  const openNextRef = useRef<() => void>(() => {});
  openNextRef.current = () => {
    const next = generateAllQueueRef.current.shift();
    if (next) {
      handleGenerate(next.subtype, next.label);
    } else {
      setGenerateAllActive(false);
    }
  };

  /** Watch modal close → auto-open next queued item */
  useEffect(() => {
    const wasOpen = prevModalOpenRef.current;
    prevModalOpenRef.current = isContentModalOpen;
    if (wasOpen && !isContentModalOpen && generateAllActive) {
      setGenerateAllDone(prev => prev + 1);
      // Small delay to let modal close animation finish
      const timer = setTimeout(() => openNextRef.current(), 250);
      return () => clearTimeout(timer);
    }
  }, [isContentModalOpen, generateAllActive]);

  /** Start batch generation */
  const handleGenerateAll = () => {
    if (pendingItems.length === 0) return;
    generateAllQueueRef.current = pendingItems.slice(1);
    setGenerateAllTotal(pendingItems.length);
    setGenerateAllDone(0);
    setGenerateAllActive(true);
    handleGenerate(pendingItems[0].subtype, pendingItems[0].label);
  };

  /** Cancel batch generation */
  const handleCancelGenerateAll = () => {
    generateAllQueueRef.current = [];
    setGenerateAllActive(false);
  };

  if (matchMediaLoading) {
    return (
      <div className={`text-center text-muted ${styles.loadingContainer}`}>
        <div className={`mb-8 ${styles.loadingIcon}`}></div>
        <div>Media laden...</div>
      </div>
    );
  }

  return (
    <div className="flex-col gap-16">

      {/* ── Generate All bar ───────────────────────────────────── */}
      {!matchMediaLoading && (
        <div className={styles.generateAllBar}>
          {generateAllActive ? (
            <>
              <div className={styles.generateAllProgress}>
                <span className="fs-13 fw-600">
                  {generateAllDone} van {generateAllTotal} items
                </span>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${generateAllTotal > 0 ? (generateAllDone / generateAllTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleCancelGenerateAll}
                aria-label="Annuleer batch generatie"
              >
                <X size={16} />
                <span className="hide-mobile">Annuleer</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.generateAllBtn}
              onClick={handleGenerateAll}
              disabled={pendingItems.length === 0}
              aria-label={`Genereer alle ${pendingItems.length} ontbrekende items`}
            >
              <Wand2 size={16} />
              Genereer alles
              {pendingItems.length > 0 && (
                <span className={styles.pendingBadge}>{pendingItems.length}</span>
              )}
            </button>
          )}
        </div>
      )}

      {(['pre_match', 'during_match', 'post_match'] as const).map((categoryKey) => {
        const category = CONTENT_TYPES[categoryKey];
        if (!category) return null;

        return (
          <div key={categoryKey}>
            {/* Section header */}
            <div className={`fs-11 fw-700 mb-8 ${styles.sectionHeader}`}>
              {category.label}
            </div>

            {/* Content rows */}
            <div className={`overflow-hidden ${styles.contentRowsContainer}`}>
              {category.items.map((item, idx) => {
                const existingItem = getContentItemForSubtype(item.subtype);
                const isGenerating = existingItem != null && ['queued', 'generating'].includes(existingItem.status);
                const isFailed = existingItem?.status === 'failed';
                const workflowStatus =
                  existingItem?.status === 'approved' ? 'approved'
                  : existingItem?.status === 'rejected' ? 'rejected'
                  : null;

                const latestMedia = getLatestMediaForSubtype(item.subtype);
                const mediaUrl = latestMedia
                  ? (latestMedia.file_url || getAssetUrl(latestMedia.storage_path))
                  : null;
                const isVideo = Boolean(
                  latestMedia?.mime_type?.startsWith('video/') ||
                  (mediaUrl ? /\.(mp4|webm|mov)$/i.test(mediaUrl) : false)
                );

                const hasTemplate = !!resolveTemplate(item.subtype);
                const templateNotRequired = ['match_intro', 'goal', 'poster', 'lineup_flyer'].includes(item.subtype);
                const canGenerate = hasTemplate || templateNotRequired;

                // For goal celebrations, show each existing item as its own row + a "new" row
                const isMultiSubtype = item.subtype === 'goal';
                if (isMultiSubtype) {
                  const allGoalMedia: MatchMediaItem[] = [];
                  const latest = getLatestMediaForSubtype(item.subtype);
                  if (latest) allGoalMedia.push(latest);
                  const history = getMediaHistoryForSubtype(item.subtype);
                  allGoalMedia.push(...history);

                  // Sort newest first
                  allGoalMedia.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                  const rows: React.ReactNode[] = [];

                  // Existing goal celebrations
                  allGoalMedia.forEach((mi, goalIdx) => {
                    const goalUrl = mi.file_url || getAssetUrl(mi.storage_path);
                    const goalIsVideo = Boolean(
                      mi.mime_type?.startsWith('video/') ||
                      (goalUrl ? /\.(mp4|webm|mov)$/i.test(goalUrl) : false)
                    );
                    const goalLabel = `${item.label} #${allGoalMedia.length - goalIdx}`;
                    rows.push(
                      <ContentRow
                        key={`goal-${mi.id}`}
                        label={goalLabel}
                        icon={item.icon}
                        mediaUrl={goalUrl}
                        isVideo={goalIsVideo}
                        hasMedia={true}
                        isGenerating={false}
                        isFailed={false}
                        workflowStatus={null}
                        canGenerate={canGenerate}
                        showBorder={true}
                        onPreview={() => handlePreview(mi, goalLabel)}
                        onGenerate={() => handleGenerate(item.subtype, item.label)}
                        itemLabel={goalLabel}
                        updatedAt={mi.updated_at}
                      />
                    );
                  });

                  // Always show a "new goal celebration" row
                  rows.push(
                    <ContentRow
                      key={`goal-new`}
                      label={allGoalMedia.length > 0 ? '+ Nieuw doelpunt' : item.label}
                      icon={allGoalMedia.length > 0 ? 'plus' : item.icon}
                      mediaUrl={null}
                      isVideo={false}
                      hasMedia={false}
                      isGenerating={isGenerating}
                      isFailed={isFailed}
                      workflowStatus={workflowStatus}
                      canGenerate={canGenerate}
                      showBorder={idx < category.items.length - 1}
                      onPreview={() => {}}
                      onGenerate={() => handleGenerate(item.subtype, item.label)}
                      itemLabel={item.label}
                      updatedAt={null}
                    />
                  );

                  return <React.Fragment key={item.id}>{rows}</React.Fragment>;
                }

                return (
                  <ContentRow
                    key={item.id}
                    label={item.label}
                    icon={item.icon}
                    mediaUrl={mediaUrl}
                    isVideo={isVideo}
                    hasMedia={!!latestMedia}
                    isGenerating={isGenerating}
                    isFailed={isFailed}
                    workflowStatus={workflowStatus}
                    canGenerate={canGenerate}
                    showBorder={idx < category.items.length - 1}
                    onPreview={() => latestMedia && handlePreview(latestMedia, item.label)}
                    onGenerate={() => handleGenerate(item.subtype, item.label)}
                    itemLabel={item.label}
                    updatedAt={latestMedia?.updated_at}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
