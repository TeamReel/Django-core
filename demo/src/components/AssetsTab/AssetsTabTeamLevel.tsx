/**
 * AssetsTabTeamLevel — Team-level asset display
 *
 * Extracted from AssetsTab.tsx (Phase 24).
 * Mirrors club layout but with inheritance fallbacks via getEffectiveAsset.
 */

import React from 'react';
import { KIT_ROLES } from '../../hooks/useBrandProfile';
import { AssetCard, Section, AssetGrid } from './AssetSubComponents';
import { SharedAssetModals, AiButtonsRow } from './AssetsTabShared';
import type { AssetsTabData } from './useAssetsTabData';
import s from './AssetsTab.module.css';

interface Props {
  d: AssetsTabData;
  readOnly: boolean;
  projectId: string | number;
  organisationId: string;
}

export const AssetsTabTeamLevel: React.FC<Props> = ({ d, readOnly, projectId, organisationId }) => (
  <div className="p-16">
    <AiButtonsRow d={d} />
    <SharedAssetModals d={d} projectId={projectId} organisationId={organisationId} />

    {/* Assets Top Row: Logo & Sponsor */}
    <div className={s.topRowGrid}>
      {/* Logo */}
      <div className={s.sectionBox}>
        <h3 className={s.sectionBoxTitle}>Logo</h3>
        <p className={s.sectionBoxDesc}>Upload het teamlogo → AI standaardiseert het. Zonder eigen logo wordt het clublogo geërfd.</p>
        <AssetGrid>
          <AssetCard label="Logo (upload)" assetType="logo_upload" asset={d.getAsset('logo_upload')} onUpload={d.handleUpload} onDelete={d.handleDelete} aspectRatio="1 / 1" />
          {(() => { const e = d.getEffectiveAsset('logo'); return (
            <AssetCard label="Logo (bewerkt)" assetType="logo" asset={e.asset} inherited={e.inherited} inheritedFrom="Club" onUpload={d.handleUpload} onDelete={d.handleDelete} onReplace={d.handleReplaceAi} onPostProcess={d.handlePostProcess} isProcessing={d.postProcessingAsset === 'logo' || d.uploadProcessingAsset === 'logo'} aspectRatio="1 / 1" />
          ); })()}
        </AssetGrid>
      </div>

      {/* Sponsor */}
      <div className={s.sectionBox}>
        <h3 className={s.sectionBoxTitle}>Sponsor</h3>
        <p className={s.sectionBoxDesc}>Upload het sponsor logo → AI standaardiseert. Zonder eigen sponsor wordt de clubsponsor geërfd.</p>
        <AssetGrid>
          <AssetCard label="Sponsor (upload)" assetType="sponsor_logo_upload" asset={d.getAsset('sponsor_logo_upload')} onUpload={d.handleUpload} onDelete={d.handleDelete} aspectRatio="1 / 1" />
          {(() => { const e = d.getEffectiveAsset('sponsor_logo'); return (
            <AssetCard label="Sponsor (bewerkt)" assetType="sponsor_logo" asset={e.asset} inherited={e.inherited} inheritedFrom="Club" onUpload={d.handleUpload} onDelete={d.handleDelete} onReplace={d.handleReplaceAi} onPostProcess={d.handlePostProcess} isProcessing={d.postProcessingAsset === 'sponsor_logo' || d.uploadProcessingAsset === 'sponsor_logo'} aspectRatio="1 / 1" />
          ); })()}
        </AssetGrid>
      </div>
    </div>

    {/* Kits Grid — same layout as club with inheritance badges */}
    <h3 className={`${s.sectionBoxTitle} mb-12`}>Tenues</h3>
    <div className={s.kitsGrid}>
      {KIT_ROLES.map((role) => {
        const uploadType = `kit_${role.id}_upload`;
        const processedType = `kit_${role.id}`;
        const eff = d.getEffectiveAsset(processedType);
        return (
          <div key={role.id} className={s.sectionBoxSmall}>
            <div className={s.kitHeader}>
              <span className={s.kitIcon}>{role.icon}</span>
              <span className={s.kitLabel}>{role.label}</span>
              {eff.inherited && <span className={s.clubBadge}>Club</span>}
            </div>
            <AssetGrid>
              <AssetCard label={`${role.label} (upload)`} assetType={uploadType} asset={d.getAsset(uploadType)} onUpload={d.handleUpload} onDelete={d.handleDelete} />
              <AssetCard label={`${role.label} (bewerkt)`} assetType={processedType} asset={eff.asset} inherited={eff.inherited} inheritedFrom="Club" onUpload={d.handleUpload} onDelete={d.handleDelete} onReplace={d.handleReplaceAi} onPostProcess={d.handlePostProcess} isProcessing={d.postProcessingAsset === processedType || d.uploadProcessingAsset === processedType} onShowHistory={d.handleShowHistory} />
            </AssetGrid>
          </div>
        );
      })}
    </div>

    {/* Location */}
    <Section title="Locatie" description="Upload een voetbalveld foto → AI zet het om naar portrait formaat. Zonder eigen foto wordt de club-locatie geërfd.">
      <AssetGrid>
        <AssetCard label="Veld foto (upload)" assetType="location_photo" asset={d.getAsset('location_photo')} onUpload={d.handleUpload} onDelete={d.handleDelete} aspectRatio="16 / 9" />
        {(() => { const e = d.getEffectiveAsset('stadium_background'); return (
          <AssetCard label="Achtergrond (bewerkt)" assetType="stadium_background" asset={e.asset} inherited={e.inherited} inheritedFrom="Club" onUpload={d.handleUpload} onDelete={d.handleDelete} onReplace={d.handleReplaceAi} onPostProcess={d.handlePostProcess} isProcessing={d.postProcessingAsset === 'stadium_background'} aspectRatio="9 / 16" />
        ); })()}
      </AssetGrid>
    </Section>

    {!d.profile && (
      <div className={s.warningBox}>
        Nog geen brand profiel voor dit team. Upload of genereer een asset — het profiel wordt automatisch aangemaakt.
      </div>
    )}
  </div>
);
