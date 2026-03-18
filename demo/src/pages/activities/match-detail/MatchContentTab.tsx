import React from 'react';
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

interface MatchContentTabProps {
  match: MatchDetail;
  org: Organisation | null;
  competition: Period | null;
  templatesLoading: boolean;
  matchMediaLoading: boolean;
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
  availableTemplates,
  getLatestMediaForSubtype,
  getMediaHistoryForSubtype,
  getContentItemForSubtype,
  openContentModal,
  setSavedAssetPreview,
  handleDeleteMediaItem,
  handleRestoreMediaItem,
}: MatchContentTabProps) {

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
