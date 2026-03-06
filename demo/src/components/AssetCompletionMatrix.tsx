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
import { Alert } from '@django-core/design-system';
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
    icon: 'image',
    uploadType: 'logo_upload',
    processedType: 'logo',
  },
  {
    label: 'Sponsor',
    icon: 'handshake',
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
    icon: 'map-pin',
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
      <div className={styles.matrixCard}>
        <div className={styles.matrixPad}>
          <Alert variant="info">Assets laden…</Alert>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.matrixCard}>
        <div className={styles.matrixPad}>
          <Alert variant="error">Fout bij laden: {error}</Alert>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.matrixCard}>
      <div className={styles.matrixHeader}>
        <div className={styles.matrixHeaderRow}>
          <h3 className={styles.matrixTitle}>{title}</h3>
          <span
            className={styles.matrixBadge}
            data-state={filledCells === totalCells ? 'complete' : filledCells > 0 ? 'partial' : 'empty'}
          >
            {filledCells} / {totalCells} Assets
          </span>
        </div>
        <div className={styles.matrixSubtitle}>
          Overview van alle brand assets en hun bewerkingsfase.
          {entityName ? ` (${entityName})` : ''}
        </div>
      </div>

      <div className={styles.matrixBody}>
        <table className={`${styles.table} ${styles.tableFull}`}>
          <thead>
            <tr>
              <th className={styles.thContentType}>Content Type</th>
              {PHASE_COLUMNS.map((col) => (
                <th key={col.key} className={styles.th}>
                  <span
                    className={styles.phaseBadge}
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
                      <div className={styles.cellContent}>
                        <span className={styles.cellStatus}>{upload.exists ? 'OK' : '—'}</span>
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
                      <div className={styles.cellContent}>
                        <span className={styles.cellStatus}>{processed.exists ? 'OK' : '—'}</span>
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
        <div className={styles.progressWrapper}>
          <div className={styles.progressLabel}>
            Completion: {filledCells} / {totalCells} assets
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              data-complete={filledCells === totalCells ? 'true' : 'false'}
              style={{ width: `${totalCells > 0 ? (filledCells / totalCells) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Legend */}
        <div className={styles.legendRow}>
          {PHASE_COLUMNS.map((col) => (
            <div key={col.key} className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ '--phase-color': col.color } as React.CSSProperties} />
              <span>{col.label}</span>
            </div>
          ))}
          <div className={styles.legendItem}>
            <span></span> <span>Aanwezig</span>
          </div>
          <div className={styles.legendItem}>
            <span>⬜</span> <span>Ontbreekt</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssetCompletionMatrix;
