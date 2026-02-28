import React from 'react';
import { Badge } from '@django-core/design-system';
import { getAssetUrl } from '../../../hooks/useBrandProfile';
import {
  CONTENT_TYPES,
  type ContentTemplate,
} from '../../identity/ContentGenerationModal';
import type { MatchMediaItem } from '../../../components/MediaAssetCard';
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

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build the synthetic template for subtypes that don't require a real backend template */
function getSyntheticTemplate(subtype: string): ContentTemplate | undefined {
  const synthetics: Record<string, any> = {
    match_intro: {
      id: 0, name: 'Match Intro', description: '', style_variant: '',
      template_type: 'pre_match', template_subtype: 'match_intro',
      is_active: true, input_requirements: {},
    },
    poster: {
      id: 0, name: 'Elftalfoto', description: '', style_variant: '',
      template_type: 'pre_match', template_subtype: 'poster',
      is_active: true,
      input_requirements: {
        members: {
          goalkeeper: { count: 1, asset_types: ['in_tenue'] },
          player: { count: 10, asset_types: ['in_tenue'] },
        },
      },
    },
    goal: {
      id: 0, name: 'Goal Celebration', description: '', style_variant: '',
      template_type: 'during_match', template_subtype: 'goal',
      is_active: true, input_requirements: {},
    },
  };
  return synthetics[subtype];
}

// ── Subcomponents ────────────────────────────────────────────────────────────

/** Compact preview thumbnail (48×48 on mobile, 56×56 desktop) */
function Thumbnail({ url, isVideo, icon }: { url: string | null; isVideo: boolean; icon?: string }) {
  if (!url) {
    return (
      <div style={{
        width: 56, height: 56, flexShrink: 0,
        borderRadius: 8,
        background: 'var(--app-surface-secondary, #252526)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
        color: 'var(--app-muted-text, #888)',
      }}>
        {icon || '—'}
      </div>
    );
  }

  return (
    <div style={{
      width: 56, height: 56, flexShrink: 0,
      borderRadius: 8,
      overflow: 'hidden',
      background: '#000',
      position: 'relative',
    }}>
      {isVideo ? (
        <>
          <video
            src={url}
            muted playsInline preload="metadata"
            onLoadedMetadata={(e) => { try { e.currentTarget.currentTime = 0.1; } catch { /* */ } }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.85)', fontSize: 18,
            textShadow: '0 1px 6px rgba(0,0,0,0.6)', pointerEvents: 'none',
          }}>▶</div>
        </>
      ) : (
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    </div>
  );
}

/** Status pill */
function StatusBadge({ isGenerating, isFailed, hasMedia, workflowStatus }: {
  isGenerating: boolean; isFailed: boolean; hasMedia: boolean; workflowStatus: string | null;
}) {
  if (isGenerating) return <Badge variant="warning" size="sm">⏳ Bezig</Badge>;
  if (isFailed) return <Badge variant="error" size="sm">✕ Mislukt</Badge>;
  if (workflowStatus === 'approved') return <Badge variant="success" size="sm">✓ Goedgekeurd</Badge>;
  if (workflowStatus === 'rejected') return <Badge variant="error" size="sm">✕ Afgekeurd</Badge>;
  if (hasMedia) return <Badge variant="success" size="sm">✓ Klaar</Badge>;
  return <Badge variant="default" size="sm" style={{ opacity: 0.5 }}>Leeg</Badge>;
}

// ── Main component ──────────────────────────────────────────────────────────

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
      <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--app-muted-text, #888)' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
        <div>Media laden...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {(['pre_match', 'during_match', 'post_match'] as const).map((categoryKey) => {
        const category = CONTENT_TYPES[categoryKey];
        if (!category) return null;

        return (
          <div key={categoryKey}>
            {/* Section header */}
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--app-muted-text, #888)',
              marginBottom: 8,
              paddingLeft: 2,
            }}>
              {category.label}
            </div>

            {/* Content rows */}
            <div style={{
              borderRadius: 10,
              border: '1px solid var(--app-border, #333)',
              overflow: 'hidden',
              background: 'var(--app-surface, #1e1e1e)',
            }}>
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
                const templateNotRequired = ['match_intro', 'goal', 'poster'].includes(item.subtype);
                const canGenerate = hasTemplate || templateNotRequired;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (latestMedia) {
                        handlePreview(latestMedia, item.label);
                      } else if (canGenerate) {
                        handleGenerate(item.subtype, item.label);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderBottom: idx < category.items.length - 1 ? '1px solid var(--app-border, #333)' : 'none',
                      cursor: (latestMedia || canGenerate) ? 'pointer' : 'default',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (latestMedia || canGenerate)
                        e.currentTarget.style.background = 'var(--app-surface-hover, #2a2a2a)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Thumbnail */}
                    <Thumbnail url={mediaUrl} isVideo={isVideo} icon={item.icon} />

                    {/* Text block */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--app-text, #fff)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--app-muted-text, #888)', marginTop: 2 }}>
                        {latestMedia
                          ? new Date(latestMedia.updated_at).toLocaleDateString('nl-NL', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                            })
                          : canGenerate ? 'Tik om te genereren' : 'Geen template'}
                      </div>
                    </div>

                    {/* Status + actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <StatusBadge
                        isGenerating={isGenerating}
                        isFailed={isFailed}
                        hasMedia={!!latestMedia}
                        workflowStatus={workflowStatus}
                      />
                      {latestMedia && mediaUrl && (
                        <div style={{ display: 'flex', gap: 2 }}>
                          {/* Open in new tab */}
                          <a
                            href={mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Openen"
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 32, height: 32, borderRadius: 6,
                              background: 'var(--app-surface-secondary, #252526)',
                              color: 'var(--app-text, #fff)', fontSize: 14,
                              textDecoration: 'none', border: 'none', cursor: 'pointer',
                            }}
                          >
                            ↗
                          </a>
                          {/* Download */}
                          <a
                            href={mediaUrl}
                            download
                            onClick={(e) => e.stopPropagation()}
                            title="Downloaden"
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 32, height: 32, borderRadius: 6,
                              background: 'var(--app-surface-secondary, #252526)',
                              color: 'var(--app-text, #fff)', fontSize: 14,
                              textDecoration: 'none', border: 'none', cursor: 'pointer',
                            }}
                          >
                            ↓
                          </a>
                          {/* Share (Web Share API if available) */}
                          {typeof navigator !== 'undefined' && 'share' in navigator && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.share({
                                  title: item.label,
                                  url: mediaUrl,
                                }).catch(() => { /* user cancelled */ });
                              }}
                              title="Delen"
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 32, height: 32, borderRadius: 6,
                                background: 'var(--app-surface-secondary, #252526)',
                                color: 'var(--app-text, #fff)', fontSize: 14,
                                border: 'none', cursor: 'pointer',
                              }}
                            >
                              ⤴
                            </button>
                          )}
                        </div>
                      )}
                      {!latestMedia && (latestMedia || canGenerate) && (
                        <span style={{ color: 'var(--app-muted-text, #666)', fontSize: 16 }}>›</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
