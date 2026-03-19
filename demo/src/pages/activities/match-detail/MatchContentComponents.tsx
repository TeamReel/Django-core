/**
 * Sub-components for MatchContentTab.
 *
 * Extracted to keep the main tab component under 500 lines.
 * - Thumbnail: 48×56 preview with video / image / empty states
 * - StatusBadge: workflow status pill
 * - ContentRow: single content-type row (preview + status + actions)
 * - getSyntheticTemplate: fallback template definitions
 */

import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '@django-core/design-system';
import { ContentIcon } from '../../../components/ContentIcon';
import { ContentShareSheet } from '../../../components/ContentShareSheet';
import type { ContentTemplate } from '../../identity/ContentGenerationModal';
import styles from './MatchContentComponents.module.css';

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
      <div className={`flex-center rounded-8 ${styles.thumbnailEmpty}`}>
        {icon ? <ContentIcon icon={icon} size={18} /> : '—'}
      </div>
    );
  }

  return (
    <div className={`rounded-8 overflow-hidden relative ${styles.thumbnailWrapper}`}>
      {isVideo ? (
        <>
          <video
            src={url}
            muted playsInline preload="metadata"
            onLoadedMetadata={(e) => { try { e.currentTarget.currentTime = 0.1; } catch { /* */ } }}
            className={styles.thumbnailMedia}
          />
          <div className={`absolute flex-center fs-18 ${styles.playOverlay}`}></div>
        </>
      ) : (
        <img src={url} alt="" className={styles.thumbnailMedia} loading="lazy" />
      )}
    </div>
  );
}

/** Status pill */
export function StatusBadge({ isGenerating, isFailed, hasMedia, workflowStatus }: {
  isGenerating: boolean; isFailed: boolean; hasMedia: boolean; workflowStatus: string | null;
}) {
  if (isGenerating) return <Badge variant="warning" size="sm">Bezig</Badge>;
  if (isFailed) return <Badge variant="error" size="sm">✕ Mislukt</Badge>;
  if (workflowStatus === 'approved') return <Badge variant="success" size="sm">✓ Goedgekeurd</Badge>;
  if (workflowStatus === 'rejected') return <Badge variant="error" size="sm">✕ Afgekeurd</Badge>;
  if (hasMedia) return <Badge variant="success" size="sm">✓ Klaar</Badge>;
  return <Badge variant="default" size="sm" className={styles.badgeEmpty}>Leeg</Badge>;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div
      className={styles.contentRow}
      data-show-border={showBorder ? 'true' : undefined}
      data-clickable={(hasMedia || canGenerate) ? 'true' : undefined}
      onClick={() => {
        if (menuOpen) return;
        if (hasMedia && mediaUrl) {
          onPreview();
        } else if (canGenerate) {
          onGenerate();
        }
      }}
    >
      {/* Thumbnail */}
      <Thumbnail url={mediaUrl} isVideo={isVideo} icon={icon} />

      {/* Text block */}
      <div className="flex-1-min">
        <div className="fs-14 fw-600 text-primary truncate">
          {label}
        </div>
        <div className={`fs-11 text-muted ${styles.subtitle}`}>
          {hasMedia && updatedAt
            ? new Date(updatedAt).toLocaleDateString('nl-NL', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })
            : canGenerate ? 'Tik om te genereren' : 'Geen template'}
        </div>
      </div>

      {/* Status + overflow */}
      <div className={`flex-row gap-6 ${styles.actionsWrapper}`}>
        <StatusBadge
          isGenerating={isGenerating}
          isFailed={isFailed}
          hasMedia={hasMedia}
          workflowStatus={workflowStatus}
        />
        {hasMedia && mediaUrl ? (
          <div className={styles.overflowWrap} ref={menuRef}>
            <button
              type="button"
              className={styles.overflowBtn}
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            >
              ⋯
            </button>
            {menuOpen && (
              <div className={styles.overflowMenu}>
                <button type="button" onClick={(e) => { e.stopPropagation(); onPreview(); setMenuOpen(false); }}>
                  Bekijken
                </button>
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                >
                  ↗ Openen in nieuw tabblad
                </a>
                <a
                  href={mediaUrl}
                  download
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                >
                  ↓ Downloaden
                </a>
                <button type="button" onClick={(e) => { e.stopPropagation(); setShareSheetOpen(true); setMenuOpen(false); }}>
                  ⤴ Delen
                </button>
                {canGenerate && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); onGenerate(); setMenuOpen(false); }}>
                    ⟳ Opnieuw genereren
                  </button>
                )}
              </div>
            )}
          </div>
        ) : !hasMedia && canGenerate ? (
          <span className="text-muted fs-16">›</span>
        ) : null}
      </div>

      {hasMedia && mediaUrl && (
        <ContentShareSheet
          isOpen={shareSheetOpen}
          onClose={() => setShareSheetOpen(false)}
          contentUrl={mediaUrl}
          contentTitle={itemLabel}
          contentType={isVideo ? 'video' : 'image'}
        />
      )}
    </div>
  );
}
