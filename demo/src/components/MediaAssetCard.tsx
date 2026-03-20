/**
 * MediaAssetCard — Consistent asset tile for generated match content.
 *
 * Mirrors the AssetCard pattern from AssetsTab (club page) to provide:
 * - Preview area (image or video thumbnail)
 * - Status badge (Opgeslagen / AI / ⏳ Bezig)
 * - Action buttons: Vervang (replace), Verwijder (delete), ⏱️ (history)
 * - Click to preview
 *
 * One card per content subtype (lineup, goal_celebration, etc.)
 * History is the list of older MediaItems for the same subtype.
 */

import React, { memo, useMemo, useState } from 'react';
import { clickableProps } from '@/utils/a11y';
import styles from './MediaAssetCard.module.css';
import { getAssetUrl } from '../hooks/useBrandProfile';
import { getStateDisplay } from '../hooks/useWorkflows';
import { useConfirm } from '@/components/ui/ConfirmDialog';

// ============================================================================
// Types
// ============================================================================

export interface MatchMediaItem {
  id: string;
  title: string;
  mime_type: string;
  file_url: string | null;
  storage_path: string | null;
  state: string;
  extraction_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface MediaAssetCardProps {
  /** Label shown below the tile */
  label: string;
  /** Content subtype key (e.g. 'lineup', 'goal_celebration') */
  subtype: string;
  /** The current (latest) media item for this subtype, if any */
  mediaItem: MatchMediaItem | null;
  /** Click to preview the media */
  onPreview?: (item: MatchMediaItem) => void;
  /** Click to regenerate / replace (opens generation modal) */
  onReplace?: (subtype: string) => void;
  /** Delete callback */
  onDelete?: (item: MatchMediaItem) => void;
  /** Show history of previous versions */
  historyItems?: MatchMediaItem[];
  /** Restore a historical version */
  onRestore?: (item: MatchMediaItem) => void;
  /** Whether content is currently being generated */
  isGenerating?: boolean;
  /** Whether generation failed */
  isFailed?: boolean;
  /** Error message from failed generation */
  errorMessage?: string;
  /** Workflow status name (e.g. 'draft', 'in_review', 'approved', 'rejected') */
  workflowStatus?: string | null;
  /** Aspect ratio for the preview area */
  aspectRatio?: string;
  /** Icon for empty state */
  icon?: string;
}

// ============================================================================
// MediaAssetCard
// ============================================================================

export const MediaAssetCard = memo(function MediaAssetCard({
  label,
  subtype,
  mediaItem,
  onPreview,
  onReplace,
  onDelete,
  historyItems = [],
  onRestore,
  isGenerating = false,
  isFailed = false,
  errorMessage,
  workflowStatus,
  aspectRatio = '16 / 9',
  icon,
}: MediaAssetCardProps) {
  const confirm = useConfirm();
  const [showHistory, setShowHistory] = useState(false);

  const url = useMemo(() => {
    if (!mediaItem) return null;
    return mediaItem.file_url || getAssetUrl(mediaItem.storage_path);
  }, [mediaItem]);

  const isVideo = useMemo(() => {
    if (!mediaItem) return false;
    return Boolean(
      mediaItem.mime_type?.startsWith('video/') ||
      (url ? /\.(mp4|webm|mov)$/i.test(url) : false)
    );
  }, [mediaItem, url]);

  // Determine status badge
  let badgeText = '';
  if (isGenerating) {
    badgeText = 'Bezig';
  } else if (isFailed) {
    badgeText = '✕ Mislukt';
  } else if (mediaItem) {
    badgeText = '✓ Opgeslagen';
  }

  // Status key for data-attribute driven styles
  const statusKey = isGenerating ? 'generating' : isFailed ? 'failed' : mediaItem ? 'saved' : undefined;

  return (
    <>
      <div
        className={`rounded-8 overflow-hidden ${styles.card}`}
        data-status={statusKey}
        data-clickable={mediaItem && onPreview ? '' : undefined}
      >
        {/* Preview area */}
        <div
          onClick={() => mediaItem && onPreview?.(mediaItem)}
          {...(mediaItem && onPreview ? clickableProps(() => onPreview!(mediaItem!)) : {})}
          className={`relative flex-center ${styles.previewArea} ${url ? styles.previewBgMedia : styles.previewBgEmpty}`}
          style={{ aspectRatio }}
        >
          {url && isVideo ? (
            <video
              src={url}
              muted
              playsInline
              preload="metadata"
              onLoadedMetadata={(e) => {
                try { e.currentTarget.currentTime = 0.1; } catch { /* ignore */ }
              }}
              className="w-full h-full object-cover"
            />
          ) : url ? (
            <img
              src={url}
              alt={label}
              className="w-full h-full object-cover"
            />
          ) : null}

          {/* Play overlay for video */}
          {url && isVideo && (
            <div
              className={`absolute flex-center pointer-events-none inset-0 ${styles.playOverlay}`}
            >
              ▶
            </div>
          )}

          {/* Empty state */}
          {!url && !isGenerating && (
            <div className="text-center fs-12 text-muted">
              {icon && <div className="mb-4 fs-24">{icon}</div>}
              <div>Niet ingesteld</div>
            </div>
          )}

          {/* Generating state */}
          {isGenerating && !url && (
            <div className={`text-center fs-12 ${styles.generatingState}`}>
              <div className="mb-4 fs-24"></div>
              <div>Bezig met genereren...</div>
            </div>
          )}

          {/* Status badge */}
          {badgeText && (
            <span
              className={`absolute fw-600 rounded-4 text-white ${styles.statusBadge}`}
              data-status={statusKey}
            >
              {badgeText}
            </span>
          )}

          {/* Workflow status badge */}
          {workflowStatus && (() => {
            const ws = getStateDisplay(workflowStatus);
            return (
              <span
                className={`absolute fw-600 rounded-4 text-white ${styles.workflowBadge}`}
                data-offset={badgeText ? 'true' : undefined}
                style={{ background: ws.bgColor, color: ws.color }}
              >
                {ws.icon} {ws.label}
              </span>
            );
          })()}

          {/* History button */}
          {mediaItem && historyItems.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
              className={`absolute border-none rounded-4 fs-12 cursor-pointer text-white ${styles.historyButton}`}
              title={`${historyItems.length} eerdere versie(s)`}
            >
              {historyItems.length}
            </button>
          )}
        </div>

        {/* Info + actions */}
        <div className={styles.infoSection}>
          <div className="fs-12 fw-600 mb-4">{label}</div>

          {/* Error message */}
          {isFailed && errorMessage && (
            <div className={`mb-4 text-error ${styles.errorMessage}`}>
              {errorMessage}
            </div>
          )}

          {/* Action buttons */}
          <div className={`grid gap-4 ${mediaItem ? styles.actionGridDual : styles.actionGrid}`}>
            {onReplace && (
              <button
                onClick={(e) => { e.stopPropagation(); onReplace(subtype); }}
                className={`w-full fs-11 cursor-pointer border-none rounded-4 ${styles.replaceButton}`}
              >
                {mediaItem ? 'Vervang' : 'Genereer'}
              </button>
            )}
            {mediaItem && onReplace && (
              <button
                onClick={(e) => { e.stopPropagation(); onReplace(subtype); }}
                className={`w-full fs-11 cursor-pointer border-none rounded-4 text-white ${styles.improveButton}`}
              >
                Verbeter
              </button>
            )}
          </div>

          {/* Delete */}
          {mediaItem && onDelete && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (await confirm({ title: 'Asset verwijderen', message: 'Weet je zeker dat je dit asset wilt verwijderen?', confirmLabel: 'Verwijderen', variant: 'danger' })) {
                  onDelete(mediaItem);
                }
              }}
              className={`w-full fs-11 cursor-pointer rounded-4 mt-4 bg-transparent text-error ${styles.deleteButton}`}
            >
              Verwijderen
            </button>
          )}

          {/* Updated date */}
          {mediaItem && (
            <div className={`mt-4 text-muted ${styles.updatedDate}`}>
              {new Date(mediaItem.updated_at).toLocaleDateString('nl-NL')}
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div
          className={`modal-backdrop ${styles.modalBackdrop}`}
          onClick={() => setShowHistory(false)}
          role="presentation"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`rounded-8 p-20 overflow-auto ${styles.modalContent}`}
            role="dialog"
          >
            <div className="flex-between mb-16">
              <h3 className="m-0 fs-16">Versiegeschiedenis — {label}</h3>
              <button
                onClick={() => setShowHistory(false)}
                className={`border-none cursor-pointer fs-16 bg-transparent ${styles.modalCloseButton}`}
              >
                ✕
              </button>
            </div>

            {historyItems.length === 0 ? (
              <div className="p-20 text-center text-muted">
                Geen eerdere versies gevonden.
              </div>
            ) : (
              <div className="grid gap-12">
                {historyItems.map((item) => {
                  const histUrl = item.file_url || getAssetUrl(item.storage_path);
                  const histIsVideo = Boolean(
                    item.mime_type?.startsWith('video/') ||
                    (histUrl ? /\.(mp4|webm|mov)$/i.test(histUrl) : false)
                  );
                  return (
                    <div
                      key={item.id}
                      className={`flex-row gap-12 p-10 rounded-6 ${styles.historyRow}`}
                    >
                      <div
                        className={`rounded-4 overflow-hidden relative ${styles.historyThumbnail}`}
                      >
                        {histUrl && histIsVideo ? (
                          <video
                            src={histUrl}
                            muted
                            playsInline
                            preload="metadata"
                            onLoadedMetadata={(e) => {
                              try { e.currentTarget.currentTime = 0.1; } catch { /* ignore */ }
                            }}
                            className="w-full h-full object-cover"
            />
                        ) : histUrl ? (
                          <img
                            src={histUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`flex-center h-full text-muted ${styles.historyEmptyThumb}`}>
                            —
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="fs-12 fw-600">
                          {new Date(item.created_at).toLocaleString('nl-NL')}
                        </div>
                        <div className="fs-11 text-muted">
                          {item.title}
                        </div>
                      </div>
                      {onRestore && (
                        <button
                          onClick={async () => {
                            if (await confirm({ title: 'Versie herstellen', message: 'Wil je deze versie herstellen?', confirmLabel: 'Herstellen' })) {
                              onRestore(item);
                              setShowHistory(false);
                            }
                          }}
                          className={`border-none rounded-4 fs-12 cursor-pointer text-white ${styles.restoreButton}`}
                        >
                          Herstellen
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});

// ============================================================================
// MediaAssetGrid — Consistent grid wrapper (matches AssetsTab AssetGrid)
// ============================================================================

export function MediaAssetGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`media-asset-grid grid gap-12 ${styles.assetGrid}`}
    >
      {children}
    </div>
  );
}
