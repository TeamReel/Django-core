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

import React, { useCallback, useMemo, useState } from 'react';
import { getAssetUrl } from '../hooks/useBrandProfile';
import { getApiBaseUrl } from '../utils/apiBase';
import { getStateDisplay } from '../hooks/useWorkflows';

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

export function MediaAssetCard({
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
  let badgeColor = 'var(--app-muted-text)';
  if (isGenerating) {
    badgeText = '⏳ Bezig';
    badgeColor = 'var(--color-amber-400)';
  } else if (isFailed) {
    badgeText = '✕ Mislukt';
    badgeColor = 'var(--color-red-500)';
  } else if (mediaItem) {
    badgeText = '✓ Opgeslagen';
    badgeColor = 'var(--color-green-400)';
  }

  // Border color based on status
  let borderColor = 'var(--vscode-widget-border, #333)';
  if (isGenerating) borderColor = 'var(--color-amber-400)';
  else if (isFailed) borderColor = 'var(--color-red-500)';
  else if (mediaItem) borderColor = '#22c55e';

  return (
    <>
      <div
        className="rounded-8 overflow-hidden"
        style={{
          border: `1px solid ${borderColor}`,
          background: 'var(--vscode-editor-background, #1e1e1e)',
          transition: 'all var(--duration-normal) var(--ease-default)',
          cursor: mediaItem && onPreview ? 'pointer' : 'default',
        }}
        onMouseEnter={(e) => {
          if (mediaItem) {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'none';
        }}
      >
        {/* Preview area */}
        <div
          onClick={() => mediaItem && onPreview?.(mediaItem)}
          className="relative flex-center"
          style={{
            aspectRatio,
            background: url
              ? '#000'
              : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
            minHeight: 100,
          }}
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
              className="w-full h-full"
              style={{ objectFit: 'cover' }}
            />
          ) : url ? (
            <img
              src={url}
              alt={label}
              className="w-full h-full"
              style={{ objectFit: 'cover' }}
            />
          ) : null}

          {/* Play overlay for video */}
          {url && isVideo && (
            <div
              className="absolute flex-center"
              style={{
                inset: 0,
                color: 'rgba(255,255,255,0.9)',
                fontSize: 28,
                textShadow: '0 2px 12px rgba(0,0,0,0.7)',
                pointerEvents: 'none',
              }}
            >
              ▶
            </div>
          )}

          {/* Empty state */}
          {!url && !isGenerating && (
            <div className="text-center fs-12" style={{ color: 'var(--vscode-descriptionForeground, #888)' }}>
              {icon && <div className="mb-4 fs-24">{icon}</div>}
              <div>Niet ingesteld</div>
            </div>
          )}

          {/* Generating state */}
          {isGenerating && !url && (
            <div className="text-center fs-12" style={{ color: 'var(--color-amber-400)' }}>
              <div className="mb-4 fs-24">⏳</div>
              <div>Bezig met genereren...</div>
            </div>
          )}

          {/* Status badge */}
          {badgeText && (
            <span
              className="absolute fw-600 rounded-4"
              style={{
                top: 6,
                right: 6,
                background: badgeColor,
                color: '#fff',
                fontSize: 10,
                padding: '2px 6px',
              }}
            >
              {badgeText}
            </span>
          )}

          {/* Workflow status badge */}
          {workflowStatus && (() => {
            const ws = getStateDisplay(workflowStatus);
            return (
              <span
                className="absolute fw-600 rounded-4"
                style={{
                  top: badgeText ? 28 : 6,
                  right: 6,
                  background: ws.bgColor,
                  color: ws.color,
                  fontSize: 10,
                  padding: '2px 6px',
                }}
              >
                {ws.icon} {ws.label}
              </span>
            );
          })()}

          {/* History button */}
          {mediaItem && historyItems.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
              className="absolute border-none rounded-4 fs-12 cursor-pointer"
              style={{
                top: 6,
                left: 6,
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                padding: '2px 6px',
              }}
              title={`${historyItems.length} eerdere versie(s)`}
            >
              ⏱️ {historyItems.length}
            </button>
          )}
        </div>

        {/* Info + actions */}
        <div style={{ padding: '8px 10px' }}>
          <div className="fs-12 fw-600 mb-4">{label}</div>

          {/* Error message */}
          {isFailed && errorMessage && (
            <div className="mb-4" style={{ fontSize: 10, color: 'var(--color-red-500)', lineHeight: 1.3 }}>
              {errorMessage}
            </div>
          )}

          {/* Action buttons */}
          <div className="grid gap-4" style={{ gridTemplateColumns: mediaItem ? '1fr 1fr' : '1fr' }}>
            {onReplace && (
              <button
                onClick={(e) => { e.stopPropagation(); onReplace(subtype); }}
                className="w-full fs-11 cursor-pointer border-none rounded-4"
                style={{
                  padding: '4px 8px',
                  background: 'var(--vscode-button-background, #0078d4)',
                  color: 'var(--vscode-button-foreground, #fff)',
                }}
              >
                {mediaItem ? 'Vervang' : 'Genereer'}
              </button>
            )}
            {mediaItem && onReplace && (
              <button
                onClick={(e) => { e.stopPropagation(); onReplace(subtype); }}
                className="w-full fs-11 cursor-pointer border-none rounded-4"
                style={{
                  padding: '4px 8px',
                  background: '#8b5cf6',
                  color: '#fff',
                }}
              >
                Verbeter
              </button>
            )}
          </div>

          {/* Delete */}
          {mediaItem && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Weet je zeker dat je dit asset wilt verwijderen?')) {
                  onDelete(mediaItem);
                }
              }}
              className="w-full fs-11 cursor-pointer rounded-4 mt-4 bg-transparent"
              style={{
                padding: '4px 8px',
                color: 'var(--color-red-500)',
                border: '1px solid #ef4444',
              }}
            >
              Verwijderen
            </button>
          )}

          {/* Updated date */}
          {mediaItem && (
            <div className="mt-4" style={{ fontSize: 10, color: 'var(--vscode-descriptionForeground, #888)' }}>
              {new Date(mediaItem.updated_at).toLocaleDateString('nl-NL')}
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div
          className="flex-center"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1100,
          }}
          onClick={() => setShowHistory(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-8 p-20 overflow-auto"
            style={{
              background: '#1e1e1e',
              border: '1px solid #333',
              width: 500,
              maxHeight: '80vh',
            }}
          >
            <div className="flex-between mb-16">
              <h3 className="m-0 fs-16">Versiegeschiedenis — {label}</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="border-none cursor-pointer fs-16"
                style={{ background: 'none', color: '#ccc' }}
              >
                ✕
              </button>
            </div>

            {historyItems.length === 0 ? (
              <div className="p-20 text-center" style={{ color: '#888' }}>
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
                      className="flex-row gap-12 p-10 rounded-6"
                      style={{
                        background: '#252526',
                      }}
                    >
                      <div
                        className="rounded-4 overflow-hidden relative"
                        style={{
                          width: 80,
                          height: 50,
                          flexShrink: 0,
                          background: '#000',
                        }}
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
                            className="w-full h-full"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : histUrl ? (
                          <img
                            src={histUrl}
                            alt={item.title}
                            className="w-full h-full"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="flex-center h-full" style={{ color: '#888', fontSize: 10 }}>
                            —
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="fs-12 fw-600">
                          {new Date(item.created_at).toLocaleString('nl-NL')}
                        </div>
                        <div className="fs-11" style={{ color: '#888' }}>
                          {item.title}
                        </div>
                      </div>
                      {onRestore && (
                        <button
                          onClick={() => {
                            if (window.confirm('Wil je deze versie herstellen?')) {
                              onRestore(item);
                              setShowHistory(false);
                            }
                          }}
                          className="border-none rounded-4 fs-12 cursor-pointer"
                          style={{
                            padding: '6px 12px',
                            background: '#094771',
                            color: '#fff',
                          }}
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
}

// ============================================================================
// MediaAssetGrid — Consistent grid wrapper (matches AssetsTab AssetGrid)
// ============================================================================

export function MediaAssetGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="media-asset-grid grid gap-12"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      }}
    >
      {children}
    </div>
  );
}
