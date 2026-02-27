import React from 'react';
import { Card, Badge } from '@django-core/design-system';
import { getAssetUrl } from '../../../hooks/useBrandProfile';
import {
  CONTENT_TYPES,
  type ContentTemplate,
} from '../../identity/ContentGenerationModal';
import {
  MediaAssetCard,
  MediaAssetGrid,
  type MatchMediaItem,
} from '../../../components/MediaAssetCard';
import type {
  Organisation,
  MatchDetail,
  Period,
  ContentItem,
  SavedAssetPreview,
} from './types';

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
  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* Sport info header */}
      {(competition?.sport || org?.sport) && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Templates for:{' '}
            <Badge variant="info" size="sm">
              {competition?.sport?.sport_icon ||
                org?.sport?.sport_icon ||
                '⚽'}{' '}
              {competition?.sport?.name || org?.sport?.name}
            </Badge>
            {match?.metadata?.formation && (
              <Badge
                variant="default"
                size="sm"
                style={{ marginLeft: '8px' }}
              >
                Formation: {match.metadata.formation}
              </Badge>
            )}
          </div>
          {templatesLoading && (
            <div className="text-sm text-gray-400">Loading templates...</div>
          )}
        </div>
      )}

      {/* Match content types grouped by phase — MediaAssetCard tiles */}
      {matchMediaLoading ? (
        <Card title="Content">
          <div className="text-center py-8 text-gray-400">
            <div className="text-2xl mb-2">⏳</div>
            <p>Loading media...</p>
          </div>
        </Card>
      ) : (
        (['pre_match', 'during_match', 'post_match'] as const).map(
          (categoryKey) => {
            const category = CONTENT_TYPES[categoryKey];
            if (!category) return null;
            return (
              <Card key={categoryKey} title={category.label}>
                <MediaAssetGrid>
                  {category.items.map((item) => {
                    // Get all templates for this subtype
                    const templates = availableTemplates[item.subtype] || [];
                    let matchedTemplate: ContentTemplate | undefined;

                    // Special handling for lineup: match on formation
                    if (
                      (item.subtype === 'lineup' ||
                        item.subtype === 'lineup_flyer') &&
                      templates.length > 0
                    ) {
                      const matchFormation = match?.metadata?.formation;
                      if (matchFormation) {
                        matchedTemplate = templates.find(
                          (t) =>
                            t.formation_detail?.code === matchFormation ||
                            t.name
                              .toLowerCase()
                              .includes(
                                matchFormation
                                  .toLowerCase()
                                  .replace(/-/g, '')
                              )
                        );
                      }
                      if (!matchedTemplate) matchedTemplate = templates[0];
                    } else {
                      matchedTemplate = templates[0];
                    }

                    const hasTemplate = !!matchedTemplate;
                    const templateNotRequired = [
                      'match_intro',
                      'goal',
                      'poster',
                    ].includes(item.subtype);

                    const existingItem = getContentItemForSubtype(
                      item.subtype
                    );
                    const isGenerating =
                      existingItem != null &&
                      ['queued', 'generating'].includes(existingItem.status);
                    const isFailed = existingItem?.status === 'failed';
                    const workflowStatus =
                      existingItem?.status === 'approved'
                        ? 'approved'
                        : existingItem?.status === 'rejected'
                          ? 'rejected'
                          : null;

                    const latestMedia = getLatestMediaForSubtype(
                      item.subtype
                    );
                    const historyItems = getMediaHistoryForSubtype(
                      item.subtype
                    );

                    return (
                      <MediaAssetCard
                        key={`${categoryKey}-${item.id}`}
                        label={item.label}
                        subtype={item.subtype}
                        mediaItem={latestMedia}
                        icon={item.icon}
                        isGenerating={isGenerating}
                        isFailed={isFailed}
                        errorMessage={
                          existingItem?.error_message ?? undefined
                        }
                        workflowStatus={workflowStatus}
                        historyItems={historyItems}
                        onPreview={(mi) => {
                          const previewUrl =
                            mi.file_url || getAssetUrl(mi.storage_path);
                          if (previewUrl) {
                            const isVid = Boolean(
                              mi.mime_type?.startsWith('video/') ||
                                /\.(mp4|webm|mov)$/i.test(previewUrl)
                            );
                            setSavedAssetPreview({
                              title: item.label,
                              subtitle: 'Match media',
                              url: previewUrl,
                              isVideo: isVid,
                            });
                          }
                        }}
                        onReplace={
                          hasTemplate || templateNotRequired
                            ? () => {
                                if (matchedTemplate) {
                                  openContentModal(
                                    matchedTemplate,
                                    item.label
                                  );
                                } else if (
                                  item.subtype === 'match_intro'
                                ) {
                                  openContentModal(
                                    {
                                      id: 0,
                                      name: 'Match Intro',
                                      description: '',
                                      style_variant: '',
                                      template_type: 'pre_match',
                                      template_subtype: 'match_intro',
                                      is_active: true,
                                      input_requirements: {},
                                    } as any,
                                    item.label
                                  );
                                } else if (item.subtype === 'poster') {
                                  openContentModal(
                                    {
                                      id: 0,
                                      name: 'Elftalfoto',
                                      description: '',
                                      style_variant: '',
                                      template_type: 'pre_match',
                                      template_subtype: 'poster',
                                      is_active: true,
                                      input_requirements: {
                                        members: {
                                          goalkeeper: {
                                            count: 1,
                                            asset_types: ['in_tenue'],
                                          },
                                          player: {
                                            count: 10,
                                            asset_types: ['in_tenue'],
                                          },
                                        },
                                      },
                                    } as any,
                                    item.label
                                  );
                                } else if (item.subtype === 'goal') {
                                  openContentModal(
                                    {
                                      id: 0,
                                      name: 'Goal Celebration',
                                      description: '',
                                      style_variant: '',
                                      template_type: 'during_match',
                                      template_subtype: 'goal',
                                      is_active: true,
                                      input_requirements: {},
                                    } as any,
                                    item.label
                                  );
                                } else {
                                  openContentModal(undefined, item.label);
                                }
                              }
                            : undefined
                        }
                        onDelete={(mi) => handleDeleteMediaItem(mi)}
                        onRestore={(mi) => handleRestoreMediaItem(mi)}
                      />
                    );
                  })}
                </MediaAssetGrid>
              </Card>
            );
          }
        )
      )}
    </div>
  );
}
