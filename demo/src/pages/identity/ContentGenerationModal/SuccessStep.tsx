import React from 'react';
import { Button } from '@django-core/design-system';
import type { GeneratedVariant, GeneratedOutput, ContentTemplate } from './types';
import { getSecureMimeType } from './utils';

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: '32px', paddingBottom: '32px', textAlign: 'center', overflowY: 'auto' }}>
      <div className="mb-8" style={{ fontSize: '36px' }}>✓</div>
      <h3 className="fs-20 fw-700 mb-4">
        {generatedVariants.length > 1
          ? (savedVariantIndices.size === generatedVariants.length ? 'Alles opgeslagen!' : 'Content klaar!')
          : 'Content klaar!'}
      </h3>
      <p className="fs-14 mb-16" style={{ color: 'var(--app-text-secondary, #4b5563)', maxWidth: '384px' }}>
        {generatedVariants.length > 1
          ? `${generatedVariants.length} varianten gegenereerd. Sla ze individueel op, of allemaal tegelijk.`
          : `Je ${selectedType?.label || 'content'} is gegenereerd.`
        }
      </p>

      {/* Multiple variants grid — converted Tailwind className to inline styles */}
      {generatedVariants.length > 1 ? (
        <div className="w-full mb-16" style={{ maxWidth: '672px' }}>
          <div className="grid gap-12" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
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
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    border: isSaved
                      ? '2px solid #22c55e'
                      : isSelected
                        ? '2px solid #3b82f6'
                        : '2px solid var(--app-border, #e5e7eb)',
                    overflow: 'hidden',
                    transition: 'all 150ms ease',
                    boxShadow: isSaved || isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {mimeType?.startsWith('video/') ? (
                    <video
                      src={variant.presigned_url || ''}
                      style={{ width: '100%', height: '128px', objectFit: 'contain', background: 'var(--app-surface-2, #f9fafb)' }}
                      muted
                    />
                  ) : imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={`Variant ${index + 1}`}
                      style={{ width: '100%', height: '128px', objectFit: 'contain', background: 'var(--app-surface-2, #f9fafb)' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '128px', background: 'var(--app-surface-2, #f3f4f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--app-text-muted, #9ca3af)', fontSize: '14px' }}>
                      Geen voorbeeld
                    </div>
                  )}
                  {/* Variant number badge — converted Tailwind to inline */}
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    width: '24px', height: '24px', borderRadius: '9999px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700,
                    background: isSaved ? '#22c55e' : isSelected ? '#3b82f6' : 'var(--app-surface-2, #e5e7eb)',
                    color: isSaved || isSelected ? '#ffffff' : 'var(--app-text-muted, #6b7280)',
                  }}>
                    {isSaved ? '\u2713' : index + 1}
                  </div>
                  {isSaved && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--app-success, #06D6A0)', fontSize: '14px', fontWeight: 700 }}>
                    </div>
                  )}
                  {/* Per-tile save button */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#ffffff', fontSize: '12px', paddingTop: '6px', paddingBottom: '6px', paddingLeft: '8px', paddingRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{variant.storage_info ? `${(variant.storage_info.file_size_bytes / 1024).toFixed(0)} KB` : `Variant ${index + 1}`}</span>
                    {isSaved ? (
                      <span style={{ color: '#34d399', fontWeight: 700 }}>Opgeslagen</span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveVariantByIndex(index, { skipAutoClose: true });
                        }}
                        disabled={savingAsset}
                        style={{ paddingLeft: '8px', paddingRight: '8px', paddingTop: '2px', paddingBottom: '2px', background: 'var(--app-primary, #3B8EA5)', borderRadius: '6px', color: '#ffffff', fontSize: '12px', fontWeight: 600, transition: 'color 150ms, background 150ms', border: 'none', cursor: 'pointer' }}
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
            <div style={{ width: '280px', maxWidth: '92vw', marginBottom: '16px', alignSelf: 'center' }}>
              <div
                style={{
                  border: saveSuccess ? '2px solid #22c55e' : '2px solid #e5e7eb',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#000',
                  cursor: !saveSuccess ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
                onClick={() => {
                  if (!saveSuccess && !savingAsset) {
                    handleSaveAsAsset();
                  }
                }}
                title={!saveSuccess ? 'Klik om op te slaan' : ''}
              >
                {/* Video preview */}
                <div style={{ position: 'relative' }}>
                  <video
                    src={generatedVariants[0].presigned_url || ''}
                    controls
                    autoPlay
                    playsInline
                    style={{ width: '100%', height: '160px', maxHeight: '160px', objectFit: 'contain', display: 'block', background: '#000' }}
                  >
                    Je browser ondersteunt geen video.
                  </video>
                  <div style={{ position: 'absolute', top: 8, right: 8, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: saveSuccess ? '#22c55e' : '#3b82f6', color: 'white' }}>
                    {savingAsset ? 'Opslaan...' : saveSuccess ? 'Opgeslagen' : 'Klik om op te slaan'}
                  </div>
                  {generatedVariants[0].storage_info && (
                    <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '2px 8px', borderRadius: '8px', fontSize: '11px', background: 'rgba(0,0,0,0.6)', color: 'white' }}>
                      {((generatedVariants[0].storage_info.file_size_bytes || 0) / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  )}
                </div>

                {/* Tile footer */}
                <div style={{ padding: '12px 16px', background: 'var(--app-surface, #111)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--app-text, white)', marginBottom: '6px' }}>
                    Lineup Video
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                    {matchData?.title || 'Match'} — {new Date().toLocaleDateString('nl-NL')}
                  </div>

                  {/* Action buttons (shown after save) */}
                  {saveSuccess ? (
                    <div className="flex-row gap-8">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleGenerateInternal(); }}
                        style={{ flex: 1, padding: '6px 12px', borderRadius: '6px', border: '1px solid #3b82f6', background: 'transparent', color: '#3b82f6', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Opnieuw
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = generatedVariants[0]?.presigned_url;
                          if (url) window.open(url, '_blank');
                        }}
                        style={{ flex: 1, padding: '6px 12px', borderRadius: '6px', border: '1px solid #6b7280', background: 'transparent', color: '#6b7280', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
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
                        style={{
                          flex: 1, padding: '6px 12px', borderRadius: '6px', border: '1px solid #22c55e',
                          background: 'transparent', color: '#22c55e', fontSize: '12px', fontWeight: 700,
                          cursor: savingAsset || saveSuccess ? 'not-allowed' : 'pointer',
                          opacity: savingAsset || saveSuccess ? 0.6 : 1,
                        }}
                      >
                        {savingAsset ? 'Opslaan...' : 'Accepteren & Opslaan'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = generatedVariants[0]?.presigned_url;
                          if (url) window.open(url, '_blank');
                        }}
                        style={{ flex: 1, padding: '6px 12px', borderRadius: '6px', border: '1px solid #6b7280', background: 'transparent', color: '#6b7280', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Groot bekijken
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : generatedOutput?.image_base64 ? (
            <div style={{ width: '220px', maxWidth: '92vw', marginBottom: '16px', alignSelf: 'center' }}>
              <div style={{
                border: saveSuccess ? '2px solid #22c55e' : '2px solid #e5e7eb',
                borderRadius: '12px', overflow: 'hidden', background: '#f9fafb',
                cursor: !saveSuccess ? 'pointer' : 'default',
                transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
              }}
                onClick={() => { if (!saveSuccess && !savingAsset) handleSaveAsAsset(); }}
                title={!saveSuccess ? 'Klik om op te slaan' : ''}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={`data:${getSecureMimeType(generatedOutput.image_base64, generatedOutput.storage_info?.mime_type || 'image/png')};base64,${generatedOutput.image_base64}`}
                    alt="Generated content"
                    style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', display: 'block' }}
                  />
                  <div style={{ position: 'absolute', top: 8, right: 8, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: saveSuccess ? '#22c55e' : '#3b82f6', color: 'white' }}>
                    {savingAsset ? 'Opslaan...' : saveSuccess ? 'Opgeslagen' : 'Klik om op te slaan'}
                  </div>
                </div>
              </div>
            </div>
          ) : (generatedOutput?.presigned_url || generatedVariants[0]?.presigned_url) ? (
            <div style={{ width: '220px', maxWidth: '92vw', marginBottom: '16px', alignSelf: 'center' }}>
              <div style={{
                border: saveSuccess ? '2px solid #22c55e' : '2px solid #e5e7eb',
                borderRadius: '12px', overflow: 'hidden', background: '#f9fafb',
                cursor: !saveSuccess ? 'pointer' : 'default',
                transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
              }}
                onClick={() => { if (!saveSuccess && !savingAsset) handleSaveAsAsset(); }}
                title={!saveSuccess ? 'Klik om op te slaan' : ''}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={generatedOutput?.presigned_url || generatedVariants[0]?.presigned_url || ''}
                    alt="Generated content"
                    style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', display: 'block' }}
                  />
                  <div style={{ position: 'absolute', top: 8, right: 8, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: saveSuccess ? '#22c55e' : '#3b82f6', color: 'white' }}>
                    {savingAsset ? 'Opslaan...' : saveSuccess ? 'Opgeslagen' : 'Klik om op te slaan'}
                  </div>
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--app-surface, #fff)', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--app-text, #333)', marginBottom: '4px' }}>
                    {selectedType?.label || 'Content'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {matchData?.title || 'Match'} — {new Date().toLocaleDateString('nl-NL')}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'linear-gradient(to bottom right, var(--app-surface-2, #f3f4f6), var(--app-border, #e5e5e5))', aspectRatio: '16 / 9', width: '256px', borderRadius: '8px', border: '1px solid var(--app-border, #e5e5e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--app-text-muted, #9ca3af)', marginBottom: '16px' }}>
              [Geen voorbeeld beschikbaar]
            </div>
          )}
        </>
      )}

      {/* Save success message */}
      {saveSuccess && (
        <div className="p-12 rounded-8 fs-14 mb-16" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', maxWidth: '448px' }}>
          <strong>Opgeslagen!</strong> De variant is opgeslagen als brand asset.
        </div>
      )}

      {/* Selected variant info */}
      {generatedVariants[selectedVariantIndex]?.storage_info && (
        <details className="p-12 rounded-8 fs-14 mb-16 text-left" style={{ background: 'var(--app-surface-2, #f9fafb)', border: '1px solid var(--app-border, #e5e5e5)', maxWidth: '448px' }}>
          <summary className="cursor-pointer fw-500">Opslag info (Variant {selectedVariantIndex + 1})</summary>
          <div className="flex-col mt-8 fs-12 gap-4">
            <div><strong>Backend:</strong> {generatedVariants[selectedVariantIndex].storage_info?.storage_backend}</div>
            <div><strong>Pad:</strong> {generatedVariants[selectedVariantIndex].storage_info?.storage_path}</div>
            <div><strong>Grootte:</strong> {((generatedVariants[selectedVariantIndex].storage_info?.file_size_bytes || 0) / 1024).toFixed(1)} KB</div>
            {generatedVariants[selectedVariantIndex].storage_info?.brand_asset_id && (
              <div style={{ color: 'var(--app-success, #06D6A0)' }}><strong>BrandAsset ID:</strong> {generatedVariants[selectedVariantIndex].storage_info?.brand_asset_id}</div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
