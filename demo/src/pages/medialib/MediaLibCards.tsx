import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Text, Badge } from '@django-core/design-system';
import { getContentType, getHierarchyLevel, CONTENT_TYPE_LABELS, type BrandAsset } from '../../hooks/useBrandAssets';
import { getFileIcon, formatFileSize, type FileAsset } from '../../hooks/useFileAssets';
import {
  type PreviewItem,
  type MemberMediaItem,
  friendlyAssetLabel,
  levelColor,
  levelLabel,
  getBrandAssetTags,
  getMemberMediaTags,
  buildBrandAssetPageHref,
  buildMemberAssetPageHref,
} from './medialibHelpers';

// ============================================================================
// Preview Modal
// ============================================================================

export function PreviewModal({ item, onClose }: { item: PreviewItem; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="modal-backdrop p-24"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex-col bg-surface border rounded-12 overflow-hidden"
        style={{
          width: 'min(1000px, 100%)',
          maxHeight: '85vh',
        }}
      >
        <div className="p-12 flex-between gap-12 border-bottom">
          <div className="min-w-0">
            <Text weight="bold" size="sm" className="truncate">
              {item.title}
            </Text>
            {item.subtitle && (
              <Text size="xs" color="secondary" className="truncate">
                {item.subtitle}
              </Text>
            )}
          </div>
          <div className="flex-row gap-8">
            {item.linkHref && (
              <Link
                to={item.linkHref}
                className="fs-12 text-link text-decoration-none"
              >
                Open asset pagina
              </Link>
            )}
            <button
              onClick={onClose}
              className="border bg-transparent rounded-8 cursor-pointer fs-12 text-primary"
              style={{ padding: '6px 10px' }}
            >
              Sluiten
            </button>
          </div>
        </div>

        <div className="flex-1 bg-primary flex-center p-12">
          {item.url ? (
            item.isVideo ? (
              <video
                src={item.url}
                controls
                autoPlay
                playsInline
                className="w-full object-contain"
                style={{ maxHeight: '70vh' }}
              />
            ) : (
              <img
                src={item.url}
                alt={item.title}
                className="w-full object-contain"
                style={{ maxHeight: '70vh' }}
              />
            )
          ) : (
            <Text color="secondary">Geen preview beschikbaar.</Text>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Asset Card
// ============================================================================

export function AssetCard({ asset, orgSlugOrId, onPreview }: { asset: BrandAsset; orgSlugOrId?: string; onPreview: (item: PreviewItem) => void }) {
  const level = getHierarchyLevel(asset);
  const contentType = getContentType(asset.asset_type);
  const isVideo = asset.file_details?.content_type?.startsWith('video/');
  const tags = getBrandAssetTags(asset);
  const linkHref = buildBrandAssetPageHref(asset, orgSlugOrId);

  return (
    <Card className="p-0 overflow-hidden flex-col">
      {/* Thumbnail */}
      <div className="flex-center overflow-hidden relative border-bottom" style={{
        height: 180,
        backgroundColor: 'var(--app-bg)',
        cursor: asset.url ? 'pointer' : 'default',
      }}
      onClick={() => {
        if (!asset.url) return;
        onPreview({
          url: asset.url,
          title: friendlyAssetLabel(asset),
          subtitle: asset.project_name || asset.profile_name || asset.organisation_name || undefined,
          isVideo: Boolean(isVideo),
          linkHref,
        });
      }}
      >
        {asset.url ? (
          isVideo ? (
            <video
              src={asset.url}
              className="object-contain" style={{ maxWidth: '100%', maxHeight: '100%' }}
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={asset.url}
              alt={asset.alt_text || friendlyAssetLabel(asset)}
              className="p-8 object-contain"
              style={{ maxWidth: '100%', maxHeight: '100%' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )
        ) : (
          <span style={{ fontSize: 40, opacity: 0.3 }}>
            {contentType === 'kit' ? '👕' : contentType === 'logo' ? '🏷️' : contentType === 'closeup' ? '📸' : '📁'}
          </span>
        )}
        {/* Level badge overlay */}
        <span className="badge-overlay" style={{
          top: 8, left: 8,
          backgroundColor: levelColor(level),
        }}>
          {levelLabel(level)}
        </span>
        {isVideo && (
          <span className="badge-overlay" style={{
            top: 8, right: 8,
            backgroundColor: '#dc2626',
          }}>
            🎬 Video
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-12 flex-col gap-6 flex-1">
        <Text weight="bold" size="sm" className="truncate">
          {friendlyAssetLabel(asset)}
        </Text>
        <Text size="xs" color="secondary" className="truncate">
          {asset.project_name || asset.profile_name || asset.organisation_name || '—'}
        </Text>
        <div className="flex-row flex-wrap gap-4">
          <Badge size="sm" variant="default">{CONTENT_TYPE_LABELS[contentType] || contentType}</Badge>
          {tags.map((t) => (
            <Badge key={t} size="sm" variant="default" className="opacity-80">{t}</Badge>
          ))}
          {asset.file_details?.content_type && (
            <Badge size="sm" variant="default" className="opacity-70">
              {asset.file_details.content_type.split('/')[1]?.toUpperCase() || asset.file_details.content_type}
            </Badge>
          )}
        </div>
        {linkHref && (
          <Link
            to={linkHref}
            onClick={(e) => e.stopPropagation()}
            className="fs-12 text-link text-decoration-none mt-4"
          >
            Open asset pagina
          </Link>
        )}
        {asset.file_details && (
            <Text size="xs" color="secondary" className="mt-4">
            {asset.file_details.name?.length > 30 ? asset.file_details.name.slice(0, 27) + '...' : asset.file_details.name}
            {asset.file_details.size > 0 && <> &middot; {formatFileSize(asset.file_details.size)}</>}
          </Text>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// File Card
// ============================================================================

export function FileCard({ file, onDownload }: { file: FileAsset; onDownload: (id: string) => void }) {
  return (
    <Card className="p-0 overflow-hidden flex-col">
      <div className="flex-center border-bottom" style={{
        height: 120,
        backgroundColor: 'var(--app-bg)',
      }}>
        <span style={{ fontSize: 40 }}>{getFileIcon(file.mime_type)}</span>
      </div>
      <div className="p-12 flex-col gap-6 flex-1">
        <Text weight="bold" size="sm" className="truncate">
          {file.original_name || 'Naamloos bestand'}
        </Text>
        <div className="flex-row flex-wrap gap-4">
          <Badge size="sm" variant="default">{file.mime_type.split('/')[1]?.toUpperCase() || file.mime_type}</Badge>
          {file.is_public && <Badge size="sm" variant="primary">Publiek</Badge>}
        </div>
        <Text size="xs" color="secondary">
          {formatFileSize(file.file_size)}
          {file.uploaded_by_name && <> &middot; {file.uploaded_by_name}</>}
        </Text>
        <button
          onClick={() => onDownload(file.id)}
          className="mt-4 fs-11 rounded-6 bg-transparent cursor-pointer border text-primary"
          style={{
            alignSelf: 'flex-start', padding: '4px 10px',
          }}
        >
          ⬇ Download
        </button>
      </div>
    </Card>
  );
}

// ============================================================================
// Member Media Card
// ============================================================================

export function MemberMediaCard({ item, orgSlugOrId, onPreview }: {
  item: MemberMediaItem;
  orgSlugOrId?: string;
  onPreview: (item: PreviewItem) => void;
}) {
  const isVideo = item.asset_type.includes('intro') || item.asset_type.includes('celebration');
  const tags = getMemberMediaTags(item);
  const linkHref = buildMemberAssetPageHref(item, orgSlugOrId);

  const assetTypeLabels: Record<string, string> = {
    member_profile: 'Profile',
    member_fullbody: 'Full Body',
    member_closeup: 'Close-up',
    member_intro: 'Intro Video',
    member_celebration: 'Celebration',
  };
  const friendlyType = assetTypeLabels[item.asset_type] || item.asset_type.replace('member_', '').replace(/_/g, ' ');

  return (
    <Card className="p-0 overflow-hidden flex-col">
      <div className="flex-center overflow-hidden relative border-bottom" style={{
        height: 180,
        backgroundColor: 'var(--app-bg)',
        cursor: item.url ? 'pointer' : 'default',
      }}
      onClick={() => {
        onPreview({
          url: item.url || null,
          title: item.member_name || item.name || 'Member Media',
          subtitle: item.project_name || undefined,
          isVideo: Boolean(isVideo),
          linkHref,
        });
      }}
      >
        {item.url ? (
          isVideo ? (
            <video
              src={item.url}
              className="object-contain" style={{ maxWidth: '100%', maxHeight: '100%' }}
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={item.url}
              alt={item.name}
              className="p-8 object-contain"
              style={{ maxWidth: '100%', maxHeight: '100%' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )
        ) : (
          <span style={{ fontSize: 40, opacity: 0.3 }}>👤</span>
        )}
        <span className="badge-overlay" style={{
          top: 8, left: 8,
          backgroundColor: '#059669',
        }}>
          Member
        </span>
        {isVideo && (
          <span className="badge-overlay" style={{
            top: 8, right: 8,
            backgroundColor: '#dc2626',
          }}>
            🎬 Video
          </span>
        )}
      </div>

      <div className="p-12 flex-col gap-6 flex-1">
        <Text weight="bold" size="sm" className="truncate">
          {item.member_name || item.name || 'Member Media'}
        </Text>
        <Text size="xs" color="secondary" className="truncate">
          {item.project_name || '—'}
        </Text>
        <div className="flex-row flex-wrap gap-4">
          <Badge size="sm" variant="default">{friendlyType}</Badge>
          {tags.map((t) => (
            <Badge key={t} size="sm" variant="default" className="opacity-80">{t}</Badge>
          ))}
        </div>
        {linkHref && (
          <Link
            to={linkHref}
            onClick={(e) => e.stopPropagation()}
            className="fs-12 text-link text-decoration-none mt-4"
          >
            Open asset pagina
          </Link>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// Filter Chip
// ============================================================================

export function FilterChip({ active, onClick, label, count }: {
  active: boolean; onClick: () => void; label: string; count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex gap-4 fs-12 cursor-pointer rounded-16 transition"
      style={{
        alignItems: 'center',
        padding: '5px 12px', fontWeight: active ? 600 : 400,
        border: `1px solid ${active ? 'var(--color-primary, #2563eb)' : 'var(--app-border)'}`,
        backgroundColor: active ? 'var(--color-primary-light, #dbeafe)' : 'transparent',
        color: active ? 'var(--color-primary, #2563eb)' : 'var(--app-text-secondary)',
      }}
    >
      {label}
      {count !== undefined && (
        <span className="fw-700 rounded-8" style={{
          fontSize: 10, padding: '0 5px',
          backgroundColor: active ? 'var(--color-primary, #2563eb)' : 'var(--app-surface-2, #f3f4f6)',
          color: active ? '#fff' : 'var(--app-text-secondary)',
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// Empty State
// ============================================================================

export function EmptyState({ icon, message, sub }: { icon: string; message: string; sub: string }) {
  return (
    <Card className="text-center" style={{ padding: 48 }}>
      <div className="mb-8" style={{ fontSize: 32, opacity: 0.4 }}>{icon}</div>
      <Text color="secondary">{message}</Text>
      <Text size="sm" color="secondary" className="mt-4">{sub}</Text>
    </Card>
  );
}
