/**
 * AssetsTabTeamLevel — Team-level asset display (collapsible categories)
 *
 * Each category (Logo & Sponsor, Tenues, Locatie) has a collapsible header
 * with a progress ring showing completion. Rows show thumbnail, label,
 * status badge, and action buttons.
 */

import React, { useRef, useState, useCallback } from 'react';
import { Sparkles, Upload, Trash2, Clock, Wand2, ChevronDown, MoreVertical } from 'lucide-react';
import { NavigationSheet } from '../ui/NavigationSheet';
import { KIT_ROLES, getAssetUrl } from '../../hooks/useBrandProfile';

/** Team-level kit order: important roles first (Thuis, Keeper, Legacy) */
const TEAM_KIT_ORDER = ['home', 'goalkeeper', 'legacy', 'away', 'third', 'coach', 'assistant', 'training'] as const;
const TEAM_KIT_ROLES = TEAM_KIT_ORDER.map(id => KIT_ROLES.find(r => r.id === id)!).filter(Boolean);

/** Main kits (always visible) vs other kits */
const MAIN_KIT_IDS = new Set(['home', 'goalkeeper']);
const MAIN_KIT_ROLES = TEAM_KIT_ROLES.filter(r => MAIN_KIT_IDS.has(r.id));
const OTHER_KIT_ROLES = TEAM_KIT_ROLES.filter(r => !MAIN_KIT_IDS.has(r.id));

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
  d: AssetsTabData;
  readOnly: boolean;
  onShowActions?: () => void;
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
  onShowActions,
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
            </>
          ) : (
            <button
              type="button"
              className={s.actionBtn}
              onClick={onShowActions}
              aria-label={`Acties voor ${label}`}
              title="Acties"
            >
              <AppIcon icon={MoreVertical} size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Action sheet for processed assets ─────────────────────────────────── */

interface ActionSheetState {
  label: string;
  processedType: string;
  uploadType: string | null;
  hasAsset: boolean;
  hasUploadSource: boolean;
  inherited: boolean;
}

function AssetActionSheet({ state, d, onClose }: {
  state: ActionSheetState;
  d: AssetsTabData;
  onClose: () => void;
}) {
  const uploadRef = useRef<HTMLInputElement>(null);

  const actions: Array<{ label: string; icon: typeof Sparkles; onClick: () => void; danger?: boolean }> = [];

  actions.push({
    label: 'Genereer met AI',
    icon: Sparkles,
    onClick: () => { d.handleReplaceAi(state.processedType); onClose(); },
  });

  if (state.hasUploadSource) {
    actions.push({
      label: 'Bewerk vanuit upload',
      icon: Wand2,
      onClick: () => { d.handlePostProcess(state.processedType); onClose(); },
    });
  }

  if (state.uploadType) {
    actions.push({
      label: state.hasUploadSource ? 'Nieuwe bronafbeelding' : 'Bronafbeelding uploaden',
      icon: Upload,
      onClick: () => uploadRef.current?.click(),
    });
  }

  actions.push({
    label: 'Geschiedenis bekijken',
    icon: Clock,
    onClick: () => { d.handleShowHistory(state.processedType); onClose(); },
  });

  if (state.hasAsset && !state.inherited) {
    actions.push({
      label: 'Verwijderen',
      icon: Trash2,
      onClick: () => { d.handleDelete(state.processedType); onClose(); },
      danger: true,
    });
  }

  return (
    <NavigationSheet isOpen onClose={onClose} title={state.label} desktopWidth="360px">
      {state.uploadType && (
        <input ref={uploadRef} type="file" accept="image/*" className={s.hiddenInput}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && state.uploadType) d.handleUpload(f, state.uploadType);
            e.target.value = '';
            onClose();
          }} />
      )}
      <div className={s.sheetActions}>
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className={`${s.sheetAction} ${a.danger ? s.sheetActionDanger : ''}`}
            onClick={a.onClick}
          >
            <AppIcon icon={a.icon} size={18} />
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </NavigationSheet>
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

/* ── Helper: render kit rows for a role list ──────────────────────────── */

function KitRows({ roles, d, readOnly, onAction }: {
  roles: typeof MAIN_KIT_ROLES;
  d: AssetsTabData;
  readOnly: boolean;
  onAction: (state: ActionSheetState) => void;
}) {
  return (
    <>
      {roles.map((role) => {
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
            <AssetRow label={`${role.label} (bewerkt)`} assetType={processedType} asset={eff.asset} inherited={eff.inherited} isProcessing={processing} d={d} readOnly={readOnly}
              onShowActions={() => onAction({
                label: role.label,
                processedType,
                uploadType: isAiOnly ? null : uploadType,
                hasAsset: !!eff.asset,
                hasUploadSource: !isAiOnly && !!upload.asset,
                inherited: eff.inherited,
              })} />
          </React.Fragment>
        );
      })}
    </>
  );
}

/* ── Main component ────────────────────────────────────────────────────── */

export const AssetsTabTeamLevel: React.FC<Props> = ({ d, readOnly, projectId, organisationId }) => {
  const [actionSheet, setActionSheet] = useState<ActionSheetState | null>(null);
  const closeSheet = useCallback(() => setActionSheet(null), []);

  const logoTypes = ['logo_upload', 'logo', 'sponsor_logo_upload', 'sponsor_logo'];
  const mainTenueTypes = MAIN_KIT_ROLES.flatMap(r =>
    AI_ONLY_KITS.has(r.id) ? [`kit_${r.id}`] : [`kit_${r.id}_upload`, `kit_${r.id}`]
  );
  const otherTenueTypes = OTHER_KIT_ROLES.flatMap(r =>
    [`kit_${r.id}_upload`, `kit_${r.id}`]
  );
  const locatieTypes = ['location_photo', 'stadium_background'];

  const logoProgress = countAssets(d, logoTypes);
  const mainTenueProgress = countAssets(d, mainTenueTypes);
  const otherTenueProgress = countAssets(d, otherTenueTypes);
  const locatieProgress = countAssets(d, locatieTypes);

  return (
    <div className={s.root}>
      <SharedAssetModals d={d} projectId={projectId} organisationId={organisationId} />

      {/* Logo & Sponsor */}
      <CategorySection title="Logo & Sponsor" filled={logoProgress.filled} total={logoProgress.total}>
        {(() => { const e = d.getEffectiveAsset('logo_upload'); return (
          <AssetRow label="Logo (upload)" assetType="logo_upload" asset={e.asset} inherited={e.inherited} isUpload d={d} readOnly={readOnly} />
        ); })()}
        {(() => { const e = d.getEffectiveAsset('logo'); const u = d.getEffectiveAsset('logo_upload'); return (
          <AssetRow label="Logo (bewerkt)" assetType="logo" asset={e.asset} inherited={e.inherited} isProcessing={d.postProcessingAsset === 'logo' || d.uploadProcessingAsset === 'logo'} d={d} readOnly={readOnly}
            onShowActions={() => setActionSheet({ label: 'Logo', processedType: 'logo', uploadType: 'logo_upload', hasAsset: !!e.asset, hasUploadSource: !!u.asset, inherited: e.inherited })} />
        ); })()}
        {(() => { const e = d.getEffectiveAsset('sponsor_logo_upload'); return (
          <AssetRow label="Sponsor (upload)" assetType="sponsor_logo_upload" asset={e.asset} inherited={e.inherited} isUpload d={d} readOnly={readOnly} />
        ); })()}
        {(() => { const e = d.getEffectiveAsset('sponsor_logo'); const u = d.getEffectiveAsset('sponsor_logo_upload'); return (
          <AssetRow label="Sponsor (bewerkt)" assetType="sponsor_logo" asset={e.asset} inherited={e.inherited} isProcessing={d.postProcessingAsset === 'sponsor_logo' || d.uploadProcessingAsset === 'sponsor_logo'} d={d} readOnly={readOnly}
            onShowActions={() => setActionSheet({ label: 'Sponsor', processedType: 'sponsor_logo', uploadType: 'sponsor_logo_upload', hasAsset: !!e.asset, hasUploadSource: !!u.asset, inherited: e.inherited })} />
        ); })()}
      </CategorySection>

      {/* Hoofd tenues */}
      <CategorySection title="Hoofd tenues" filled={mainTenueProgress.filled} total={mainTenueProgress.total}>
        <KitRows roles={MAIN_KIT_ROLES} d={d} readOnly={readOnly} onAction={setActionSheet} />
      </CategorySection>

      {/* Overige tenues */}
      <CategorySection title="Overige tenues" filled={otherTenueProgress.filled} total={otherTenueProgress.total} defaultOpen={false}>
        <KitRows roles={OTHER_KIT_ROLES} d={d} readOnly={readOnly} onAction={setActionSheet} />
      </CategorySection>

      {/* Locatie */}
      <CategorySection title="Locatie" filled={locatieProgress.filled} total={locatieProgress.total}>
        {(() => { const e = d.getEffectiveAsset('location_photo'); return (
          <AssetRow label="Veld foto (upload)" assetType="location_photo" asset={e.asset} inherited={e.inherited} isUpload d={d} readOnly={readOnly} />
        ); })()}
        {(() => { const e = d.getEffectiveAsset('stadium_background'); const u = d.getEffectiveAsset('location_photo'); return (
          <AssetRow label="Achtergrond (bewerkt)" assetType="stadium_background" asset={e.asset} inherited={e.inherited} isProcessing={d.postProcessingAsset === 'stadium_background'} d={d} readOnly={readOnly}
            onShowActions={() => setActionSheet({ label: 'Achtergrond', processedType: 'stadium_background', uploadType: 'location_photo', hasAsset: !!e.asset, hasUploadSource: !!u.asset, inherited: e.inherited })} />
        ); })()}
      </CategorySection>

      {!d.profile && (
        <div className={s.warningBox}>
          Nog geen brand profiel voor dit team. Upload of genereer een asset — het profiel wordt automatisch aangemaakt.
        </div>
      )}

      {actionSheet && <AssetActionSheet state={actionSheet} d={d} onClose={closeSheet} />}
    </div>
  );
};
