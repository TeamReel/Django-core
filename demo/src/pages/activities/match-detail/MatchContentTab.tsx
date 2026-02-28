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
    lineup_flyer: {
      id: 0, name: 'Lineup Flyer', description: '', style_variant: '',
      template_type: 'pre_match', template_subtype: 'lineup_flyer',
      is_active: true,
      input_requirements: {
        members: {
          goalkeeper: { count: 1, asset_types: ['in_tenue'] },
          player: { count: 10, asset_types: ['in_tenue'] },
        },
      },
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

/** Reusable content row for both single and multi-item subtypes */
function ContentRow({ label, icon, mediaUrl, isVideo, hasMedia, isGenerating, isFailed, workflowStatus, canGenerate, showBorder, onPreview, onGenerate, itemLabel, updatedAt }: {
  label: string;
  icon?: string;
  mediaUrl: string | null;
  isVideo: boolean;
  hasMedia: boolean;
  isGenerating: boolean;
  isFailed: boolean;
  workflowStatus: string | null;
  canGenerate: boolean;
  showBorder: boolean;
  onPreview: () => void;
  onGenerate: () => void;
  itemLabel: string;
  updatedAt?: string | null;
}) {
  return (
    <div
      onClick={() => {
        if (hasMedia && mediaUrl) {
          onPreview();
        } else if (canGenerate) {
          onGenerate();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderBottom: showBorder ? '1px solid var(--app-border, #333)' : 'none',
        cursor: (hasMedia || canGenerate) ? 'pointer' : 'default',
        transition: 'background 0.1s ease',
      }}
      onMouseEnter={(e) => {
        if (hasMedia || canGenerate)
          e.currentTarget.style.background = 'var(--app-surface-hover, #2a2a2a)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {/* Thumbnail */}
      <Thumbnail url={mediaUrl} isVideo={isVideo} icon={icon} />

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
          {label}
        </div>
        <div style={{ fontSize: 11, color: 'var(--app-muted-text, #888)', marginTop: 2 }}>
          {hasMedia && updatedAt
            ? new Date(updatedAt).toLocaleDateString('nl-NL', {
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
          hasMedia={hasMedia}
          workflowStatus={workflowStatus}
        />
        {hasMedia && mediaUrl && (
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
            {/* Share actual file (Web Share API) */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    // Try fetching the file as a blob for native file sharing
                    // S3 presigned URLs may block cross-origin fetch (CORS), so we
                    // attempt multiple strategies before falling back to URL sharing.
                    let shared = false;

                    // Strategy 1: direct fetch (works when CORS is configured)
                    try {
                      const resp = await fetch(mediaUrl);
                      if (resp.ok) {
                        const blob = await resp.blob();
                        const ext = isVideo ? 'mp4' : (mediaUrl.match(/\.(png|jpg|jpeg|webp)/i)?.[1] || 'jpg');
                        const mimeType = isVideo ? 'video/mp4' : (blob.type || `image/${ext}`);
                        const fileName = `${itemLabel.replace(/\s+/g, '_')}.${ext}`;
                        const file = new File([blob], fileName, { type: mimeType });
                        if (navigator.canShare?.({ files: [file] })) {
                          await navigator.share({ files: [file], title: itemLabel });
                          shared = true;
                        }
                      }
                    } catch {
                      /* CORS or network error — try next strategy */
                    }

                    // Strategy 2: for images, load via <img> → canvas → blob
                    if (!shared && !isVideo) {
                      try {
                        const blob = await new Promise<Blob>((resolve, reject) => {
                          const img = new Image();
                          img.crossOrigin = 'anonymous';
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;
                            canvas.getContext('2d')!.drawImage(img, 0, 0);
                            canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
                          };
                          img.onerror = () => reject(new Error('img load failed'));
                          img.src = mediaUrl;
                        });
                        const fileName = `${itemLabel.replace(/\s+/g, '_')}.png`;
                        const file = new File([blob], fileName, { type: 'image/png' });
                        if (navigator.canShare?.({ files: [file] })) {
                          await navigator.share({ files: [file], title: itemLabel });
                          shared = true;
                        }
                      } catch {
                        /* canvas tainted or img blocked — fall through */
                      }
                    }

                    // Strategy 3: fallback to sharing the URL
                    if (!shared) {
                      await navigator.share({ title: itemLabel, url: mediaUrl });
                    }
                  } catch {
                    /* user cancelled or share failed */
                  }
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
            {/* Replace / regenerate */}
            {canGenerate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerate();
                }}
                title="Vervangen"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 6,
                  background: 'var(--app-surface-secondary, #252526)',
                  color: 'var(--app-text, #fff)', fontSize: 14,
                  border: 'none', cursor: 'pointer',
                }}
              >
                ⟳
              </button>
            )}
          </div>
        )}
        {!hasMedia && canGenerate && (
          <span style={{ color: 'var(--app-muted-text, #666)', fontSize: 16 }}>›</span>
        )}
      </div>
    </div>
  );
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
                      icon={allGoalMedia.length > 0 ? '➕' : item.icon}
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
