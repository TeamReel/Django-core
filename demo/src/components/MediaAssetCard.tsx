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
  let badgeColor = '#6b7280';
  if (isGenerating) {
    badgeText = '⏳ Bezig';
    badgeColor = '#f59e0b';
  } else if (isFailed) {
    badgeText = '✕ Mislukt';
    badgeColor = '#ef4444';
  } else if (mediaItem) {
    badgeText = '✓ Opgeslagen';
    badgeColor = '#10b981';
  }

  // Border color based on status
  let borderColor = 'var(--vscode-widget-border, #333)';
  if (isGenerating) borderColor = '#f59e0b';
  else if (isFailed) borderColor = '#ef4444';
  else if (mediaItem) borderColor = '#22c55e';

  return (
    <>
      <div
        style={{
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          overflow: 'hidden',
          background: 'var(--vscode-editor-background, #1e1e1e)',
          transition: 'all 0.2s ease',
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
          style={{
            aspectRatio,
            background: url
              ? '#000'
              : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
            position: 'relative',
            minHeight: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : url ? (
            <img
              src={url}
              alt={label}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : null}

          {/* Play overlay for video */}
          {url && isVideo && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
            <div style={{ textAlign: 'center', color: 'var(--vscode-descriptionForeground, #888)', fontSize: 12 }}>
              {icon && <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>}
              <div>Niet ingesteld</div>
            </div>
          )}

          {/* Generating state */}
          {isGenerating && !url && (
            <div style={{ textAlign: 'center', color: '#f59e0b', fontSize: 12 }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>⏳</div>
              <div>Bezig met genereren...</div>
            </div>
          )}

          {/* Status badge */}
          {badgeText && (
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                background: badgeColor,
                color: '#fff',
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              {badgeText}
            </span>
          )}

          {/* History button */}
          {mediaItem && historyItems.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
              style={{
                position: 'absolute',
                top: 6,
                left: 6,
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                padding: '2px 6px',
                cursor: 'pointer',
              }}
              title={`${historyItems.length} eerdere versie(s)`}
            >
              ⏱️ {historyItems.length}
            </button>
          )}
        </div>

        {/* Info + actions */}
        <div style={{ padding: '8px 10px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</div>

          {/* Error message */}
          {isFailed && errorMessage && (
            <div style={{ fontSize: 10, color: '#ef4444', marginBottom: 4, lineHeight: 1.3 }}>
              {errorMessage}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: mediaItem ? '1fr 1fr' : '1fr', gap: 4 }}>
            {onReplace && (
              <button
                onClick={(e) => { e.stopPropagation(); onReplace(subtype); }}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  fontSize: 11,
                  cursor: 'pointer',
                  background: 'var(--vscode-button-background, #0078d4)',
                  color: 'var(--vscode-button-foreground, #fff)',
                  border: 'none',
                  borderRadius: 4,
                }}
              >
                {mediaItem ? 'Vervang' : 'Genereer'}
              </button>
            )}
            {mediaItem && onReplace && (
              <button
                onClick={(e) => { e.stopPropagation(); onReplace(subtype); }}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  fontSize: 11,
                  cursor: 'pointer',
                  background: '#8b5cf6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
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
              style={{
                width: '100%',
                padding: '4px 8px',
                fontSize: 11,
                cursor: 'pointer',
                background: 'transparent',
                color: '#ef4444',
                border: '1px solid #ef4444',
                borderRadius: 4,
                marginTop: 4,
              }}
            >
              Verwijderen
            </button>
          )}

          {/* Updated date */}
          {mediaItem && (
            <div style={{ fontSize: 10, color: 'var(--vscode-descriptionForeground, #888)', marginTop: 4 }}>
              {new Date(mediaItem.updated_at).toLocaleDateString('nl-NL')}
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowHistory(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1e1e1e',
              border: '1px solid #333',
              borderRadius: 8,
              padding: 20,
              width: 500,
              maxHeight: '80vh',
              overflow: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Versiegeschiedenis — {label}</h3>
              <button
                onClick={() => setShowHistory(false)}
                style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 16 }}
              >
                ✕
              </button>
            </div>

            {historyItems.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
                Geen eerdere versies gevonden.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {historyItems.map((item) => {
                  const histUrl = item.file_url || getAssetUrl(item.storage_path);
                  const histIsVideo = Boolean(
                    item.mime_type?.startsWith('video/') ||
                    (histUrl ? /\.(mp4|webm|mov)$/i.test(histUrl) : false)
                  );
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        gap: 12,
                        padding: 10,
                        background: '#252526',
                        borderRadius: 6,
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 80,
                          height: 50,
                          borderRadius: 4,
                          flexShrink: 0,
                          background: '#000',
                          overflow: 'hidden',
                          position: 'relative',
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
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : histUrl ? (
                          <img
                            src={histUrl}
                            alt={item.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', fontSize: 10 }}>
                            —
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                          {new Date(item.created_at).toLocaleString('nl-NL')}
                        </div>
                        <div style={{ fontSize: 11, color: '#888' }}>
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
                          style={{
                            padding: '6px 12px',
                            background: '#094771',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 12,
                            cursor: 'pointer',
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
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}
