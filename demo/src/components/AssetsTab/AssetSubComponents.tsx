/**
 * AssetSubComponents — Presentational sub-components for AssetsTab
 *
 * Extracted from AssetsTab.tsx (Phase 23) for readability.
 * Contains: AssetCard, Section, AssetGrid, HistoryModal
 */

import React, { useRef } from 'react';
import { getAssetUrl, type BrandAsset } from '../../hooks/useBrandProfile';
import s from './AssetsTab.module.css';

// ============================================================================
// AssetCard
// ============================================================================

export interface AssetCardProps {
  label: string;
  assetType: string;
  asset: BrandAsset | undefined;
  inherited?: boolean;
  inheritedFrom?: string;
  readOnly?: boolean;
  onUpload?: (file: File, assetType: string) => void;
  onDelete?: (assetType: string) => void;
  onReplace?: (assetType: string) => void;
  onPostProcess?: (assetType: string) => void;
  onShowHistory?: (assetType: string) => void;
  aspectRatio?: string;
  /** Show a processing spinner overlay */
  isProcessing?: boolean;
}

export function AssetCard({
  label,
  assetType,
  asset,
  inherited = false,
  inheritedFrom,
  readOnly = false,
  onUpload,
  onDelete,
  onReplace,
  onPostProcess,
  onShowHistory,
  aspectRatio = '3 / 4',
  isProcessing = false,
}: AssetCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const url = asset ? getAssetUrl(asset.url) : null;

  const isUploadType = assetType.endsWith('_upload');
  const isProcessed = !isUploadType;

  let badgeColor = '#6b7280'; // gray
  let badgeText = '';
  if (isUploadType) {
    badgeColor = '#3b82f6'; // blue
    badgeText = 'Upload';
  } else if (
    isProcessed &&
    ![
      'watermark',
      'favicon',
      'font_file',
      'location_photo',
      'stadium_background',
      'other',
    ].includes(assetType)
  ) {
    badgeColor = '#10b981'; // green
    badgeText = 'AI Bewerkt';
  }

  return (
    <div
      className={s.assetCard}
      style={{ opacity: inherited ? 0.8 : 1 }}
    >
      {/* Preview area */}
      <div
        className={s.previewArea}
        style={{
          aspectRatio,
          background: url
            ? `url(${url}) center/contain no-repeat`
            : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
        }}
      >
        {/* Phase badge */}
        {badgeText && (
          <span
            className={s.phaseBadge}
            style={{ background: badgeColor }}
          >
            {badgeText}
          </span>
        )}

        {/* History Button */}
        {!readOnly &&
          onShowHistory &&
          isProcessed &&
          ![
            'watermark',
            'favicon',
            'font_file',
            'location_photo',
            'stadium_background',
            'other',
          ].includes(assetType) && (
            <button
                onClick={() => onShowHistory(assetType)}
                className={s.historyBtn}
                style={{ right: badgeText ? 80 : 6 }}
            >
             ⏱️
            </button>
        )}

        {/* Inherited badge */}
        {inherited && (
          <span className={s.inheritedBadge}>
            ← {inheritedFrom || 'Geërfd'}
          </span>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className={s.processingOverlay}>
            <div className={s.spinner} />
            <span className={s.spinnerText}>Bewerken...</span>
          </div>
        )}

        {/* Empty state */}
        {!url && !isProcessing && (
          <div className={s.emptyLabel}>
            Niet ingesteld
          </div>
        )}
      </div>

      {/* Info + actions */}
      <div className={s.infoSection}>
        <div className={s.assetLabel}>{label}</div>

        {!readOnly && onUpload && (
          <>
            {/* AI processed assets with Genereer + Bewerk buttons */}
            {isProcessed && onReplace ? (
              <div className={s.btnGrid} style={{ gridTemplateColumns: onPostProcess ? '1fr 1fr' : '1fr' }}>
                <button
                  onClick={() => onReplace(assetType)}
                  className={s.btnPrimary}
                >
                  🎨 Genereer
                </button>
                {onPostProcess && (
                  <button
                    onClick={() => onPostProcess(assetType)}
                    disabled={isProcessing}
                    className={s.btnPrimary}
                    style={{
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      background: isProcessing ? '#555' : '#8b5cf6',
                      opacity: isProcessing ? 0.6 : 1,
                    }}
                  >
                    {isProcessing ? '⏳ Bezig...' : '✂️ Bewerk'}
                  </button>
                )}
              </div>
            ) : (
              /* Upload-type assets with file picker */
              <div className={s.btnGrid} style={{ gridTemplateColumns: url ? '1fr 1fr' : '1fr' }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={s.btnPrimary}
                >
                  {url ? 'Vervang' : 'Uploaden'}
                </button>
              </div>
            )}
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

        {!readOnly && onDelete && url && (
          <button
            onClick={() => {
              if (window.confirm('Weet je zeker dat je dit asset wilt verwijderen?')) {
                onDelete(assetType);
              }
            }}
            className={s.btnDelete}
          >
            Verwijderen
          </button>
        )}

        {asset && (
          <div className={s.dateText}>
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

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Section({ title, description, children }: SectionProps) {
  return (
    <div className="mb-24">
      <h3 className="fs-14 fw-600 mb-4">{title}</h3>
      {description && (
        <p className={s.sectionDesc}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

export function AssetGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.assetGrid}>
      {children}
    </div>
  );
}

// ============================================================================
// HistoryModal
// ============================================================================

export interface HistoryItem {
  id: string;
  url: string;
  created_at: string;
  original_name: string;
}

interface HistoryModalProps {
  show: boolean;
  loading: boolean;
  list: HistoryItem[];
  onClose: () => void;
  onRestore: (fileAssetId: string) => void;
}

export function HistoryModal({ show, loading, list, onClose, onRestore }: HistoryModalProps) {
  if (!show) return null;

  return (
    <div className={s.historyOverlay}>
      <div className={s.historyPanel}>
        <div className="flex-between mb-16">
          <h3 className={s.historyTitle}>Versiegeschiedenis</h3>
          <button onClick={onClose} className={s.closeBtn}>✕</button>
        </div>
        {loading ? (
          <div className={`p-20 text-center ${s.grayText}`}>Geschiedenis laden...</div>
        ) : list.length === 0 ? (
          <div className={`p-20 text-center ${s.grayText}`}>Geen eerdere versies gevonden.</div>
        ) : (
          <div className={s.historyList}>
            {list.map(item => (
              <div key={item.id} className={s.historyItem}>
                <div className={s.historyThumb} style={{ background: `url(${item.url}) center/contain no-repeat` }} />
                <div className="flex-1">
                  <div className="fs-12 fw-600">{new Date(item.created_at).toLocaleString()}</div>
                  <div className={s.historyName}>{item.original_name}</div>
                </div>
                <button
                  onClick={() => onRestore(item.id)}
                  className={s.restoreBtn}
                >
                  Herstellen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
