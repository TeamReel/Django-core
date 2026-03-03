/**
 * IdentityTab sub-components — AssetCard, Section, AssetGrid
 *
 * Extracted from IdentityTab.tsx for modularity.
 */

import React, { useRef } from 'react';
import { getAssetUrl, type BrandAsset } from '../../hooks/useBrandProfile';

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
      style={{
        border: '1px solid var(--vscode-widget-border, #333)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--vscode-editor-background, #1e1e1e)',
        opacity: inherited ? 0.8 : 1,
      }}
    >
      {/* Preview area */}
      <div
        style={{
          aspectRatio,
          background: url
            ? `url(${url}) center/contain no-repeat`
            : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
          position: 'relative',
          minHeight: 120,
        }}
      >
        {/* Phase badge */}
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

        {/* Inherited badge */}
        {inherited && (
          <span
            style={{
              position: 'absolute',
              top: 6,
              left: 6,
              background: 'var(--color-amber-400)',
              color: '#000',
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            ← {inheritedFrom || 'Geërfd'}
          </span>
        )}

        {/* Empty state */}
        {!url && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--vscode-descriptionForeground, #888)',
              fontSize: 12,
            }}
          >
            Niet ingesteld
          </div>
        )}
      </div>

      {/* Info + actions */}
      <div style={{ padding: '8px 10px' }}>
        <div className="fs-12 fw-600 mb-4">{label}</div>

        {!readOnly && isUploadType && onUpload && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
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
          <div style={{ fontSize: 10, color: 'var(--vscode-descriptionForeground, #888)', marginTop: 4 }}>
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
      className="grid gap-12"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
    >
      {children}
    </div>
  );
}
