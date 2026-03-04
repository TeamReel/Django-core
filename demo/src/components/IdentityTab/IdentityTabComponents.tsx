/**
 * IdentityTab sub-components — AssetCard, Section, AssetGrid
 *
 * Extracted from IdentityTab.tsx for modularity.
 */

import React, { useRef } from 'react';
import { getAssetUrl, type BrandAsset } from '../../hooks/useBrandProfile';
import styles from './IdentityTabComponents.module.css';

// ============================================================================
// AssetCard
// ============================================================================

interface AssetCardProps {
  label: string;
  assetType: string;
  asset: BrandAsset | undefined;
  inherited?: boolean;
  inheritedFrom?: string;
  readOnly?: boolean;
  onUpload?: (file: File, assetType: string) => void;
  aspectRatio?: string;
}

export function AssetCard({
  label,
  assetType,
  asset,
  inherited = false,
  inheritedFrom,
  readOnly = false,
  onUpload,
  aspectRatio = '3 / 4',
}: AssetCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const url = asset ? getAssetUrl(asset.url) : null;

  const isUploadType = assetType.endsWith('_upload');
  const isProcessed = !isUploadType && !assetType.endsWith('_combined');
  const isCombined = assetType.endsWith('_combined');

  let badgeColor = 'var(--app-muted-text)'; // gray
  let badgeText = '';
  if (isUploadType) {
    badgeColor = 'var(--color-blue-500)'; // blue
    badgeText = 'Upload';
  } else if (isCombined) {
    badgeColor = '#8b5cf6'; // purple
    badgeText = 'AI Combined';
  } else if (isProcessed && !['watermark', 'favicon', 'font_file', 'location_photo', 'other'].includes(assetType)) {
    badgeColor = 'var(--color-green-400)'; // green
    badgeText = 'AI Bewerkt';
  }

  return (
    <div
      className={styles.assetCard}
      data-inherited={inherited || undefined}
    >
      {/* Preview area */}
      <div
        className={styles.previewArea}
        style={{
          '--aspect-ratio': aspectRatio,
          ...(url ? { '--preview-bg': `url(${url}) center/contain no-repeat` } : {}),
        } as React.CSSProperties}
      >
        {/* Phase badge */}
        {badgeText && (
          <span
            className={styles.phaseBadge}
            style={{ '--badge-color': badgeColor } as React.CSSProperties}
          >
            {badgeText}
          </span>
        )}

        {/* Inherited badge */}
        {inherited && (
          <span className={styles.inheritedBadge}>
            ← {inheritedFrom || 'Geërfd'}
          </span>
        )}

        {/* Empty state */}
        {!url && (
          <div className={styles.emptyState}>
            Niet ingesteld
          </div>
        )}
      </div>

      {/* Info + actions */}
      <div className={styles.infoBar}>
        <div className="fs-12 fw-600 mb-4">{label}</div>

        {!readOnly && isUploadType && onUpload && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={styles.uploadBtn}
            >
              {url ? 'Vervangen' : 'Uploaden'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file, assetType);
                e.target.value = '';
              }}
            />
          </>
        )}

        {asset && (
          <div className={styles.dateText}>
            {new Date(asset.updated_at).toLocaleDateString('nl-NL')}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Section + AssetGrid
// ============================================================================

export { Section } from '../ui/Section';

export function AssetGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`grid gap-12 ${styles.assetGrid}`}
    >
      {children}
    </div>
  );
}
