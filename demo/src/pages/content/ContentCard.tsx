/**
 * Content Library — Shared presentation components
 *
 * Extracted from ContentLibraryPage.tsx for file-size compliance.
 * ContentCard, FilterChip, EmptyState, ContentPreviewModal.
 */

import React, { memo, useRef, useState } from 'react';
import { Card, Text, Badge, Button } from '@django-core/design-system';
import { Download, Share2, Trash2, X, Play, Pause, Maximize2, Clock, FileText, Tag, Calendar, Film, CircleDot, MapPin, Home } from 'lucide-react';
import { ContentIcon } from '../../components/ContentIcon';
import { clickableProps } from '@/utils/a11y';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import { formatFileSize } from '../../hooks/useFileAssets';
import { getAssetTypeLabel, getAssetTypeIcon, type ContentItem } from './contentLibraryTypes';
import styles from './ContentCard.module.css';

// ============================================================================
// ContentCard
// ============================================================================

export const ContentCard = memo(function ContentCard({
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
    <Card className="gallery-card p-0 overflow-hidden flex-col cursor-pointer" onClick={() => onPreview?.(item)} {...clickableProps(() => onPreview?.(item))}>
      <div className="gallery-card-inner flex-col flex-1">
        {/* Thumbnail */}
        <div className={`gallery-card-thumb flex-center overflow-hidden relative border-bottom ${styles.thumbContainer}`}>
          {url ? (
            isVideo ? (
              <video src={url} className={`object-contain ${styles.thumbMedia}`} muted playsInline preload="metadata" />
            ) : (
              <img src={url} alt={item.title || getAssetTypeLabel(normalizedType)} className={`p-8 object-contain ${styles.thumbMedia}`} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )
          ) : (
            <span className={styles.fallbackIcon}><ContentIcon icon={getAssetTypeIcon(normalizedType)} size={24} /></span>
          )}
          <span className={`absolute fw-700 badge-overlay ${styles.typeBadge}`}>
            {getAssetTypeLabel(normalizedType)}
          </span>
          {isVideo && (
            <span className={`absolute fw-700 badge-overlay ${styles.videoBadge}`}>
              <Film size={12} aria-hidden="true" /> Video
            </span>
          )}
          {sportType && (
            <span className={`absolute fw-600 badge-overlay ${styles.sportBadge}`}>
              <CircleDot size={12} aria-hidden="true" /> {sportType}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-12 flex-col gap-6 flex-1">
          <Text weight="bold" size="sm" className="truncate">{item.title || getAssetTypeLabel(normalizedType)}</Text>

          {(clubName || teamName || projectName || activityTitle) && (
            <div className="gallery-card-verbose flex-row flex-wrap gap-4">
              {clubName && <span className="flex-row gap-2 fs-11 text-secondary">{clubName}</span>}
              {teamName && <span className="flex-row gap-2 fs-11 text-secondary">{teamName}</span>}
              {!clubName && !teamName && projectName && <span className="fs-11 text-secondary">{projectName}</span>}
            </div>
          )}

          {activityTitle && <Text size="xs" color="secondary" className="truncate">{activityTitle}</Text>}

          {(opponent || activityDate || scoreHome !== undefined) && (
            <div className="flex-row flex-wrap gap-6 text-secondary fs-11">
              {opponent && <span className="flex-row gap-2">{homeAway === 'away' ? <MapPin size={12} aria-hidden="true" /> : <Home size={12} aria-hidden="true" />} vs {opponent}</span>}
              {activityDate && <span><Calendar size={12} aria-hidden="true" /> {new Date(activityDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>}
              {scoreHome !== undefined && scoreAway !== undefined && <span className="fw-700 text-primary">{scoreHome} - {scoreAway}</span>}
            </div>
          )}

          {tags.length > 0 && (
            <div className="gallery-card-verbose flex-row flex-wrap gap-4">
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className={`rounded-6 text-secondary fs-11 ${styles.tagChip}`}>#{tag}</span>
              ))}
              {tags.length > 3 && <span className="text-secondary fs-11">+{tags.length - 3}</span>}
            </div>
          )}

          <div className={`gallery-card-verbose flex-row flex-wrap gap-4 ${styles.badgesRow}`}>
            <Badge size="sm" variant="default">{item.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}</Badge>
            {seasonKey && <Badge size="sm" variant="default"><Calendar size={12} aria-hidden="true" /> {seasonKey}</Badge>}
          </div>

          <Text size="xs" color="secondary" className="mt-4">
            {new Date(item.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
            {item.file_size_bytes && item.file_size_bytes > 0 && <> &middot; {formatFileSize(item.file_size_bytes)}</>}
          </Text>

          <div className={`mt-8 gap-4 border-top flex-row ${styles.actionsRow}`}>
            <button onClick={(e) => { e.stopPropagation(); onDownload?.(item); }} title="Download" className="flex-center flex-1 gap-4 rounded-4 cursor-pointer fs-12 border bg-surface p-6 px-8"><Download size={14} aria-hidden="true" /></button>
            <button onClick={(e) => { e.stopPropagation(); onShare?.(item); }} title="Share" className="flex-center flex-1 gap-4 rounded-4 cursor-pointer fs-12 border bg-surface p-6 px-8"><Share2 size={14} aria-hidden="true" /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete?.(item); }} title="Verwijderen" className="flex-center flex-1 gap-4 rounded-4 cursor-pointer fs-12 border bg-surface p-6 px-8">Verwijder</button>
          </div>
        </div>
      </div>
    </Card>
  );
});

// ============================================================================
// FilterChip
// ============================================================================

export function FilterChip({ active, onClick, label, count, icon }: {
  active: boolean; onClick: () => void; label: string; count: number; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`${styles.filterChip} ${active ? styles.filterChipActive : ''}`}
    >
      {icon && <span className={styles.chipIcon}>{icon}</span>}
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

export function EmptyState({ icon, message, sub, action }: { icon: React.ReactNode; message: string; sub: string; action?: React.ReactNode }) {
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
// ContentPreviewModal — Full-size preview with video player + metadata card
// ============================================================================

export function ContentPreviewModal({ item, onClose, onDownload, onShare, onDelete }: {
  item: ContentItem;
  onClose: () => void;
  onDownload?: (item: ContentItem) => void;
  onShare?: (item: ContentItem) => void;
  onDelete?: (item: ContentItem) => void;
}) {
  const url = item.file_url || getAssetUrl(item.storage_path);
  const isVideo = Boolean(
    item.mime_type?.startsWith('video/') ||
    (url ? /\.(mp4|webm|mov)$/i.test(url) : false)
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  useEscapeKey(onClose);

  const assetType = ((item.extraction_metadata?.asset_type as string) || 'other').replace(/_[a-f0-9]{8}$/i, '');
  const activityTitle = (item.extraction_metadata?.activity_title as string) || (typeof item.activity === 'object' ? item.activity?.title : '');
  const clubName = (item.extraction_metadata?.club_name as string) || '';
  const tags = (item.extraction_metadata?.tags as string[]) || [];

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
    else { videoRef.current.pause(); setIsPlaying(false); }
  };

  return (
    <div className={styles.detailOverlay} onClick={onClose} role="presentation">
      <div className={styles.detailPanel} onClick={(e) => e.stopPropagation()} role="dialog">

        {/* Header */}
        <div className={styles.detailHeader}>
          <span className="fw-600 fs-16 text-primary truncate flex-1">{item.title || getAssetTypeLabel(assetType)}</span>
          <button onClick={onClose} className={styles.detailCloseBtn} aria-label="Sluiten">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className={styles.detailBody}>

          {/* Preview area */}
          <div className={styles.detailPreview}>
            {url ? (
              isVideo ? (
                <div className={styles.videoContainer}>
                  <video
                    ref={videoRef}
                    src={url}
                    className={styles.detailMedia}
                    playsInline
                    preload="metadata"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    controls
                  />
                  <button onClick={togglePlay} className={styles.videoPlayBtn} data-playing={isPlaying}>
                    {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                  </button>
                </div>
              ) : (
                <img src={url} alt={item.title || ''} className={styles.detailMedia}
                  loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )
            ) : (
              <div className={styles.detailMediaFallback}>
                <FileText size={48} />
              </div>
            )}
            {/* Type badge */}
            <span className={styles.detailTypeBadge} data-video={isVideo ? 'true' : undefined}>
              {isVideo ? 'VIDEO' : item.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}
            </span>
          </div>

          {/* Metadata card */}
          <div className={styles.detailMeta}>
            {activityTitle && (
              <div className={styles.detailMetaRow}>
                <Calendar size={16} className={styles.detailMetaIcon} />
                <span className="fs-14 text-primary fw-500">{activityTitle}</span>
              </div>
            )}
            {clubName && (
              <div className={styles.detailMetaRow}>
                <Tag size={16} className={styles.detailMetaIcon} />
                <span className="fs-13 text-muted">{clubName}</span>
              </div>
            )}
            <div className={styles.detailMetaRow}>
              <Clock size={16} className={styles.detailMetaIcon} />
              <span className="fs-13 text-muted">
                {new Date(item.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                {item.file_size_bytes && item.file_size_bytes > 0 && <> &middot; {formatFileSize(item.file_size_bytes)}</>}
              </span>
            </div>
            {item.mime_type && (
              <div className={styles.detailMetaRow}>
                <FileText size={16} className={styles.detailMetaIcon} />
                <span className="fs-13 text-muted">{item.mime_type}</span>
              </div>
            )}
            {tags.length > 0 && (
              <div className={styles.detailTags}>
                {tags.map((tag) => (
                  <span key={tag} className={styles.detailTag}>#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className={styles.detailActions}>
          <button onClick={() => { if (url) window.open(url, '_blank'); }} className={styles.detailActionBtn} data-variant="primary">
            <Download size={18} />Download
          </button>
          {onShare && (
            <button onClick={() => onShare(item)} className={styles.detailActionBtn}>
              <Share2 size={18} />Delen
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(item)} className={styles.detailActionBtn} data-variant="danger">
              <Trash2 size={18} />Verwijder
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
