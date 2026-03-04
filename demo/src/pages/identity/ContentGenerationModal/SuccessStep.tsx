import React from 'react';
import { Button } from '@django-core/design-system';
import type { GeneratedVariant, GeneratedOutput, ContentTemplate } from './types';
import { getSecureMimeType } from './utils';
import styles from './SuccessStep.module.css';

interface SuccessStepProps {
  generatedOutput: GeneratedOutput | null;
  generatedVariants: GeneratedVariant[];
  selectedVariantIndex: number;
  setSelectedVariantIndex: (index: number) => void;
  savingAsset: boolean;
  saveSuccess: boolean;
  savedVariantIndices: Set<number>;
  selectedType: { type: string; subtype: string; label: string } | null;
  selectedTemplate: ContentTemplate | null;
  matchData: { id: string; title?: string; project?: { id: string; name: string }; opponent_project?: { id: string; name: string } } | null;
  handleSaveAsAsset: () => void;
  handleSaveAllAsAssets: () => void;
  handleSaveVariantByIndex: (index: number, opts?: { skipAutoClose?: boolean }) => void;
  handleGenerateInternal: () => void;
  onClose: () => void;
}

export function SuccessStep({
  generatedOutput,
  generatedVariants,
  selectedVariantIndex,
  setSelectedVariantIndex,
  savingAsset,
  saveSuccess,
  savedVariantIndices,
  selectedType,
  matchData,
  handleSaveAsAsset,
  handleSaveAllAsAssets,
  handleSaveVariantByIndex,
  handleGenerateInternal,
  onClose,
}: SuccessStepProps) {
  return (
    <div className="flex-col flex-center h-full text-center overflow-y-auto py-32">
      <div className={`mb-8 ${styles.checkIcon}`}>✓</div>
      <h3 className="fs-20 fw-700 mb-4">
        {generatedVariants.length > 1
          ? (savedVariantIndices.size === generatedVariants.length ? 'Alles opgeslagen!' : 'Content klaar!')
          : 'Content klaar!'}
      </h3>
      <p className={`fs-14 mb-16 text-secondary ${styles.description}`}>
        {generatedVariants.length > 1
          ? `${generatedVariants.length} varianten gegenereerd. Sla ze individueel op, of allemaal tegelijk.`
          : `Je ${selectedType?.label || 'content'} is gegenereerd.`
        }
      </p>

      {/* Multiple variants grid */}
      {generatedVariants.length > 1 ? (
        <div className={`w-full mb-16 ${styles.variantsContainer}`}>
          <div className="grid-cols-2 gap-12">
            {generatedVariants.map((variant, index) => {
              const isSelected = selectedVariantIndex === index;
              const isSaved = savedVariantIndices.has(index);

              let mimeType = variant.mime_type;
              if (variant.image_base64) {
                mimeType = getSecureMimeType(variant.image_base64, variant.mime_type);
              }

              const imageSrc = variant.image_base64
                ? `data:${mimeType};base64,${variant.image_base64}`
                : variant.presigned_url;

              return (
                <div
                  key={variant.variant_index}
                  onClick={() => setSelectedVariantIndex(index)}
                  className={`relative cursor-pointer rounded-8 overflow-hidden transition ${styles.variantCard}`}
                  data-saved={isSaved || undefined}
                  data-selected={isSelected || undefined}
                >
                  {mimeType?.startsWith('video/') ? (
                    <video
                      src={variant.presigned_url || ''}
                      className={`w-full bg-surface-2 object-contain ${styles.variantMedia}`}
                      muted
                    />
                  ) : imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={`Variant ${index + 1}`}
                      className={`w-full bg-surface-2 object-contain ${styles.variantMedia}`}
                    />
                  ) : (
                    <div className={`w-full bg-surface-2 flex-center text-muted fs-14 ${styles.variantMedia}`}>
                      Geen voorbeeld
                    </div>
                  )}
                  {/* Variant number badge */}
                  <div
                    className={`absolute rounded-full flex-center fs-12 fw-700 ${styles.variantBadge}`}
                    data-saved={isSaved || undefined}
                    data-selected={isSelected || undefined}
                  >
                    {isSaved ? '\u2713' : index + 1}
                  </div>
                  {isSaved && (
                    <div className={`absolute text-success fs-14 fw-700 ${styles.savedBadge}`}>
                    </div>
                  )}
                  {/* Per-tile save button */}
                  <div className={`absolute fs-12 px-8 flex-between text-white ${styles.tileOverlay}`}>
                    <span>{variant.storage_info ? `${(variant.storage_info.file_size_bytes / 1024).toFixed(0)} KB` : `Variant ${index + 1}`}</span>
                    {isSaved ? (
                      <span className="fw-700 text-success">Opgeslagen</span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveVariantByIndex(index, { skipAutoClose: true });
                        }}
                        disabled={savingAsset}
                        className={`px-8 rounded-6 fs-12 fw-600 border-none cursor-pointer text-white transition ${styles.tileSaveButton}`}
                      >
                        {savingAsset && selectedVariantIndex === index ? '' : 'Opslaan'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Single variant display — tile-based card
        <>
          {generatedVariants[0]?.mime_type?.startsWith('video/') ? (
            <div className={`mb-16 self-center ${styles.singleVideoWrapper}`}>
              <div
                className={`rounded-12 overflow-hidden transition ${styles.singleVideoCard}`}
                data-save-success={saveSuccess || undefined}
                onClick={() => {
                  if (!saveSuccess && !savingAsset) {
                    handleSaveAsAsset();
                  }
                }}
                title={!saveSuccess ? 'Klik om op te slaan' : ''}
              >
                {/* Video preview */}
                <div className="relative">
                  <video
                    src={generatedVariants[0].presigned_url || ''}
                    controls
                    autoPlay
                    playsInline
                    className={`w-full block object-contain ${styles.videoPreview}`}
                  >
                    Je browser ondersteunt geen video.
                  </video>
                  <div
                    className={`absolute rounded-12 fs-11 fw-600 text-white ${styles.mediaBadge}`}
                    data-save-success={saveSuccess || undefined}
                  >
                    {savingAsset ? 'Opslaan...' : saveSuccess ? 'Opgeslagen' : 'Klik om op te slaan'}
                  </div>
                  {generatedVariants[0].storage_info && (
                    <div className={`absolute rounded-8 fs-11 text-white ${styles.sizeBadge}`}>
                      {((generatedVariants[0].storage_info.file_size_bytes || 0) / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  )}
                </div>

                {/* Tile footer */}
                <div className={`py-12 px-16 bg-surface ${styles.tileFooter}`}>
                  <div className="fw-600 fs-14 text-primary mb-4">
                    Lineup Video
                  </div>
                  <div className="fs-12 mb-8 text-muted">
                    {matchData?.title || 'Match'} — {new Date().toLocaleDateString('nl-NL')}
                  </div>

                  {/* Action buttons (shown after save) */}
                  {saveSuccess ? (
                    <div className="flex-row gap-8">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleGenerateInternal(); }}
                        className={`flex-1 rounded-6 bg-transparent fs-12 fw-600 cursor-pointer border ${styles.regenerateButton}`}
                      >
                        Opnieuw
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = generatedVariants[0]?.presigned_url;
                          if (url) window.open(url, '_blank');
                        }}
                        className={`flex-1 rounded-6 bg-transparent fs-12 fw-600 cursor-pointer text-muted border ${styles.secondaryButton}`}
                      >
                        Download
                      </button>
                    </div>
                  ) : (
                    <div className="flex-row gap-8">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!savingAsset && !saveSuccess) handleSaveAsAsset();
                        }}
                        disabled={savingAsset || saveSuccess}
                        className={`flex-1 rounded-6 bg-transparent fs-12 fw-700 ${styles.acceptButton}`}
                        data-disabled={savingAsset || saveSuccess || undefined}
                      >
                        {savingAsset ? 'Opslaan...' : 'Accepteren & Opslaan'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = generatedVariants[0]?.presigned_url;
                          if (url) window.open(url, '_blank');
                        }}
                        className={`flex-1 rounded-6 bg-transparent fs-12 fw-600 cursor-pointer text-muted border ${styles.secondaryButton}`}
                      >
                        Groot bekijken
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : generatedOutput?.image_base64 ? (
            <div className={`mb-16 self-center ${styles.singleImageWrapper}`}>
              <div
                className={`rounded-12 overflow-hidden transition ${styles.singleImageCard}`}
                data-save-success={saveSuccess || undefined}
                onClick={() => { if (!saveSuccess && !savingAsset) handleSaveAsAsset(); }}
                title={!saveSuccess ? 'Klik om op te slaan' : ''}
              >
                <div className="relative">
                  <img
                    src={`data:${getSecureMimeType(generatedOutput.image_base64, generatedOutput.storage_info?.mime_type || 'image/png')};base64,${generatedOutput.image_base64}`}
                    alt="Generated content"
                    className={`w-full block object-contain ${styles.imagePreview}`}
                  />
                  <div
                    className={`absolute rounded-12 fs-11 fw-600 text-white ${styles.mediaBadge}`}
                    data-save-success={saveSuccess || undefined}
                  >
                    {savingAsset ? 'Opslaan...' : saveSuccess ? 'Opgeslagen' : 'Klik om op te slaan'}
                  </div>
                </div>
              </div>
            </div>
          ) : (generatedOutput?.presigned_url || generatedVariants[0]?.presigned_url) ? (
            <div className={`mb-16 self-center ${styles.singleImageWrapper}`}>
              <div
                className={`rounded-12 overflow-hidden transition ${styles.singleImageCard}`}
                data-save-success={saveSuccess || undefined}
                onClick={() => { if (!saveSuccess && !savingAsset) handleSaveAsAsset(); }}
                title={!saveSuccess ? 'Klik om op te slaan' : ''}
              >
                <div className="relative">
                  <img
                    src={generatedOutput?.presigned_url || generatedVariants[0]?.presigned_url || ''}
                    alt="Generated content"
                    className={`w-full block object-contain ${styles.imagePreview}`}
                  />
                  <div
                    className={`absolute rounded-12 fs-11 fw-600 text-white ${styles.mediaBadge}`}
                    data-save-success={saveSuccess || undefined}
                  >
                    {savingAsset ? 'Opslaan...' : saveSuccess ? 'Opgeslagen' : 'Klik om op te slaan'}
                  </div>
                </div>
                <div className={`bg-surface border-top ${styles.cardFooter}`}>
                  <div className="fw-600 fs-13 text-primary mb-4">
                    {selectedType?.label || 'Content'}
                  </div>
                  <div className="fs-11 text-muted">
                    {matchData?.title || 'Match'} — {new Date().toLocaleDateString('nl-NL')}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`rounded-8 flex-center text-muted mb-16 border ${styles.noPreview}`}>
              [Geen voorbeeld beschikbaar]
            </div>
          )}
        </>
      )}

      {/* Save success message */}
      {saveSuccess && (
        <div className={`p-12 rounded-8 fs-14 mb-16 callout-success ${styles.successMessage}`}>
          <strong>Opgeslagen!</strong> De variant is opgeslagen als brand asset.
        </div>
      )}

      {/* Selected variant info */}
      {generatedVariants[selectedVariantIndex]?.storage_info && (
        <details className={`p-12 rounded-8 fs-14 mb-16 text-left bg-surface-2 border ${styles.storageDetails}`}>
          <summary className="cursor-pointer fw-500">Opslag info (Variant {selectedVariantIndex + 1})</summary>
          <div className="flex-col mt-8 fs-12 gap-4">
            <div><strong>Backend:</strong> {generatedVariants[selectedVariantIndex].storage_info?.storage_backend}</div>
            <div><strong>Pad:</strong> {generatedVariants[selectedVariantIndex].storage_info?.storage_path}</div>
            <div><strong>Grootte:</strong> {((generatedVariants[selectedVariantIndex].storage_info?.file_size_bytes || 0) / 1024).toFixed(1)} KB</div>
            {generatedVariants[selectedVariantIndex].storage_info?.brand_asset_id && (
              <div className="text-success"><strong>BrandAsset ID:</strong> {generatedVariants[selectedVariantIndex].storage_info?.brand_asset_id}</div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
