/**
 * ThumbnailCard - Compact content thumbnail for timeline view
 */
import React from 'react';
import { getAssetUrl } from '@/hooks/useBrandProfile';
import { getAssetTypeLabel, getAssetTypeIcon, type ContentItem } from '../contentLibraryTypes';
import styles from '../GalleryMatchTimeline.cards.module.css';

interface ThumbnailCardProps {
  item: ContentItem;
  onPreview: (item: ContentItem) => void;
}

export function ThumbnailCard({ item, onPreview }: ThumbnailCardProps) {
  const meta = item.extraction_metadata || {};
  const assetType = (meta.asset_type as string) || 'other';
  const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
  const url = item.file_url || getAssetUrl(item.storage_path);
  const isVideo = Boolean(
    item.mime_type?.startsWith('video/') ||
    (url ? /\.(mp4|webm|mov)$/i.test(url) : false)
  );

  return (
    <div
      className={styles.thumbCard}
      onClick={() => onPreview(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onPreview(item); }}
    >
      <div className={styles.thumbImageWrap}>
        {url ? (
          isVideo ? (
            <video
              src={url}
              className={styles.thumbImage}
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={url}
              alt={item.title || getAssetTypeLabel(normalizedType)}
              className={styles.thumbImage}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )
        ) : (
          <div className={styles.thumbFallback}>
            {getAssetTypeIcon(normalizedType)}
          </div>
        )}
        {isVideo && <span className={styles.thumbBadge}>Video</span>}
      </div>
      <div className={styles.thumbInfo}>
        <span className={styles.thumbType}>{getAssetTypeLabel(normalizedType)}</span>
        <span className={styles.thumbDate}>
          {new Date(item.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  );
}
