/**
 * AssetsTabSeasonLevel — Season-level asset display
 *
 * Extracted from AssetsTab.tsx (Phase 24).
 * Shows inherited assets with optional season-level overrides for sponsor and kits.
 */

import React from 'react';
import { KIT_ROLES } from '../../hooks/useBrandProfile';
import { AssetCard, Section, AssetGrid } from './AssetSubComponents';
import type { AssetsTabData } from './useAssetsTabData';
import s from './AssetsTab.module.css';

interface Props {
  d: AssetsTabData;
  readOnly: boolean;
}

export const AssetsTabSeasonLevel: React.FC<Props> = ({ d, readOnly }) => (
  <div className="p-16">
    <Section title="Seizoen Assets" description="Visuele assets voor dit seizoen. Tenue en sponsor kunnen per seizoen wijzigen.">
      {/* Logo - always inherited */}
      <div className="mb-16">
        <div className={`fs-12 fw-600 ${s.seasonLabel}`}>Logo</div>
        <AssetGrid>
          {(() => { const e = d.getEffectiveAsset('logo'); return (
            <AssetCard label="Logo" assetType="logo" asset={e.asset} inherited={e.inherited} inheritedFrom="Club" readOnly aspectRatio="1 / 1" />
          ); })()}
        </AssetGrid>
      </div>

      {/* Sponsor - can override */}
      <div className="mb-16">
        <div className={`fs-12 fw-600 ${s.seasonLabel}`}>Sponsor</div>
        <AssetGrid>
          {(() => { const e = d.getEffectiveAsset('sponsor_logo'); return (
            <AssetCard
              label={e.inherited ? 'Sponsor (van team/club)' : 'Sponsor'}
              assetType="sponsor_logo"
              asset={e.asset}
              inherited={e.inherited}
              inheritedFrom="Team"
              readOnly={readOnly}
              aspectRatio="1 / 1"
            />
          ); })()}
          {!readOnly && (
            <AssetCard
              label="Sponsor uploaden (override)"
              assetType="sponsor_logo_upload"
              asset={d.getAsset('sponsor_logo_upload')}
              onUpload={d.handleUpload}
              onDelete={d.handleDelete}
              aspectRatio="1 / 1"
            />
          )}
        </AssetGrid>
      </div>

      {/* Kits - combined with this season's sponsor */}
      <div className="mt-24">
        <div className={s.seasonSubtitle}>Tenues (dit seizoen)</div>
        <div className={s.kitsGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {KIT_ROLES.map((role) => {
            const uploadType = `kit_${role.id}_upload`;
            const processedType = `kit_${role.id}`;
            const combinedType = `kit_${role.id}_combined`;

            const eff = d.getEffectiveAsset(combinedType);
            const localUpload = d.getAsset(uploadType);
            const localProcessed = d.getAsset(processedType);
            const isOverridden = !!localUpload || !!localProcessed;

            return (
              <div key={role.id} className={s.sectionBoxSmall}>
                <div className={s.seasonKitHeader}>
                  <div className={s.seasonKitHeaderInner}>
                    <span className={s.kitIcon}>{role.icon}</span>
                    <span className={s.kitLabel}>{role.label}</span>
                    {isOverridden && <span className={s.overrideBadge}>Aangepast</span>}
                  </div>
                  {!readOnly && isOverridden && (
                    <button
                      onClick={() => { if(window.confirm('Aangepast tenue verwijderen en weer erven van club?')) { d.handleDelete(uploadType); d.handleDelete(processedType); } }}
                      className={s.resetLink}
                    >
                      Herstel
                    </button>
                  )}
                </div>

                <AssetGrid>
                  {!isOverridden && (
                    <AssetCard
                      label="Resultaat (Geërfd)"
                      assetType={combinedType}
                      asset={eff.asset}
                      inherited={true}
                      inheritedFrom="Club"
                      readOnly
                    />
                  )}

                  {!readOnly && (
                    <>
                      <AssetCard
                        label={isOverridden ? "Upload (Bron)" : "Upload (Override)"}
                        assetType={uploadType}
                        asset={localUpload}
                        onUpload={d.handleUpload}
                        onDelete={d.handleDelete}
                      />
                      {isOverridden && (
                        <AssetCard
                          label="Bewerkt (AI)"
                          assetType={processedType}
                          asset={localProcessed}
                          onUpload={d.handleUpload}
                          onDelete={d.handleDelete}
                          onReplace={d.handleReplaceAi}
                          onPostProcess={d.handlePostProcess}
                          isProcessing={d.postProcessingAsset === processedType || d.uploadProcessingAsset === processedType}
                        />
                      )}
                    </>
                  )}

                  {!readOnly && !isOverridden && (
                    <div className={s.seasonKitHelperCol}>
                      <button
                        onClick={() => d.handleReplaceAi(processedType)}
                        className={s.seasonAiBtn}
                      >
                        ✨ Genereer met AI
                      </button>
                      <span className={s.seasonHelperText}>
                        Genereert een nieuw tenue voor dit seizoen.<br/>(Gebruikt seizoens- of clubsponsor)
                      </span>
                    </div>
                  )}
                </AssetGrid>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  </div>
);
