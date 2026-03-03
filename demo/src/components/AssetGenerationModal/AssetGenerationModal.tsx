/**
 * AssetGenerationModal — AI Asset Generation Wizard (thin shell)
 *
 * 3-step modal: select template → configure parameters → view results.
 * Logic lives in useAssetGenModal; sub-components in AssetGenSubComponents.
 */

import React from 'react';
import type { AssetGenerationModalProps } from './assetGenHelpers';
import {
  VIDEO_MODELS,
  IMAGE_MODELS,
  estimateCost,
  getPrimaryInputKey,
  COMPOSITE_TEMPLATE_IDS,
  SHOE_COLOR_OPTIONS,
} from './assetGenHelpers';
import {
  TemplateCard,
  ParameterSelect,
} from './AssetGenSubComponents';
import { useAssetGenModal } from './useAssetGenModal';
import { SourcePicker, BackgroundSelector, ModelSelector } from './AssetGenConfigWidgets';
import { ResultsStep } from './AssetGenResultsWidgets';

export type { SavedAssetInfo, AssetGenerationModalProps } from './assetGenHelpers';

export default function AssetGenerationModal(props: AssetGenerationModalProps) {
  const {
    modalStep,
    setModalStep,
    params,
    setParams,
    variantCount,
    setVariantCount,
    extraInstructions,
    setExtraInstructions,
    feedbackFields,
    setFeedbackFields,
    selectedVariantIdx,
    setSelectedVariantIdx,
    saving,
    referenceSource,
    setReferenceSource,
    shoeColor,
    setShoeColor,
    setVideoProvider,
    selectedModel,
    setSelectedModel,
    selectedBackgroundIdx,
    setSelectedBackgroundIdx,
    templates,
    selectedTemplate,
    generation,
    stepTitle,
    handleSelectTemplate,
    handleGenerate,
    handleAccept,
    handleRegenerate,
    handleClose,
    selectedTemplateId,
  } = useAssetGenModal(props);

  const { previousResultUrl, availableBackgrounds = [], requireApproval = false } = props;

  if (!props.isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 z-1000"
        style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      />

      {/* Modal */}
      <div
        className="fixed flex-col overflow-hidden z-1001 rounded-12"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '94vw',
          maxWidth: 800,
          maxHeight: '92vh',
          background: 'var(--vscode-editor-background, #1e1e1e)',
          border: '1px solid var(--vscode-widget-border, #333)',
        }}
      >
        {/* Header */}
        <div
          className="flex-between py-16 px-20"
          style={{
            borderBottom: '1px solid var(--vscode-widget-border, #333)',
          }}
        >
          <div>
            <h2 className="fs-16 fw-700 m-0">
              🎨 AI Asset Genereren
            </h2>
            <p className="fs-12 mt-4 m-0 text-muted">
              {stepTitle}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="bg-transparent border-none cursor-pointer fs-20 py-4 px-8"
            style={{ color: 'var(--vscode-foreground, #ccc)' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto py-16 px-20">
          {/* ── STEP 1: Template Selection ── */}
          {modalStep === 'template' && (
            <div className="grid gap-12" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={selectedTemplateId === t.id}
                  onClick={() => handleSelectTemplate(t.id)}
                />
              ))}
            </div>
          )}

          {/* ── STEP 2: Configure Parameters ── */}
          {modalStep === 'configure' && selectedTemplate && (
            <div>
              {/* Template info */}
              <div
                className="flex-row gap-12 py-12 px-16 rounded-8 mb-16"
                style={{
                  alignItems: 'center',
                  background: 'var(--vscode-editor-inactiveSelectionBackground, #2a2a2a)',
                }}
              >
                <span style={{ fontSize: 32 }}>{selectedTemplate.icon}</span>
                <div>
                  <div className="fw-600 fs-14">{selectedTemplate.name}</div>
                  <div className="fs-12 text-muted">
                    {selectedTemplate.description}
                  </div>
                </div>
              </div>

              {/* Source Selection */}
              {previousResultUrl && getPrimaryInputKey(selectedTemplate) && (
                <SourcePicker
                  referenceSource={referenceSource}
                  onSelect={setReferenceSource}
                />
              )}

              {/* Parameters */}
              {Object.entries(selectedTemplate.parameters).map(([key, param]) => {
                if (param.visibleIf) {
                  const dependencyValue = params[param.visibleIf.param];
                  if (param.visibleIf.includes) {
                    if (!param.visibleIf.includes.includes(dependencyValue)) return null;
                  } else if (param.visibleIf.excludes) {
                    if (param.visibleIf.excludes.includes(dependencyValue)) return null;
                  }
                }
                return (
                  <ParameterSelect
                    key={key}
                    label={param.label}
                    value={params[key] || param.default}
                    options={param.options}
                    onChange={(val) => setParams((prev) => ({ ...prev, [key]: val }))}
                  />
                );
              })}

              {/* Shoe color — only for fullbody_in_tenue */}
              {selectedTemplate.id === 'fullbody_in_tenue' && (
                <ParameterSelect
                  label="Voetbalschoenen kleur"
                  value={shoeColor}
                  options={SHOE_COLOR_OPTIONS}
                  onChange={setShoeColor}
                />
              )}

              {/* Background selector */}
              {COMPOSITE_TEMPLATE_IDS.includes(selectedTemplate.id) &&
                availableBackgrounds.length > 0 && (
                  <BackgroundSelector
                    backgrounds={availableBackgrounds}
                    selectedIdx={selectedBackgroundIdx}
                    onSelect={setSelectedBackgroundIdx}
                  />
                )}

              {/* Variant count */}
              <div className="mb-12">
                <label
                  className="block fs-12 fw-600"
                  style={{ marginBottom: 6, color: 'var(--vscode-foreground, #ccc)' }}
                >
                  Aantal varianten
                </label>
                <div className="flex-row gap-8">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setVariantCount(n)}
                      className="rounded-8 fs-16 fw-700 cursor-pointer"
                      style={{
                        width: 40,
                        height: 40,
                        border:
                          variantCount === n
                            ? '2px solid var(--vscode-focusBorder, #007fd4)'
                            : '1px solid var(--vscode-widget-border, #333)',
                        background:
                          variantCount === n
                            ? 'var(--vscode-list-activeSelectionBackground, #094771)'
                            : 'transparent',
                        color: 'var(--vscode-foreground, #ccc)',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="fs-11 text-muted mt-4">
                  Kosten: {variantCount * selectedTemplate.creditsCost} credits
                </div>
              </div>

              {/* AI Model Selector + Extra Instructions */}
              <div className="mb-16">
                <ModelSelector
                  isVideo={selectedTemplate.outputType === 'video'}
                  selectedModel={selectedModel}
                  variantCount={variantCount}
                  onSelectModel={(modelId, provider) => {
                    setSelectedModel(modelId);
                    if (provider !== undefined) setVideoProvider(provider);
                  }}
                />

                <label
                  className="block fs-12 fw-600 mb-4"
                  style={{ color: 'var(--vscode-foreground, #ccc)' }}
                >
                  Extra instructies (optioneel)
                </label>
                <textarea
                  value={extraInstructions}
                  onChange={(e) => setExtraInstructions(e.target.value)}
                  placeholder="Bijv. 'Gebruik felle kleuren', 'Geen strepen op mouwen', 'Witte sponsortekst'..."
                  className="w-full fs-13 rounded-4"
                  style={{
                    padding: '8px 10px',
                    background: 'var(--vscode-input-background, #3c3c3c)',
                    color: 'var(--vscode-input-foreground, #ccc)',
                    border: '1px solid var(--vscode-input-border, #3c3c3c)',
                    outline: 'none',
                    minHeight: 60,
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          )}

          {/* ── STEP 3: Results ── */}
          {modalStep === 'results' && (
            <ResultsStep
              generation={generation}
              selectedTemplate={selectedTemplate}
              selectedVariantIdx={selectedVariantIdx}
              setSelectedVariantIdx={setSelectedVariantIdx}
              feedbackFields={feedbackFields}
              setFeedbackFields={setFeedbackFields}
              requireApproval={requireApproval}
              handleRegenerate={handleRegenerate}
            />
          )}
        </div>

        {/* Footer */}
        <ModalFooter
          modalStep={modalStep}
          setModalStep={setModalStep}
          generation={generation}
          selectedTemplate={selectedTemplate}
          selectedVariantIdx={selectedVariantIdx}
          saving={saving}
          variantCount={variantCount}
          handleClose={handleClose}
          handleGenerate={handleGenerate}
          handleRegenerate={handleRegenerate}
          handleAccept={handleAccept}
        />
      </div>
    </>
  );
}

// =============================================================================
// ModalFooter — kept inline (tightly coupled to wizard step transitions)
// =============================================================================

function ModalFooter({
  modalStep,
  setModalStep,
  generation,
  selectedTemplate,
  selectedVariantIdx,
  saving,
  variantCount,
  handleClose,
  handleGenerate,
  handleRegenerate,
  handleAccept,
}: {
  modalStep: string;
  setModalStep: (s: any) => void;
  generation: any;
  selectedTemplate: any;
  selectedVariantIdx: number | null;
  saving: boolean;
  variantCount: number;
  handleClose: () => void;
  handleGenerate: () => void;
  handleRegenerate: () => void;
  handleAccept: () => void;
}) {
  return (
    <div className="flex-between border-top py-12 px-20">
      <div>
        {modalStep !== 'template' &&
          generation.step !== 'submitting' &&
          generation.step !== 'polling' &&
          generation.step !== 'queued' && (
            <button
              onClick={() => {
                if (modalStep === 'configure') setModalStep('template');
                else if (modalStep === 'results') handleRegenerate();
              }}
              className="fs-12 bg-transparent rounded-4 cursor-pointer"
              style={{
                padding: '6px 14px',
                color: 'var(--vscode-foreground, #ccc)',
                border: '1px solid var(--vscode-widget-border, #333)',
              }}
            >
              \u2190 Terug
            </button>
          )}
      </div>

      <div className="flex-row gap-8">
        <button
          onClick={handleClose}
          className="fs-12 rounded-4 cursor-pointer"
          style={{
            padding: '6px 14px',
            background:
              generation.step === 'queued'
                ? 'var(--vscode-button-background, #0078d4)'
                : 'transparent',
            color:
              generation.step === 'queued'
                ? 'var(--vscode-button-foreground, #fff)'
                : 'var(--vscode-foreground, #ccc)',
            border:
              generation.step === 'queued'
                ? 'none'
                : '1px solid var(--vscode-widget-border, #333)',
            fontWeight: generation.step === 'queued' ? 600 : 400,
          }}
        >
          {generation.step === 'queued' ? '✓ Sluiten' : 'Annuleren'}
        </button>

        {modalStep === 'configure' && (
          <button
            onClick={handleGenerate}
            disabled={!selectedTemplate}
            className="fs-12 fw-600 rounded-4 border-none"
            style={{
              padding: '6px 16px',
              background: 'var(--vscode-button-background, #0078d4)',
              color: 'var(--vscode-button-foreground, #fff)',
              cursor: selectedTemplate ? 'pointer' : 'not-allowed',
              opacity: selectedTemplate ? 1 : 0.5,
            }}
          >
            🍌 Genereren ({variantCount} variant
            {variantCount > 1 ? 'en' : ''})
          </button>
        )}

        {modalStep === 'results' && generation.step === 'completed' && (
          <>
            <button
              onClick={handleRegenerate}
              className="fs-12 bg-transparent rounded-4 cursor-pointer"
              style={{
                padding: '6px 14px',
                color: 'var(--vscode-foreground, #ccc)',
                border: '1px solid var(--vscode-widget-border, #333)',
              }}
            >
              🔄 Opnieuw
            </button>
            <button
              onClick={handleAccept}
              disabled={selectedVariantIdx === null || saving}
              className="fs-12 fw-600 rounded-4 border-none text-white"
              style={{
                padding: '6px 16px',
                background:
                  selectedVariantIdx !== null
                    ? 'var(--color-green-400)'
                    : 'var(--vscode-disabledForeground, #555)',
                cursor: selectedVariantIdx !== null ? 'pointer' : 'not-allowed',
                opacity: selectedVariantIdx !== null ? 1 : 0.5,
              }}
            >
              {saving ? 'Opslaan...' : '💾 Opslaan als asset'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
