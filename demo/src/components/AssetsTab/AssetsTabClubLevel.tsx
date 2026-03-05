/**
 * AssetsTabClubLevel — Club-level asset display
 *
 * Extracted from AssetsTab.tsx (Phase 24).
 * Shows: Logo, Sponsor, Kits grid, Location, Club Backgrounds (multi-instance with pairing).
 */

import React from 'react';
import { getAssetUrl, KIT_ROLES } from '../../hooks/useBrandProfile';
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

export const AssetsTabClubLevel: React.FC<Props> = ({ d, readOnly, projectId, organisationId }) => (
  <div className="p-16">
    <AiButtonsRow d={d} />
    <SharedAssetModals d={d} projectId={projectId} organisationId={organisationId} />

    {/* Assets Top Row: Logo & Sponsor */}
    <div className={s.topRowGrid}>
      <div className={s.sectionBox}>
        <h3 className={s.sectionBoxTitle}>Logo</h3>
        <p className={s.sectionBoxDesc}>Upload het clublogo → AI standaardiseert het.</p>
        <AssetGrid>
          <AssetCard label="Logo (upload)" assetType="logo_upload" asset={d.getAsset('logo_upload')} onUpload={d.handleUpload} onDelete={d.handleDelete} aspectRatio="1 / 1" />
          <AssetCard label="Logo (bewerkt)" assetType="logo" asset={d.getAsset('logo')} onUpload={d.handleUpload} onDelete={d.handleDelete} onReplace={d.handleReplaceAi} onPostProcess={d.handlePostProcess} isProcessing={d.postProcessingAsset === 'logo' || d.uploadProcessingAsset === 'logo'} aspectRatio="1 / 1" />
        </AssetGrid>
      </div>

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
              <AssetCard label={`${role.label} (upload)`} assetType={uploadType} asset={d.getAsset(uploadType)} onUpload={d.handleUpload} onDelete={d.handleDelete} />
              <AssetCard label={`${role.label} (bewerkt)`} assetType={processedType} asset={d.getAsset(processedType)} onUpload={d.handleUpload} onDelete={d.handleDelete} onReplace={d.handleReplaceAi} onPostProcess={d.handlePostProcess} isProcessing={d.postProcessingAsset === processedType || d.uploadProcessingAsset === processedType} onShowHistory={d.handleShowHistory} />
            </AssetGrid>
          </div>
        );
      })}
    </div>

    {/* Location */}
    <Section title="📍 Locatie" description="Upload een voetbalveld foto → AI zet het om naar portrait formaat voor lineup.">
      <AssetGrid>
        <AssetCard label="Veld foto (upload)" assetType="location_photo" asset={d.getAsset('location_photo')} onUpload={d.handleUpload} onDelete={d.handleDelete} aspectRatio="16 / 9" />
        <AssetCard label="Achtergrond (bewerkt)" assetType="stadium_background" asset={d.getAsset('stadium_background')} onUpload={d.handleUpload} onDelete={d.handleDelete} onReplace={d.handleReplaceAi} onPostProcess={d.handlePostProcess} isProcessing={d.postProcessingAsset === 'stadium_background'} aspectRatio="9 / 16" />
      </AssetGrid>
    </Section>

    {/* Club Backgrounds — multiple custom backgrounds */}
    <Section title="🖼️ Achtergronden" description="Upload eigen achtergronden voor video's. Na upload opent de AI-modal om de achtergrond te optimaliseren voor portrait formaat (1080×1920) zodat spelers er realistisch op geplaatst kunnen worden.">
      <ClubBackgrounds d={d} />
    </Section>

    {!d.profile && (
      <div className={s.warningBox}>
        ⚠️ Nog geen brand profiel aangemaakt voor deze club. Assets worden opgeslagen zodra er een brand profiel is.
      </div>
    )}
  </div>
);

/* ─── Club Backgrounds sub-component (pairing logic + upload) ─── */

const ClubBackgrounds: React.FC<{ d: AssetsTabData }> = ({ d }) => {
  const bgUploads = d.getAssets('club_background_upload');
  const bgProcessed = d.getAssets('club_background');
  const bgFileRef = React.createRef<HTMLInputElement>();

  // Group by label: match uploads with their AI-processed counterparts
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

  // Pass 2: pair remaining unmatched by order
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
      bgPairs.push({ label: proc.label || proc.file_details?.name || 'Achtergrond', upload: undefined, processed: proc });
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
          {d.uploading === 'club_background_upload' ? 'Uploaden...' : 'Achtergrond Uploaden'}
        </button>
      </div>

      {/* Background pairs: upload + AI processed */}
      {bgPairs.length > 0 ? (
        <div className={s.bgPairsGrid}>
          {bgPairs.map((pair) => (
            <div key={pair.label} className={s.sectionBoxSmall}>
              <div className={s.kitHeader}>
                <span className={s.kitIcon}></span>
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
};
