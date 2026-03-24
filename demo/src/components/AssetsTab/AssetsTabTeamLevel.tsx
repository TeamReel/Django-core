/**
 * AssetsTabTeamLevel — Team-level asset display (collapsible categories)
 *
 * Each category (Logo & Sponsor, Tenues, Locatie) has a collapsible header
 * with a progress ring showing completion. Rows show thumbnail, label,
 * status badge, and action buttons.
 */

import React, { useRef, useState } from 'react';
import { Sparkles, Upload, Trash2, Clock, Wand2, ChevronDown } from 'lucide-react';
import { KIT_ROLES, getAssetUrl } from '../../hooks/useBrandProfile';

/** Team-level kit order: important roles first (Thuis, Keeper, Legacy) */
const TEAM_KIT_ORDER = ['home', 'goalkeeper', 'legacy', 'away', 'third', 'coach', 'assistant', 'training'] as const;
const TEAM_KIT_ROLES = TEAM_KIT_ORDER.map(id => KIT_ROLES.find(r => r.id === id)!).filter(Boolean);

/** Kits that are AI-generated from other sources (no upload row) */
const AI_ONLY_KITS = new Set(['goalkeeper']);
import { AppIcon } from '../AppIcon';
import { SharedAssetModals } from './AssetsTabShared';
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
  hasUploadSource?: boolean;
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
  hasUploadSource = false,
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
              {/* Bewerk (post-process from upload) */}
              {hasUploadSource && (
                <button
                  type="button"
                  className={s.actionBtn}
                  onClick={() => d.handlePostProcess(assetType)}
                  aria-label={`${label} bewerken`}
                  title="Bewerk"
                >
                  <AppIcon icon={Wand2} size={16} />
                </button>
              )}
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

/* ── Progress counting ─────────────────────────────────────────────────── */

function countAssets(d: AssetsTabData, types: string[]): { filled: number; total: number } {
  let filled = 0;
  for (const t of types) {
    const { asset } = d.getEffectiveAsset(t);
    if (asset) filled++;
  }
  return { filled, total: types.length };
}

/* ── Collapsible category section with progress ring ───────────────────── */

function CategorySection({ title, filled, total, defaultOpen = true, children }: {
  title: string;
  filled: number;
  total: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={s.category}>
      <button
        type="button"
        className={s.categoryHeader}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className={s.categoryTitle}>{title}</span>
        <span className={s.categoryRight}>
          <span className={s.progressRing} aria-label={`${filled}/${total} compleet`}>
            <svg viewBox="0 0 28 28" className={s.progressRingSvg}>
              <circle cx="14" cy="14" r="11" fill="none" stroke="var(--app-border)" strokeWidth="3" />
              {total > 0 && (
                <circle
                  cx="14" cy="14" r="11" fill="none"
                  stroke={filled === total ? 'var(--app-success)' : 'var(--app-primary)'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 11}`}
                  strokeDashoffset={`${2 * Math.PI * 11 * (1 - filled / total)}`}
                  transform="rotate(-90 14 14)"
                />
              )}
            </svg>
            <span className={s.progressRingLabel}>{filled}/{total}</span>
          </span>
          <AppIcon icon={ChevronDown} size={16} className={`${s.chevron} ${open ? s.chevronOpen : ''}`} />
        </span>
      </button>
      {open && <div className={s.categoryBody}>{children}</div>}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────────── */

export const AssetsTabTeamLevel: React.FC<Props> = ({ d, readOnly, projectId, organisationId }) => {
  const logoTypes = ['logo_upload', 'logo', 'sponsor_logo_upload', 'sponsor_logo'];
  const tenueTypes = TEAM_KIT_ROLES.flatMap(r =>
    AI_ONLY_KITS.has(r.id) ? [`kit_${r.id}`] : [`kit_${r.id}_upload`, `kit_${r.id}`]
  );
  const locatieTypes = ['location_photo', 'stadium_background'];

  const logoProgress = countAssets(d, logoTypes);
  const tenueProgress = countAssets(d, tenueTypes);
  const locatieProgress = countAssets(d, locatieTypes);

  return (
    <div className={s.root}>
      <SharedAssetModals d={d} projectId={projectId} organisationId={organisationId} />

      {/* Logo & Sponsor (first — most important) */}
      <CategorySection title="Logo & Sponsor" filled={logoProgress.filled} total={logoProgress.total}>
        {(() => { const e = d.getEffectiveAsset('logo_upload'); return (
          <AssetRow label="Logo (upload)" assetType="logo_upload" asset={e.asset} inherited={e.inherited} isUpload d={d} readOnly={readOnly} />
        ); })()}
        {(() => { const e = d.getEffectiveAsset('logo'); const u = d.getEffectiveAsset('logo_upload'); return (
          <AssetRow label="Logo (bewerkt)" assetType="logo" asset={e.asset} inherited={e.inherited} hasUploadSource={!!u.asset} isProcessing={d.postProcessingAsset === 'logo' || d.uploadProcessingAsset === 'logo'} d={d} readOnly={readOnly} />
        ); })()}
        {(() => { const e = d.getEffectiveAsset('sponsor_logo_upload'); return (
          <AssetRow label="Sponsor (upload)" assetType="sponsor_logo_upload" asset={e.asset} inherited={e.inherited} isUpload d={d} readOnly={readOnly} />
        ); })()}
        {(() => { const e = d.getEffectiveAsset('sponsor_logo'); const u = d.getEffectiveAsset('sponsor_logo_upload'); return (
          <AssetRow label="Sponsor (bewerkt)" assetType="sponsor_logo" asset={e.asset} inherited={e.inherited} hasUploadSource={!!u.asset} isProcessing={d.postProcessingAsset === 'sponsor_logo' || d.uploadProcessingAsset === 'sponsor_logo'} d={d} readOnly={readOnly} />
        ); })()}
      </CategorySection>

      {/* Tenues */}
      <CategorySection title="Tenues" filled={tenueProgress.filled} total={tenueProgress.total}>
        {TEAM_KIT_ROLES.map((role) => {
          const uploadType = `kit_${role.id}_upload`;
          const processedType = `kit_${role.id}`;
          const isAiOnly = AI_ONLY_KITS.has(role.id);
          const upload = isAiOnly ? { asset: undefined, inherited: false } : d.getEffectiveAsset(uploadType);
          const eff = d.getEffectiveAsset(processedType);
          const processing = d.postProcessingAsset === processedType || d.uploadProcessingAsset === processedType;
          return (
            <React.Fragment key={role.id}>
              {!isAiOnly && (
                <AssetRow label={`${role.label} (upload)`} assetType={uploadType} asset={upload.asset} inherited={upload.inherited} isUpload d={d} readOnly={readOnly} />
              )}
              <AssetRow label={`${role.label} (bewerkt)`} assetType={processedType} asset={eff.asset} inherited={eff.inherited} hasUploadSource={!isAiOnly && !!upload.asset} isProcessing={processing} d={d} readOnly={readOnly} showHistory />
            </React.Fragment>
          );
        })}
      </CategorySection>

      {/* Locatie */}
      <CategorySection title="Locatie" filled={locatieProgress.filled} total={locatieProgress.total}>
        {(() => { const e = d.getEffectiveAsset('location_photo'); return (
          <AssetRow label="Veld foto (upload)" assetType="location_photo" asset={e.asset} inherited={e.inherited} isUpload d={d} readOnly={readOnly} />
        ); })()}
        {(() => { const e = d.getEffectiveAsset('stadium_background'); const u = d.getEffectiveAsset('location_photo'); return (
          <AssetRow label="Achtergrond (bewerkt)" assetType="stadium_background" asset={e.asset} inherited={e.inherited} hasUploadSource={!!u.asset} isProcessing={d.postProcessingAsset === 'stadium_background'} d={d} readOnly={readOnly} />
        ); })()}
      </CategorySection>

      {!d.profile && (
        <div className={s.warningBox}>
          Nog geen brand profiel voor dit team. Upload of genereer een asset — het profiel wordt automatisch aangemaakt.
        </div>
      )}
    </div>
  );
};
