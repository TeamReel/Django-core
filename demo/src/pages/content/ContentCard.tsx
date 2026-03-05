/**
 * Content Library — Shared presentation components
 *
 * Extracted from ContentLibraryPage.tsx for file-size compliance.
 * ContentCard, FilterChip, EmptyState, ContentPreviewModal.
 */

import React from 'react';
import { Card, Text, Badge, Button } from '@django-core/design-system';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import { formatFileSize } from '../../hooks/useFileAssets';
import { getAssetTypeLabel, getAssetTypeIcon, type ContentItem } from './contentLibraryTypes';
import styles from './ContentCard.module.css';

// ============================================================================
// ContentCard
// ============================================================================

export function ContentCard({
  item,
  onPreview,
  onDownload,
  onShare,
  onDelete,
}: {
  item: ContentItem;
  onPreview?: (item: ContentItem) => void;
  onDownload?: (item: ContentItem) => void;
  onShare?: (item: ContentItem) => void;
  onDelete?: (item: ContentItem) => void;
}) {
  const assetType = (item.extraction_metadata?.asset_type as string) || 'other';
  const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
  const url = item.file_url || getAssetUrl(item.storage_path);
  const isVideo = Boolean(
    item.mime_type?.startsWith('video/') ||
    (url ? /\.(mp4|webm|mov)$/i.test(url) : false)
  );

  const projectName = typeof item.project === 'object' ? item.project?.name : '';
  const activityTitle = (item.extraction_metadata?.activity_title as string) || (typeof item.activity === 'object' ? item.activity?.title : '');
  const sportType = (item.extraction_metadata?.sport_type as string) || '';
  const clubName = (item.extraction_metadata?.club_name as string) || '';
  const teamName = (item.extraction_metadata?.team_name as string) || '';
  const seasonKey = (item.extraction_metadata?.season_key as string) || '';
  const tags = (item.extraction_metadata?.tags as string[]) || [];

  const opponent = (item.extraction_metadata?.opponent as string) || '';
  const activityDate = (item.extraction_metadata?.activity_date as string) || '';
  const homeAway = (item.extraction_metadata?.home_away as string) || '';
  const scoreHome = item.extraction_metadata?.score_home as number | undefined;
  const scoreAway = item.extraction_metadata?.score_away as number | undefined;

  return (
    <Card className="gallery-card p-0 overflow-hidden flex-col cursor-pointer" onClick={() => onPreview?.(item)}>
      <div className="gallery-card-inner flex-col flex-1">
        {/* Thumbnail */}
        <div className={`gallery-card-thumb flex-center overflow-hidden relative border-bottom ${styles.thumbContainer}`}>
          {url ? (
            isVideo ? (
              <video src={url} className={`object-contain ${styles.thumbMedia}`} muted playsInline preload="metadata" />
            ) : (
              <img src={url} alt={item.title || getAssetTypeLabel(normalizedType)} className={`p-8 object-contain ${styles.thumbMedia}`} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )
          ) : (
            <span className={styles.fallbackIcon}>{getAssetTypeIcon(normalizedType)}</span>
          )}
          <span className={`absolute fw-700 badge-overlay ${styles.typeBadge}`}>
            {getAssetTypeLabel(normalizedType)}
          </span>
          {isVideo && (
            <span className={`absolute fw-700 badge-overlay ${styles.videoBadge}`}>
              🎬 Video
            </span>
          )}
          {sportType && (
            <span className={`absolute fw-600 badge-overlay ${styles.sportBadge}`}>
              ⚽ {sportType}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-12 flex-col gap-6 flex-1">
          <Text weight="bold" size="sm" className="truncate">{item.title || getAssetTypeLabel(normalizedType)}</Text>

          {(clubName || teamName || projectName || activityTitle) && (
            <div className="gallery-card-verbose flex-row flex-wrap gap-4">
              {clubName && <span className="flex-row gap-2 fs-11 text-secondary">{clubName}</span>}
              {teamName && <span className="flex-row gap-2 fs-11 text-secondary">👕 {teamName}</span>}
              {!clubName && !teamName && projectName && <span className="fs-11 text-secondary">{projectName}</span>}
            </div>
          )}

          {activityTitle && <Text size="xs" color="secondary" className="truncate">{activityTitle}</Text>}

          {(opponent || activityDate || scoreHome !== undefined) && (
            <div className="flex-row flex-wrap gap-6 text-secondary fs-11">
              {opponent && <span className="flex-row gap-2">{homeAway === 'away' ? '📍' : '🏠'} vs {opponent}</span>}
              {activityDate && <span>📅 {new Date(activityDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>}
              {scoreHome !== undefined && scoreAway !== undefined && <span className="fw-700 text-primary">{scoreHome} - {scoreAway}</span>}
            </div>
          )}

          {tags.length > 0 && (
            <div className="gallery-card-verbose flex-row flex-wrap gap-4">
              {tags.slice(0, 3).map((tag, i) => (
                <span key={i} className={`rounded-6 text-secondary fs-11 ${styles.tagChip}`}>#{tag}</span>
              ))}
              {tags.length > 3 && <span className="text-secondary fs-11">+{tags.length - 3}</span>}
            </div>
          )}

          <div className={`gallery-card-verbose flex-row flex-wrap gap-4 ${styles.badgesRow}`}>
            <Badge size="sm" variant="default">{item.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}</Badge>
            {seasonKey && <Badge size="sm" variant="default">📅 {seasonKey}</Badge>}
          </div>

          <Text size="xs" color="secondary" className="mt-4">
            {new Date(item.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
            {item.file_size_bytes && item.file_size_bytes > 0 && <> &middot; {formatFileSize(item.file_size_bytes)}</>}
          </Text>

          <div className={`mt-8 gap-4 border-top flex-row ${styles.actionsRow}`}>
            <button onClick={(e) => { e.stopPropagation(); onDownload?.(item); }} title="Download" className="flex-center flex-1 gap-4 rounded-4 cursor-pointer fs-12 border bg-surface p-6 px-8">⬇️</button>
            <button onClick={(e) => { e.stopPropagation(); onShare?.(item); }} title="Share" className="flex-center flex-1 gap-4 rounded-4 cursor-pointer fs-12 border bg-surface p-6 px-8">📤</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete?.(item); }} title="Delete" className="flex-center flex-1 gap-4 rounded-4 cursor-pointer fs-12 border bg-surface p-6 px-8">Verwijder</button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// FilterChip
// ============================================================================

export function FilterChip({ active, onClick, label, count }: {
  active: boolean; onClick: () => void; label: string; count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`${styles.filterChip} ${active ? styles.filterChipActive : ''}`}
    >
      {label}
      <span className={`${styles.chipCount} ${active ? styles.chipCountActive : ''}`}>
        {count}
      </span>
    </button>
  );
}

// ============================================================================
// EmptyState
// ============================================================================

export function EmptyState({ icon, message, sub, action }: { icon: string; message: string; sub: string; action?: React.ReactNode }) {
  return (
    <Card className={`text-center ${styles.emptyCard}`}>
      <div className={`mb-8 ${styles.emptyIcon}`}>{icon}</div>
      <Text color="secondary">{message}</Text>
      <Text size="sm" color="secondary" className="mt-4">{sub}</Text>
      {action && <div className="mt-16">{action}</div>}
    </Card>
  );
}

// ============================================================================
// ContentPreviewModal
// ============================================================================

export function ContentPreviewModal({ item, onClose }: { item: ContentItem; onClose: () => void }) {
  const url = item.file_url || getAssetUrl(item.storage_path);
  const isVideo = Boolean(
    item.mime_type?.startsWith('video/') ||
    (url ? /\.(mp4|webm|mov)$/i.test(url) : false)
  );

  return (
    <div
      className={`flex-center fixed inset-0 z-1000 ${styles.overlay}`}
      onClick={onClose}
    >
      <div
        className={`bg-surface rounded-12 overflow-auto p-16 ${styles.modalContainer}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between mb-16">
          <Text weight="bold" size="lg">{item.title || 'Preview'}</Text>
          <Button variant="secondary" size="sm" onClick={onClose}>Sluiten</Button>
        </div>
        {url && (
          isVideo ? (
            <video src={url} className={styles.previewMedia} controls autoPlay playsInline />
          ) : (
            <img src={url} alt={item.title} className={styles.previewMedia} />
          )
        )}
        <div className="mt-16 flex-row justify-end gap-8">
          <Button variant="primary" size="sm" onClick={() => { if (url) window.open(url, '_blank'); }}>
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}
