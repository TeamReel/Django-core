/**
 * Sub-components for MatchContentTab.
 *
 * Extracted to keep the main tab component under 500 lines.
 * - Thumbnail: 48×56 preview with video / image / empty states
 * - StatusBadge: workflow status pill
 * - ContentRow: single content-type row (preview + status + actions)
 * - getSyntheticTemplate: fallback template definitions
 */

import React from 'react';
import { Badge } from '@django-core/design-system';
import type { ContentTemplate } from '../../identity/ContentGenerationModal';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build the synthetic template for subtypes that don't require a real backend template */
export function getSyntheticTemplate(subtype: string): ContentTemplate | undefined {
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
export function Thumbnail({ url, isVideo, icon }: { url: string | null; isVideo: boolean; icon?: string }) {
  if (!url) {
    return (
      <div className="flex-center rounded-8" style={{
        width: 56, height: 56, flexShrink: 0,
        background: 'var(--app-surface-secondary, #252526)',
        fontSize: 22,
        color: 'var(--app-muted-text, #888)',
      }}>
        {icon || '—'}
      </div>
    );
  }

  return (
    <div className="rounded-8 overflow-hidden relative" style={{
      width: 56, height: 56, flexShrink: 0,
      background: '#000',
    }}>
      {isVideo ? (
        <>
          <video
            src={url}
            muted playsInline preload="metadata"
            onLoadedMetadata={(e) => { try { e.currentTarget.currentTime = 0.1; } catch { /* */ } }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div className="absolute flex-center fs-18" style={{
            inset: 0,
            color: 'rgba(255,255,255,0.85)',
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
export function StatusBadge({ isGenerating, isFailed, hasMedia, workflowStatus }: {
  isGenerating: boolean; isFailed: boolean; hasMedia: boolean; workflowStatus: string | null;
}) {
  if (isGenerating) return <Badge variant="warning" size="sm">⏳ Bezig</Badge>;
  if (isFailed) return <Badge variant="error" size="sm">✕ Mislukt</Badge>;
  if (workflowStatus === 'approved') return <Badge variant="success" size="sm">✓ Goedgekeurd</Badge>;
  if (workflowStatus === 'rejected') return <Badge variant="error" size="sm">✕ Afgekeurd</Badge>;
  if (hasMedia) return <Badge variant="success" size="sm">✓ Klaar</Badge>;
  return <Badge variant="default" size="sm" style={{ opacity: 0.5 }}>Leeg</Badge>;
}

// ── ContentRow ───────────────────────────────────────────────────────────────

/** Reusable content row for both single and multi-item subtypes */
export function ContentRow({ label, icon, mediaUrl, isVideo, hasMedia, isGenerating, isFailed, workflowStatus, canGenerate, showBorder, onPreview, onGenerate, itemLabel, updatedAt }: {
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
      <div className="flex-1-min">
        <div className="fs-14 fw-600 text-primary truncate">
          {label}
        </div>
        <div className="fs-11 text-muted" style={{ marginTop: 2 }}>
          {hasMedia && updatedAt
            ? new Date(updatedAt).toLocaleDateString('nl-NL', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })
            : canGenerate ? 'Tik om te genereren' : 'Geen template'}
        </div>
      </div>

      {/* Status + actions */}
      <div className="flex-row gap-6" style={{ flexShrink: 0 }}>
        <StatusBadge
          isGenerating={isGenerating}
          isFailed={isFailed}
          hasMedia={hasMedia}
          workflowStatus={workflowStatus}
        />
        {hasMedia && mediaUrl && (
          <div className="flex-row gap-2">
            {/* Open in new tab */}
            <a
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Openen"
              className="flex-center rounded-6 fs-14 cursor-pointer border-none"
              style={{
                width: 32, height: 32,
                background: 'var(--app-surface-secondary, #252526)',
                color: 'var(--app-text, #fff)',
                textDecoration: 'none',
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
              className="flex-center rounded-6 fs-14 cursor-pointer border-none"
              style={{
                width: 32, height: 32,
                background: 'var(--app-surface-secondary, #252526)',
                color: 'var(--app-text, #fff)',
                textDecoration: 'none',
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
                className="flex-center rounded-6 fs-14 cursor-pointer border-none"
                style={{
                  width: 32, height: 32,
                  background: 'var(--app-surface-secondary, #252526)',
                  color: 'var(--app-text, #fff)',
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
                className="flex-center rounded-6 fs-14 cursor-pointer border-none"
                style={{
                  width: 32, height: 32,
                  background: 'var(--app-surface-secondary, #252526)',
                  color: 'var(--app-text, #fff)',
                }}
              >
                ⟳
              </button>
            )}
          </div>
        )}
        {!hasMedia && canGenerate && (
          <span className="text-muted fs-16">›</span>
        )}
      </div>
    </div>
  );
}
