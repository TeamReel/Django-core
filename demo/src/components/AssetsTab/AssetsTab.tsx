/**
 * AssetsTab — Visual brand assets display component
 *
 * Separated from IdentityTab to distinguish:
 * - AssetsTab: visual assets (logos, kits, sponsors, photos)
 * - Identity tab: design tokens (colors, fonts, spacing)
 *
 * Used across Club, Team, Season, Match, and Member detail pages.
 * Shows logo, kits, sponsor with inheritance indicators.
 *
 * Hierarchy:
 * - Club: Upload logo, kits, sponsor → AI generates combined
 * - Team: Inherits kits+logo from club, optional own sponsor
 * - Season: Snapshot of team assets, can override sponsor/kit
 * - Match: Read-only display of season's identity
 * - Member: Profile photo + season's combined kit → player card
 *
 * Decomposed (Phase 23):
 * - AssetSubComponents.tsx  → AssetCard, Section, AssetGrid, HistoryModal
 * - assetsTabHelpers.ts     → AssetsLevel type, constants
 * - useAssetsTabData.ts     → All state, effects, handlers
 * - AssetsTab.tsx            → Level-specific JSX (this file)
 */

import React from 'react';
import {
  getAssetUrl,
  KIT_ROLES,
} from '../../hooks/useBrandProfile';
import { AssetGenerationModal } from '../AssetGenerationModal';
import { AssetCard, Section, AssetGrid, HistoryModal } from './AssetSubComponents';
import { useAssetsTabData } from './useAssetsTabData';
import type { AssetsLevel } from './assetsTabHelpers';
import s from './AssetsTab.module.css';

export type { AssetsLevel } from './assetsTabHelpers';

// ============================================================================
// Props
// ============================================================================

interface AssetsTabProps {
  /** What level of the hierarchy */
  level: AssetsLevel;
  /** Organisation UUID */
  organisationId: string;
  /** Project ID (club or team) */
  projectId?: string | number | null;
  /** Parent project ID (club, when level=team) */
  parentProjectId?: string | number | null;
  /** Entity display name */
  entityName?: string;
  /** Read-only mode (match, member views) */
  readOnly?: boolean;
  /** Sponsor mode for teams: 'club' | 'custom' */
  sponsorMode?: 'club' | 'custom';
  /** Callback when sponsor mode changes */
  onSponsorModeChange?: (mode: 'club' | 'custom') => void;
}

// ============================================================================
// Main Component
// ============================================================================

export function AssetsTab({
  level,
  organisationId,
  projectId,
  parentProjectId,
  entityName,
  readOnly = false,
  sponsorMode: externalSponsorMode,
  onSponsorModeChange,
}: AssetsTabProps) {
  const d = useAssetsTabData({
    level,
    organisationId,
    projectId,
    parentProjectId,
    entityName,
    readOnly,
    sponsorMode: externalSponsorMode,
  });

  // ── Loading / Error ──
  if (d.loading || d.parentLoading) {
    return (
      <div className={`p-24 text-center ${s.loadingText}`}>
        Assets laden...
      </div>
    );
  }

  if (d.error) {
    return (
      <div className={`p-24 ${s.errorText}`}>
        Fout bij laden: {d.error}
      </div>
    );
  }

  // ── ORGANISATION level ──
  if (level === 'organisation') {
    return (
      <div className="p-16">
        <Section title="Organisatie Logo" description="Het logo van de organisatie.">
          <AssetGrid>
            <AssetCard
              label="Logo (upload)"
              assetType="logo_upload"
              asset={d.getAsset('logo_upload')}
              onUpload={d.handleUpload}
              onDelete={d.handleDelete}
              readOnly={readOnly}
              aspectRatio="1 / 1"
            />
            <AssetCard label="Logo (bewerkt)" assetType="logo" asset={d.getAsset('logo')} onUpload={d.handleUpload} onDelete={d.handleDelete} aspectRatio="1 / 1" />
          </AssetGrid>
        </Section>
      </div>
    );
  }

  // ── Shared modal/overlay elements for club + team ──
  const sharedModals = (
    <>
      <HistoryModal
        show={d.showHistoryModal}
        loading={d.loadingHistory}
        list={d.historyList}
        onClose={() => d.setShowHistoryModal(false)}
        onRestore={d.handleRestore}
      />

      {/* Spinner animation for postprocess overlay */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <AssetGenerationModal
        isOpen={d.showAiModal}
        onClose={() => { d.setShowAiModal(false); d.setAiPreviousResultUrl(null); d.setAiLabel(undefined); }}
        context="club"
        preSelectedTemplate={d.aiPreselectedTemplate}
        projectId={projectId || ''}
        organisationId={organisationId}
        inputAssets={d.aiCustomInputs}
        previousResultUrl={d.aiPreviousResultUrl}
        initialParams={d.aiInitialParams}
        label={d.aiLabel}
        onAssetSaved={d.refresh}
      />
    </>
  );

  // ── Shared AI buttons row for club + team ──
  const aiButtonsRow = (
    <div className="flex-row gap-8 mb-20 flex-wrap">
      <button
        onClick={() => { d.setAiPreselectedTemplate(undefined); d.setAiInitialParams({}); d.setAiCustomInputs(d.baseAiInputAssets); d.setShowAiModal(true); }}
        className={s.aiGradientBtn}
      >
        🎨 AI Asset Genereren
      </button>
      <button
        onClick={() => { d.setAiPreselectedTemplate('tenue_generate'); d.setAiInitialParams({ kit_type: 'home' }); d.setAiCustomInputs(d.baseAiInputAssets); d.setShowAiModal(true); }}
        className={s.quickBtn}
      >
        👕 Tenue
      </button>
      <button
        onClick={() => { d.setAiPreselectedTemplate('keeper_tenue'); d.setAiInitialParams({}); d.setAiCustomInputs(d.baseAiInputAssets); d.setShowAiModal(true); }}
        className={s.quickBtn}
      >
        🧤 Keeper
      </button>
      <button
        onClick={() => { d.setAiPreselectedTemplate('tracksuit_generate'); d.setAiInitialParams({}); d.setAiCustomInputs(d.baseAiInputAssets); d.setShowAiModal(true); }}
        className={s.quickBtn}
      >
        🏃 Training
      </button>
    </div>
  );

  // ── CLUB level ──
  if (level === 'club') {
    return (
      <div className="p-16">
        {aiButtonsRow}
        {sharedModals}

        {/* Assets Top Row: Logo & Sponsor */}
        <div className={s.topRowGrid}>
          {/* Logo */}
          <div className={s.sectionBox}>
             <h3 className={s.sectionBoxTitle}>Logo</h3>
             <p className={s.sectionBoxDesc}>Upload het clublogo → AI standaardiseert het.</p>
             <AssetGrid>
                <AssetCard label="Logo (upload)" assetType="logo_upload" asset={d.getAsset('logo_upload')} onUpload={d.handleUpload} onDelete={d.handleDelete} aspectRatio="1 / 1" />
                <AssetCard label="Logo (bewerkt)" assetType="logo" asset={d.getAsset('logo')} onUpload={d.handleUpload} onDelete={d.handleDelete} onReplace={d.handleReplaceAi} onPostProcess={d.handlePostProcess} isProcessing={d.postProcessingAsset === 'logo' || d.uploadProcessingAsset === 'logo'} aspectRatio="1 / 1" />
             </AssetGrid>
          </div>

          {/* Sponsor */}
          <div className={s.sectionBox}>
             <h3 className={s.sectionBoxTitle}>Sponsor</h3>
             <p className={s.sectionBoxDesc}>Upload het sponsor logo. Wordt gestandaardiseerd door AI.</p>
             <AssetGrid>
                <AssetCard label="Sponsor (upload)" assetType="sponsor_logo_upload" asset={d.getAsset('sponsor_logo_upload')} onUpload={d.handleUpload} onDelete={d.handleDelete} aspectRatio="1 / 1" />
                <AssetCard label="Sponsor (bewerkt)" assetType="sponsor_logo" asset={d.getAsset('sponsor_logo')} onUpload={d.handleUpload} onDelete={d.handleDelete} onReplace={d.handleReplaceAi} onPostProcess={d.handlePostProcess} isProcessing={d.postProcessingAsset === 'sponsor_logo' || d.uploadProcessingAsset === 'sponsor_logo'} aspectRatio="1 / 1" />
             </AssetGrid>
          </div>
        </div>

        {/* Kits Grid */}
        <h3 className="fs-14 fw-600 mb-12">Tenues</h3>
        <div className={s.kitsGrid}>
        {KIT_ROLES.map((role) => {
          const uploadType = `kit_${role.id}_upload`;
          const processedType = `kit_${role.id}`;

          return (
            <div key={role.id} className={s.sectionBoxSmall}>
                <div className="flex-row gap-8 mb-8">
                    <span className={s.kitIcon}>{role.icon}</span>
                    <span className={s.kitLabel}>{role.label}</span>
                </div>
              <AssetGrid>
                <AssetCard
                  label={`${role.label} (upload)`}
                  assetType={uploadType}
                  asset={d.getAsset(uploadType)}
                  onUpload={d.handleUpload}
                  onDelete={d.handleDelete}
                />
                <AssetCard
                  label={`${role.label} (bewerkt)`}
                  assetType={processedType}
                  asset={d.getAsset(processedType)}
                  onUpload={d.handleUpload}
                  onDelete={d.handleDelete}
                  onReplace={d.handleReplaceAi}
                  onPostProcess={d.handlePostProcess}
                  isProcessing={d.postProcessingAsset === processedType || d.uploadProcessingAsset === processedType}
                  onShowHistory={d.handleShowHistory}
                />
              </AssetGrid>
            </div>
          );
        })}
        </div>

        {/* Location */}
        <Section title="📍 Locatie" description="Upload een voetbalveld foto → AI zet het om naar portrait formaat voor lineup.">
          <AssetGrid>
            <AssetCard
              label="Veld foto (upload)"
              assetType="location_photo"
              asset={d.getAsset('location_photo')}
              onUpload={d.handleUpload}
              onDelete={d.handleDelete}
              aspectRatio="16 / 9"
            />
            <AssetCard
              label="Achtergrond (bewerkt)"
              assetType="stadium_background"
              asset={d.getAsset('stadium_background')}
              onUpload={d.handleUpload}
              onDelete={d.handleDelete}
              onReplace={d.handleReplaceAi}
              onPostProcess={d.handlePostProcess}
              isProcessing={d.postProcessingAsset === 'stadium_background'}
              aspectRatio="9 / 16"
            />
          </AssetGrid>
        </Section>

        {/* Club Backgrounds — multiple custom backgrounds */}
        <Section title="🖼️ Achtergronden" description="Upload eigen achtergronden voor video's. Na upload opent de AI-modal om de achtergrond te optimaliseren voor portrait formaat (1080×1920) zodat spelers er realistisch op geplaatst kunnen worden.">
          {(() => {
            const bgUploads = d.getAssets('club_background_upload');
            const bgProcessed = d.getAssets('club_background');
            const bgFileRef = React.createRef<HTMLInputElement>();

            // Group by label: match uploads with their AI-processed counterparts.
            const matchedProcessedIds = new Set<string>();
            const matchedUploadIds = new Set<string>();
            const bgPairs: { label: string; upload?: any; processed?: any }[] = [];

            // Pass 1: exact label match
            for (const upload of bgUploads) {
              const uploadLabel = upload.label || upload.file_details?.name || 'Achtergrond';
              const match = bgProcessed.find(bg => bg.label && bg.label === uploadLabel);
              if (match) {
                matchedProcessedIds.add(match.id);
                matchedUploadIds.add(upload.id);
                bgPairs.push({ label: uploadLabel, upload, processed: match });
              }
            }

            // Pass 2: pair remaining unmatched uploads with unmatched processed (by order)
            const unmatchedUploads = bgUploads.filter(u => !matchedUploadIds.has(u.id));
            const unmatchedProcessed = bgProcessed.filter(p => !matchedProcessedIds.has(p.id));

            for (let i = 0; i < unmatchedUploads.length; i++) {
              const upload = unmatchedUploads[i];
              const uploadLabel = upload.label || upload.file_details?.name || 'Achtergrond';
              const proc = unmatchedProcessed[i] || undefined;
              if (proc) matchedProcessedIds.add(proc.id);
              bgPairs.push({ label: uploadLabel, upload, processed: proc });
            }

            // Any remaining orphaned processed assets
            for (const proc of unmatchedProcessed) {
              if (!matchedProcessedIds.has(proc.id)) {
                bgPairs.push({
                  label: proc.label || proc.file_details?.name || 'Achtergrond',
                  upload: undefined,
                  processed: proc,
                });
              }
            }

            return (
              <>
                {/* Upload Button */}
                <div className="mb-16">
                  <input
                    ref={bgFileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      for (const file of files) {
                        await d.handleUpload(file, 'club_background_upload');
                      }
                      if (bgFileRef.current) bgFileRef.current.value = '';
                    }}
                  />
                  <button
                    onClick={() => bgFileRef.current?.click()}
                    disabled={d.uploading === 'club_background_upload'}
                    className={s.bgUploadBtn}
                    style={{
                      background: d.uploading === 'club_background_upload' ? '#555' : 'linear-gradient(135deg, #10b981, #059669)',
                      cursor: d.uploading === 'club_background_upload' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {d.uploading === 'club_background_upload' ? '⏳ Uploaden...' : '📤 Achtergrond Uploaden'}
                  </button>
                </div>

                {/* Background pairs: upload + AI processed */}
                {bgPairs.length > 0 ? (
                  <div className={s.bgPairsGrid}>
                    {bgPairs.map((pair) => (
                      <div key={pair.label} className={s.sectionBoxSmall}>
                        <div className={s.kitHeader}>
                          <span className={s.kitIcon}>🖼️</span>
                          <span className={s.kitLabel}>{pair.label}</span>
                        </div>
                        <AssetGrid>
                          <AssetCard
                            label="Upload (bron)"
                            assetType="club_background_upload"
                            asset={pair.upload}
                            onUpload={d.handleUpload}
                            onDelete={() => pair.upload && d.handleDeleteById(pair.upload.id)}
                            aspectRatio="9 / 16"
                          />
                          <AssetCard
                            label="Bewerkt (AI)"
                            assetType="club_background"
                            asset={pair.processed}
                            onDelete={() => pair.processed && d.handleDeleteById(pair.processed.id)}
                            onReplace={() => {
                              const sourceUrl = pair.upload?.url ? getAssetUrl(pair.upload.url) : null;
                              const prevUrl = pair.processed?.url ? getAssetUrl(pair.processed.url) : null;
                              d.setAiPreviousResultUrl(prevUrl);
                              d.setAiPreselectedTemplate('background_standardize');
                              d.setAiInitialParams({});
                              d.setAiLabel(pair.label);
                              d.setAiCustomInputs({
                                ...d.baseAiInputAssets,
                                ...(sourceUrl ? { source: sourceUrl } : {}),
                              });
                              d.setShowAiModal(true);
                            }}
                            isProcessing={d.postProcessingAsset === 'club_background'}
                            aspectRatio="9 / 16"
                          />
                        </AssetGrid>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={s.bgEmptyState}>
                    Nog geen achtergronden geüpload. Klik op "Achtergrond Uploaden" om te beginnen.
                  </div>
                )}
              </>
            );
          })()}
        </Section>

        {!d.profile && (
          <div className={s.warningBox}>
            ⚠️ Nog geen brand profiel aangemaakt voor deze club. Assets worden opgeslagen zodra er een brand profiel is.
          </div>
        )}
      </div>
    );
  }

  // ── TEAM level ── (mirrors club layout, with inheritance fallbacks)
  if (level === 'team') {
    return (
      <div className="p-16">
        {aiButtonsRow}
        {sharedModals}

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

        {/* Kits Grid — same layout as club */}
        <h3 className={s.sectionBoxTitle} style={{ marginBottom: 12 }}>Tenues</h3>
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
                <AssetCard
                  label={`${role.label} (upload)`}
                  assetType={uploadType}
                  asset={d.getAsset(uploadType)}
                  onUpload={d.handleUpload}
                  onDelete={d.handleDelete}
                />
                <AssetCard
                  label={`${role.label} (bewerkt)`}
                  assetType={processedType}
                  asset={eff.asset}
                  inherited={eff.inherited}
                  inheritedFrom="Club"
                  onUpload={d.handleUpload}
                  onDelete={d.handleDelete}
                  onReplace={d.handleReplaceAi}
                  onPostProcess={d.handlePostProcess}
                  isProcessing={d.postProcessingAsset === processedType || d.uploadProcessingAsset === processedType}
                  onShowHistory={d.handleShowHistory}
                />
              </AssetGrid>
            </div>
          );
        })}
        </div>

        {/* Location */}
        <Section title="📍 Locatie" description="Upload een voetbalveld foto → AI zet het om naar portrait formaat. Zonder eigen foto wordt de club-locatie geërfd.">
          <AssetGrid>
            <AssetCard
              label="Veld foto (upload)"
              assetType="location_photo"
              asset={d.getAsset('location_photo')}
              onUpload={d.handleUpload}
              onDelete={d.handleDelete}
              aspectRatio="16 / 9"
            />
            {(() => { const e = d.getEffectiveAsset('stadium_background'); return (
              <AssetCard
                label="Achtergrond (bewerkt)"
                assetType="stadium_background"
                asset={e.asset}
                inherited={e.inherited}
                inheritedFrom="Club"
                onUpload={d.handleUpload}
                onDelete={d.handleDelete}
                onReplace={d.handleReplaceAi}
                onPostProcess={d.handlePostProcess}
                isProcessing={d.postProcessingAsset === 'stadium_background'}
                aspectRatio="9 / 16"
              />
            ); })()}
          </AssetGrid>
        </Section>

        {!d.profile && (
          <div className={s.warningBox}>
            ⚠️ Nog geen brand profiel voor dit team. Upload of genereer een asset — het profiel wordt automatisch aangemaakt.
          </div>
        )}
      </div>
    );
  }

  // ── SEASON level ──
  if (level === 'season') {
    return (
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
  }

  // ── MATCH level ──
  if (level === 'match') {
    return (
      <div className="p-16">
        <Section title="Wedstrijd Assets" description="Visuele assets voor deze wedstrijd (read-only, geërfd van het seizoen).">
          <AssetGrid>
            {(() => { const e = d.getEffectiveAsset('logo'); return (
              <AssetCard label="Logo" assetType="logo" asset={e.asset} inherited readOnly aspectRatio="1 / 1" />
            ); })()}
            {(() => { const e = d.getEffectiveAsset('kit_home_combined'); return (
              <AssetCard label="🏠 Thuistenue" assetType="kit_home_combined" asset={e.asset} inherited readOnly />
            ); })()}
            {(() => { const e = d.getEffectiveAsset('kit_away_combined'); return (
              <AssetCard label="✈️ Uittenue" assetType="kit_away_combined" asset={e.asset} inherited readOnly />
            ); })()}
            {(() => { const e = d.getEffectiveAsset('kit_goalkeeper_combined'); return (
              <AssetCard label="🧤 Keeper" assetType="kit_goalkeeper_combined" asset={e.asset} inherited readOnly />
            ); })()}
          </AssetGrid>
        </Section>
      </div>
    );
  }

  // ── MEMBER level ──
  if (level === 'member') {
    return (
      <div className="p-16">
        <Section title="Speler Assets" description="Tenue en logo geërfd van het team/seizoen.">
          <AssetGrid>
            {(() => { const e = d.getEffectiveAsset('logo'); return (
              <AssetCard label="Logo" assetType="logo" asset={e.asset} inherited inheritedFrom="Team" readOnly aspectRatio="1 / 1" />
            ); })()}
            {(() => { const e = d.getEffectiveAsset('kit_home_combined'); return (
              <AssetCard label="🏠 Tenue (compleet)" assetType="kit_home_combined" asset={e.asset} inherited inheritedFrom="Seizoen" readOnly />
            ); })()}
            {(() => { const e = d.getEffectiveAsset('sponsor_logo'); return (
              <AssetCard label="Sponsor" assetType="sponsor_logo" asset={e.asset} inherited inheritedFrom="Team" readOnly aspectRatio="1 / 1" />
            ); })()}
          </AssetGrid>
        </Section>
      </div>
    );
  }

  return null;
}

export default AssetsTab;
