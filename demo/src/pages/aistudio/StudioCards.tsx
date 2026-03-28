/**
 * Studio card & modal components extracted from AIStudioPage.
 */

import React, { useRef, useState } from 'react';
import { BottomSheet } from '@django-core/design-system';
import { Play, Download, Share2, X } from 'lucide-react';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import { getAssetTypeLabel } from '../content/contentLibraryTypes';
import type { ContentItem } from '../content/contentLibraryTypes';
import { downloadFile } from '../../utils/downloadFile';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import styles from './StudioCards.module.css';

export type ViewMode = 'type' | 'match';

// ============================================================================
// StudioContentCard — single content thumbnail card
// ============================================================================

export function StudioContentCard({
  item,
  onPreview,
  viewMode = 'type',
}: {
  item: ContentItem;
  onPreview: (item: ContentItem) => void;
  viewMode?: ViewMode;
}) {
  const url = item.file_url || getAssetUrl(item.storage_path);
  const isVideo = Boolean(
    item.mime_type?.startsWith('video/') ||
    (url ? /\.(mp4|webm|mov)$/i.test(url) : false)
  );

  // Contextual label: match view → content type, type view → opponent / match info
  let label = '';
  if (viewMode === 'match') {
    const assetType = item.extraction_metadata?.asset_type as string | undefined;
    label = assetType ? getAssetTypeLabel(assetType) : (item.title || '');
  } else {
    const opponent = (item.extraction_metadata?.opponent as string) || '';
    const activityTitle = (item.extraction_metadata?.activity_title as string) || '';
    label = opponent ? `vs ${opponent}` : activityTitle || item.title || '';
  }

  return (
    <button className={styles.contentCard} onClick={() => onPreview(item)} type="button">
      <div className={styles.contentCardThumb}>
        {url ? (
          isVideo ? (
            <>
              <video src={url} className={styles.contentCardMedia} muted playsInline preload="metadata" />
              <span className={styles.contentCardPlayIcon}><Play size={20} fill="white" /></span>
            </>
          ) : (
            <img
              src={url}
              alt={item.title || ''}
              className={styles.contentCardMedia}
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )
        ) : (
          <span className={styles.contentCardFallback}></span>
        )}
      </div>
      {label && (
        <div className={styles.contentCardInfo}>
          <span className={styles.contentCardLabel}>{label}</span>
        </div>
      )}
    </button>
  );
}

// ============================================================================
// StudioPreviewModal — Full-screen content preview
// ============================================================================

export function StudioPreviewModal({
  item,
  onClose,
  onShare,
}: {
  item: ContentItem;
  onClose: () => void;
  onShare?: (url: string, title: string, contentType: 'image' | 'video') => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEscapeKey(onClose);
  const url = item.file_url || getAssetUrl(item.storage_path);
  const isVideo = Boolean(
    item.mime_type?.startsWith('video/') ||
    (url ? /\.(mp4|webm|mov)$/i.test(url) : false)
  );

  const assetType = (item.extraction_metadata?.asset_type as string) || '';
  const opponent = (item.extraction_metadata?.opponent as string) || '';
  const activityTitle = (item.extraction_metadata?.activity_title as string) || '';

  const [downloading, setDownloading] = useState(false);
  const handleDownload = async () => {
    if (!url) return;
    setDownloading(true);
    try {
      const ext = isVideo ? 'mp4' : 'jpg';
      const filename = `${(item.title || 'download').replace(/\s+/g, '_')}.${ext}`;
      await downloadFile(url, filename);
    } catch {
      // Fallback: open in new tab
      window.open(url, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={styles.previewOverlay} onClick={onClose} role="presentation">
      <div className={styles.previewContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Content preview">
        {/* Close button */}
        <button className={styles.previewClose} onClick={onClose} type="button" aria-label="Sluiten">
          <X size={20} />
        </button>

        {/* Media */}
        <div className={styles.previewMedia}>
          {url && isVideo ? (
            <video
              ref={videoRef}
              src={url}
              className={styles.previewMediaEl}
              playsInline
              controls
            />
          ) : url ? (
            <img src={url} alt={item.title || ''} className={styles.previewMediaEl} loading="lazy" />
          ) : (
            <div className={styles.previewFallback}>Geen preview beschikbaar</div>
          )}
        </div>

        {/* Info */}
        <div className={styles.previewInfo}>
          <h3 className={styles.previewTitle}>{item.title || getAssetTypeLabel(assetType)}</h3>
          {(opponent || activityTitle) && (
            <p className={styles.previewSub}>
              {opponent ? `vs ${opponent}` : activityTitle}
            </p>
          )}
          <p className={styles.previewDate}>
            {new Date(item.created_at).toLocaleDateString('nl-NL', {
              weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        {/* Actions */}
        <div className={styles.previewActions}>
          <button className={styles.previewAction} onClick={handleDownload} disabled={downloading} type="button">
            <Download size={18} /> {downloading ? 'Laden...' : 'Download'}
          </button>
          {onShare && url && (
            <button className={styles.previewAction} onClick={() => { onShare(url, item.title || 'Content', isVideo ? 'video' : 'image'); onClose(); }} type="button">
              <Share2 size={18} /> Delen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ViewAllSheet — BottomSheet showing all items for one content type or match
// ============================================================================

export interface ViewAllData {
  title: string;
  items: ContentItem[];
  viewMode?: ViewMode;
}

export function ViewAllSheet({
  data: sheetData,
  isOpen,
  onClose,
  onPreview,
}: {
  data: ViewAllData | null;
  isOpen: boolean;
  onClose: () => void;
  onPreview: (item: ContentItem) => void;
}) {
  if (!sheetData) return null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`${sheetData.title} (${sheetData.items.length})`}
    >
      <div className={styles.viewAllGrid}>
        {sheetData.items.map((item) => (
          <StudioContentCard key={item.id} item={item} onPreview={(it) => { onClose(); onPreview(it); }} viewMode={sheetData.viewMode} />
        ))}
      </div>
    </BottomSheet>
  );
}
