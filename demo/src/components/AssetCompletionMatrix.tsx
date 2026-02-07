/**
 * AssetCompletionMatrix — Brand asset completion overview
 *
 * Shows a table of asset types (rows) × phases (columns) with ✅/⬜ indicators.
 * Rows: Logo, Sponsor, Kit types (Home, Away, Third, Goalkeeper, Coach, etc.)
 * Columns: Upload, AI Bewerkt, Gecombineerd
 *
 * Used on Club detail page (media tab) for quick overview of asset completion.
 */

import React from 'react';
import { Alert, Badge, Card } from '@django-core/design-system';
import {
  useBrandProfile,
  getAssetUrl,
  KIT_ROLES,
  type BrandAsset,
} from '../hooks/useBrandProfile';

// ============================================================================
// Types
// ============================================================================

interface AssetCompletionMatrixProps {
  /** Organisation UUID (for org-level profiles) */
  organisationId?: string;
  /** Project ID or slug (for club/team-level profiles) */
  projectId?: string | number | null;
  /** Display name */
  entityName?: string;
  /** Card title */
  title?: string;
}

// ============================================================================
// Asset row definitions
// ============================================================================

interface AssetRow {
  label: string;
  icon: string;
  uploadType: string | null;
  processedType: string | null;
  combinedType: string | null;
}

const ASSET_ROWS: AssetRow[] = [
  {
    label: 'Logo',
    icon: '🖼️',
    uploadType: 'logo_upload',
    processedType: 'logo_light',
    combinedType: 'logo_dark',
  },
  {
    label: 'Sponsor',
    icon: '🤝',
    uploadType: 'sponsor_logo_upload',
    processedType: 'sponsor_logo',
    combinedType: null,
  },
  ...KIT_ROLES.map((role) => ({
    label: `${role.label} Tenue`,
    icon: role.icon,
    uploadType: `kit_${role.id}_upload`,
    processedType: `kit_${role.id}`,
    combinedType: `kit_${role.id}_combined`,
  })),
  {
    label: 'Locatie',
    icon: '📍',
    uploadType: 'location_photo',
    processedType: null,
    combinedType: null,
  },
];

// Phase column definitions
const PHASE_COLUMNS = [
  { key: 'upload' as const, label: 'Upload', color: '#3b82f6' },
  { key: 'processed' as const, label: 'AI Bewerkt', color: '#10b981' },
  { key: 'combined' as const, label: 'Gecombineerd', color: '#8b5cf6' },
];

// ============================================================================
// Styles
// ============================================================================

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 11,
  fontWeight: 600,
  textAlign: 'center',
  borderBottom: '2px solid var(--app-border)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 12,
  borderBottom: '1px solid var(--app-border)',
};

const thumbnailStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 4,
  objectFit: 'contain',
  background: 'var(--app-surface-secondary)',
  border: '1px solid var(--app-border)',
  verticalAlign: 'middle',
};

// ============================================================================
// Component
// ============================================================================

export function AssetCompletionMatrix({
  organisationId,
  projectId,
  entityName,
  title = 'Asset Completion Matrix',
}: AssetCompletionMatrixProps) {
  const { getAsset, loading, error } = useBrandProfile({
    organisationId,
    projectId,
  });

  // Count filled vs total
  const totalCells = ASSET_ROWS.reduce((sum, row) => {
    if (row.uploadType) sum++;
    if (row.processedType) sum++;
    if (row.combinedType) sum++;
    return sum;
  }, 0);

  const filledCells = ASSET_ROWS.reduce((sum, row) => {
    if (row.uploadType && getAsset(row.uploadType)) sum++;
    if (row.processedType && getAsset(row.processedType)) sum++;
    if (row.combinedType && getAsset(row.combinedType)) sum++;
    return sum;
  }, 0);

  // Helper: get asset + thumbnail URL for a type
  const getCellInfo = (assetType: string | null): { exists: boolean; url: string | null; asset: BrandAsset | undefined } => {
    if (!assetType) return { exists: false, url: null, asset: undefined };
    const asset = getAsset(assetType);
    return {
      exists: !!asset,
      url: asset ? getAssetUrl(asset.url) : null,
      asset,
    };
  };

  if (loading) {
    return (
      <Card>
        <div style={{ padding: 16 }}>
          <Alert variant="info">Assets laden…</Alert>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div style={{ padding: 16 }}>
          <Alert variant="error">Fout bij laden: {error}</Alert>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ padding: '16px 16px 0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h3>
          <Badge variant={filledCells === totalCells ? 'success' : filledCells > 0 ? 'warning' : 'default'}>
            {filledCells} / {totalCells} Assets
          </Badge>
        </div>
        <div style={{ marginTop: 4, color: 'var(--app-muted-text)', fontSize: 13 }}>
          Overview van alle brand assets en hun bewerkingsfase.
          {entityName ? ` (${entityName})` : ''}
        </div>
      </div>

      <div style={{ padding: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left', minWidth: 160 }}>Content Type</th>
              {PHASE_COLUMNS.map((col) => (
                <th key={col.key} style={thStyle}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: col.color,
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {col.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ASSET_ROWS.map((row) => {
              const upload = getCellInfo(row.uploadType);
              const processed = getCellInfo(row.processedType);
              const combined = getCellInfo(row.combinedType);

              return (
                <tr key={row.label}>
                  <td style={{ ...tdStyle, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    <span style={{ marginRight: 6 }}>{row.icon}</span>
                    {row.label}
                  </td>

                  {/* Upload */}
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {row.uploadType ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>{upload.exists ? '✅' : '⬜'}</span>
                        {upload.url && (
                          <img src={upload.url} alt="" style={thumbnailStyle} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                      </div>
                    ) : (
                      <span style={{ opacity: 0.3 }}>—</span>
                    )}
                  </td>

                  {/* AI Bewerkt */}
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {row.processedType ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>{processed.exists ? '✅' : '⬜'}</span>
                        {processed.url && (
                          <img src={processed.url} alt="" style={thumbnailStyle} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                      </div>
                    ) : (
                      <span style={{ opacity: 0.3 }}>—</span>
                    )}
                  </td>

                  {/* Gecombineerd */}
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {row.combinedType ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>{combined.exists ? '✅' : '⬜'}</span>
                        {combined.url && (
                          <img src={combined.url} alt="" style={thumbnailStyle} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                      </div>
                    ) : (
                      <span style={{ opacity: 0.3 }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Progress bar */}
        <div style={{ marginTop: 16, padding: 12, background: 'var(--app-muted)', borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Completion: {filledCells} / {totalCells} assets
          </div>
          <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${totalCells > 0 ? (filledCells / totalCells) * 100 : 0}%`,
                background: filledCells === totalCells ? '#10b981' : '#f59e0b',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Legend */}
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 11, opacity: 0.7 }}>
          {PHASE_COLUMNS.map((col) => (
            <div key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: col.color }} />
              <span>{col.label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>✅</span> <span>Aanwezig</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>⬜</span> <span>Ontbreekt</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default AssetCompletionMatrix;
