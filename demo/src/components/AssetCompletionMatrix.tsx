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
import styles from './AssetCompletionMatrix.module.css';

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
}

const ASSET_ROWS: AssetRow[] = [
  {
    label: 'Logo',
    icon: '🖼️',
    uploadType: 'logo_upload',
    processedType: 'logo',
  },
  {
    label: 'Sponsor',
    icon: '🤝',
    uploadType: 'sponsor_logo_upload',
    processedType: 'sponsor_logo',
  },
  ...KIT_ROLES.map((role) => ({
    label: `${role.label} Tenue`,
    icon: role.icon,
    uploadType: `kit_${role.id}_upload`,
    processedType: `kit_${role.id}`,
  })),
  {
    label: 'Locatie',
    icon: '📍',
    uploadType: 'location_photo',
    processedType: null,
  },
];

// Phase column definitions
const PHASE_COLUMNS = [
  { key: 'upload' as const, label: 'Upload', color: 'var(--color-blue-500)' },
  { key: 'processed' as const, label: 'AI Bewerkt', color: 'var(--color-green-400)' },
];

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
    return sum;
  }, 0);

  const filledCells = ASSET_ROWS.reduce((sum, row) => {
    if (row.uploadType && getAsset(row.uploadType)) sum++;
    if (row.processedType && getAsset(row.processedType)) sum++;
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
        <div className="p-16">
          <Alert variant="info">Assets laden…</Alert>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-16">
          <Alert variant="error">Fout bij laden: {error}</Alert>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="px-16 pt-16">
        <div className="flex-row gap-12 flex-wrap">
          <h3 className="m-0 fs-16 fw-600">{title}</h3>
          <Badge variant={filledCells === totalCells ? 'success' : filledCells > 0 ? 'warning' : 'default'}>
            {filledCells} / {totalCells} Assets
          </Badge>
        </div>
        <div className="mt-4 text-muted fs-13">
          Overview van alle brand assets en hun bewerkingsfase.
          {entityName ? ` (${entityName})` : ''}
        </div>
      </div>

      <div className="p-16 overflow-x-auto">
        <table className={`w-full fs-12 ${styles.table}`}>
          <thead>
            <tr>
              <th className={styles.thContentType}>Content Type</th>
              {PHASE_COLUMNS.map((col) => (
                <th key={col.key} className={styles.th}>
                  <span
                    className={`text-white fw-600 rounded-4 ${styles.phaseBadge}`}
                    style={{ '--phase-color': col.color } as React.CSSProperties}
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

              return (
                <tr key={row.label}>
                  <td className={styles.tdLabel}>
                    <span className={styles.rowIcon}>{row.icon}</span>
                    {row.label}
                  </td>

                  {/* Upload */}
                  <td className={styles.tdCenter}>
                    {row.uploadType ? (
                      <div className="flex-center gap-6">
                        <span className="fs-14">{upload.exists ? '✅' : '⬜'}</span>
                        {upload.url && (
                          <img src={upload.url} alt="" className={styles.thumbnail} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                      </div>
                    ) : (
                      <span className={styles.dimmed}>—</span>
                    )}
                  </td>

                  {/* AI Bewerkt */}
                  <td className={styles.tdCenter}>
                    {row.processedType ? (
                      <div className="flex-center gap-6">
                        <span className="fs-14">{processed.exists ? '✅' : '⬜'}</span>
                        {processed.url && (
                          <img src={processed.url} alt="" className={styles.thumbnail} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                      </div>
                    ) : (
                      <span className={styles.dimmed}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Progress bar */}
        <div className={`mt-16 p-12 rounded-8 ${styles.progressWrapper}`}>
          <div className={`fs-13 fw-600 ${styles.progressLabel}`}>
            Completion: {filledCells} / {totalCells} assets
          </div>
          <div className={`rounded-4 overflow-hidden ${styles.progressTrack}`}>
            <div
              className={`transition ${styles.progressBar}`}
              data-complete={filledCells === totalCells ? 'true' : 'false'}
              style={{ width: `${totalCells > 0 ? (filledCells / totalCells) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex-row flex-wrap mt-12 gap-16 fs-11 opacity-70">
          {PHASE_COLUMNS.map((col) => (
            <div key={col.key} className="flex-row gap-4">
              <span className={styles.legendSwatch} style={{ '--phase-color': col.color } as React.CSSProperties} />
              <span>{col.label}</span>
            </div>
          ))}
          <div className="flex-row gap-4">
            <span>✅</span> <span>Aanwezig</span>
          </div>
          <div className="flex-row gap-4">
            <span>⬜</span> <span>Ontbreekt</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default AssetCompletionMatrix;
