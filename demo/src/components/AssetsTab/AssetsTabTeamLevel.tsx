/**
 * AssetsTabTeamLevel — Team-level asset display (accordion style)
 *
 * Uses ListSection rows (same pattern as HubSelectieTab) for a compact,
 * scannable overview. Each row shows a small thumbnail, label, status
 * badge, and action buttons.
 */

import React, { useRef } from 'react';
import { Sparkles, Upload, Trash2, Clock } from 'lucide-react';
import { KIT_ROLES, getAssetUrl } from '../../hooks/useBrandProfile';
import { ListSection } from '../ListSection';
import { AppIcon } from '../AppIcon';
import { SharedAssetModals, AiButtonsRow } from './AssetsTabShared';
import type { AssetsTabData } from './useAssetsTabData';
import type { BrandAsset } from '../../hooks/useBrandProfile';
import s from './AssetsTabTeamLevel.module.css';

interface Props {
  d: AssetsTabData;
  readOnly: boolean;
  projectId: string | number;
  organisationId: string;
}

/* ── Thumbnail helper ──────────────────────────────────────────────────── */

function Thumb({ asset }: { asset: BrandAsset | undefined }) {
  const url = asset ? getAssetUrl(asset.url) : null;
  if (!url) return <div className={s.thumbEmpty} />;
  return <img src={url} alt="" className={s.thumb} />;
}

/* ── Single asset row ──────────────────────────────────────────────────── */

interface AssetRowProps {
  label: string;
  assetType: string;
  asset: BrandAsset | undefined;
  inherited?: boolean;
  isUpload?: boolean;
  isProcessing?: boolean;
  d: AssetsTabData;
  readOnly: boolean;
  showHistory?: boolean;
}

function AssetRow({
  label,
  assetType,
  asset,
  inherited = false,
  isUpload = false,
  isProcessing = false,
  d,
  readOnly,
  showHistory = false,
}: AssetRowProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const url = asset ? getAssetUrl(asset.url) : null;

  return (
    <div className={s.assetRow}>
      <Thumb asset={asset} />
      <div className={s.rowInfo}>
        <span className={s.rowLabel}>{label}</span>
        <span className={s.rowMeta}>
          {isProcessing && <span className={s.badgeProcessing}>Bezig...</span>}
          {!isProcessing && inherited && <span className={s.badgeInherited}>Club</span>}
          {!isProcessing && !inherited && url && <span className={s.badgeReady}>✓</span>}
          {!isProcessing && !url && !inherited && <span className={s.badgeEmpty}>–</span>}
        </span>
      </div>

      {!readOnly && (
        <div className={s.rowActions}>
          {/* Upload button (for upload-type or replace) */}
          {isUpload ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className={s.hiddenInput}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) d.handleUpload(f, assetType);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                className={s.actionBtn}
                onClick={() => fileRef.current?.click()}
                aria-label={url ? `${label} vervangen` : `${label} uploaden`}
                title={url ? 'Vervangen' : 'Uploaden'}
              >
                <AppIcon icon={Upload} size={16} />
              </button>
            </>
          ) : (
            <>
              {/* AI Generate */}
              <button
                type="button"
                className={`${s.actionBtn} ${s.actionBtnAi}`}
                onClick={() => d.handleReplaceAi(assetType)}
                aria-label={`${label} genereren met AI`}
                title="AI Genereer"
              >
                <AppIcon icon={Sparkles} size={16} />
              </button>
            </>
          )}

          {/* History (processed assets only) */}
          {showHistory && (
            <button
              type="button"
              className={s.actionBtn}
              onClick={() => d.handleShowHistory(assetType)}
              aria-label={`Geschiedenis van ${label}`}
              title="Geschiedenis"
            >
              <AppIcon icon={Clock} size={16} />
            </button>
          )}

          {/* Delete */}
          {url && !inherited && (
            <button
              type="button"
              className={`${s.actionBtn} ${s.actionBtnDanger}`}
              onClick={() => d.handleDelete(assetType)}
              aria-label={`${label} verwijderen`}
              title="Verwijderen"
            >
              <AppIcon icon={Trash2} size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────────── */

export const AssetsTabTeamLevel: React.FC<Props> = ({ d, readOnly, projectId, organisationId }) => (
  <div className={s.root}>
    <AiButtonsRow d={d} />
    <SharedAssetModals d={d} projectId={projectId} organisationId={organisationId} />

    {/* Logo & Sponsor */}
    <ListSection title="Logo & Sponsor">
      <AssetRow label="Logo (upload)" assetType="logo_upload" asset={d.getAsset('logo_upload')} isUpload d={d} readOnly={readOnly} />
      {(() => { const e = d.getEffectiveAsset('logo'); return (
        <AssetRow label="Logo (bewerkt)" assetType="logo" asset={e.asset} inherited={e.inherited} isProcessing={d.postProcessingAsset === 'logo' || d.uploadProcessingAsset === 'logo'} d={d} readOnly={readOnly} />
      ); })()}
      <AssetRow label="Sponsor (upload)" assetType="sponsor_logo_upload" asset={d.getAsset('sponsor_logo_upload')} isUpload d={d} readOnly={readOnly} />
      {(() => { const e = d.getEffectiveAsset('sponsor_logo'); return (
        <AssetRow label="Sponsor (bewerkt)" assetType="sponsor_logo" asset={e.asset} inherited={e.inherited} isProcessing={d.postProcessingAsset === 'sponsor_logo' || d.uploadProcessingAsset === 'sponsor_logo'} d={d} readOnly={readOnly} />
      ); })()}
    </ListSection>

    {/* Tenues */}
    <ListSection title="Tenues">
      {KIT_ROLES.map((role) => {
        const uploadType = `kit_${role.id}_upload`;
        const processedType = `kit_${role.id}`;
        const eff = d.getEffectiveAsset(processedType);
        const processing = d.postProcessingAsset === processedType || d.uploadProcessingAsset === processedType;
        return (
          <React.Fragment key={role.id}>
            <AssetRow label={`${role.label} (upload)`} assetType={uploadType} asset={d.getAsset(uploadType)} isUpload d={d} readOnly={readOnly} />
            <AssetRow label={`${role.label} (bewerkt)`} assetType={processedType} asset={eff.asset} inherited={eff.inherited} isProcessing={processing} d={d} readOnly={readOnly} showHistory />
          </React.Fragment>
        );
      })}
    </ListSection>

    {/* Locatie */}
    <ListSection title="Locatie">
      <AssetRow label="Veld foto (upload)" assetType="location_photo" asset={d.getAsset('location_photo')} isUpload d={d} readOnly={readOnly} />
      {(() => { const e = d.getEffectiveAsset('stadium_background'); return (
        <AssetRow label="Achtergrond (bewerkt)" assetType="stadium_background" asset={e.asset} inherited={e.inherited} isProcessing={d.postProcessingAsset === 'stadium_background'} d={d} readOnly={readOnly} />
      ); })()}
    </ListSection>

    {!d.profile && (
      <div className={s.warningBox}>
        Nog geen brand profiel voor dit team. Upload of genereer een asset — het profiel wordt automatisch aangemaakt.
      </div>
    )}
  </div>
);
