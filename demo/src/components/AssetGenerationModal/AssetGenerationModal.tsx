/**
 * AssetGenerationModal — AI Asset Generation Wizard (thin shell)
 *
 * 3-step modal: select template → configure parameters → view results.
 * Logic lives in useAssetGenModal; sub-components in AssetGenSubComponents.
 */

import React from 'react';
import { Button } from '@django-core/design-system';
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
  VariantCard,
  ProgressBar,
} from './AssetGenSubComponents';
import { useAssetGenModal } from './useAssetGenModal';

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
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '94vw',
          maxWidth: 800,
          maxHeight: '92vh',
          background: 'var(--vscode-editor-background, #1e1e1e)',
          border: '1px solid var(--vscode-widget-border, #333)',
          borderRadius: 12,
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex-between"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--vscode-widget-border, #333)',
          }}
        >
          <div>
            <h2 className="fs-16 fw-700" style={{ margin: 0 }}>
              🎨 AI Asset Genereren
            </h2>
            <p
              style={{
                fontSize: 12,
                color: 'var(--vscode-descriptionForeground, #888)',
                margin: '4px 0 0',
              }}
            >
              {stepTitle}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--vscode-foreground, #ccc)',
              fontSize: 20,
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto" style={{ padding: '16px 20px' }}>
          {/* ── STEP 1: Template Selection ── */}
          {modalStep === 'template' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 12,
              }}
            >
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
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--vscode-descriptionForeground, #888)',
                    }}
                  >
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
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        border:
                          variantCount === n
                            ? '2px solid var(--vscode-focusBorder, #007fd4)'
                            : '1px solid var(--vscode-widget-border, #333)',
                        background:
                          variantCount === n
                            ? 'var(--vscode-list-activeSelectionBackground, #094771)'
                            : 'transparent',
                        color: 'var(--vscode-foreground, #ccc)',
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--vscode-descriptionForeground, #888)',
                    marginTop: 4,
                  }}
                >
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
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: 13,
                    background: 'var(--vscode-input-background, #3c3c3c)',
                    color: 'var(--vscode-input-foreground, #ccc)',
                    border: '1px solid var(--vscode-input-border, #3c3c3c)',
                    borderRadius: 4,
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
// Inline sub-sections (kept in this file to avoid over-splitting)
// =============================================================================

function SourcePicker({
  referenceSource,
  onSelect,
}: {
  referenceSource: 'upload' | 'previous';
  onSelect: (v: 'upload' | 'previous') => void;
}) {
  return (
    <div className="mb-16">
      <label
        className="block fs-12 fw-600"
        style={{ marginBottom: 6, color: 'var(--vscode-foreground, #ccc)' }}
      >
        Input Bron
      </label>
      <div className="flex-row gap-8">
        {(['upload', 'previous'] as const).map((src) => (
          <button
            key={src}
            onClick={() => onSelect(src)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border:
                referenceSource === src
                  ? '2px solid var(--vscode-focusBorder, #007fd4)'
                  : '1px solid var(--vscode-widget-border, #333)',
              background:
                referenceSource === src
                  ? 'var(--vscode-list-activeSelectionBackground, #094771)'
                  : 'transparent',
              color: 'var(--vscode-foreground, #ccc)',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            {src === 'upload' ? '📤 Originele Upload' : '🎨 Huidige AI Versie'}
          </button>
        ))}
      </div>
      <div className="fs-11 mt-4" style={{ color: '#888' }}>
        {referenceSource === 'upload'
          ? 'Gebruikt de origineel ge\u00fcploade afbeelding als basis.'
          : 'Gebruikt het huidige AI resultaat als basis voor verdere aanpassingen.'}
      </div>
    </div>
  );
}

function BackgroundSelector({
  backgrounds,
  selectedIdx,
  onSelect,
}: {
  backgrounds: Array<{ url: string; label?: string }>;
  selectedIdx: number;
  onSelect: (idx: number) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        className="block fs-12 fw-600 mb-8"
        style={{ color: 'var(--vscode-foreground, #ccc)' }}
      >
        Selecteer achtergrond
      </label>
      <div className="flex-row gap-8 flex-wrap">
        {backgrounds.map((bg, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            style={{
              position: 'relative',
              width: '80px',
              height: '80px',
              padding: 0,
              border:
                idx === selectedIdx
                  ? '3px solid #10b981'
                  : '2px solid var(--vscode-widget-border, #333)',
              borderRadius: 8,
              overflow: 'hidden',
              cursor: 'pointer',
              background: '#1a1a1a',
            }}
          >
            <img
              src={bg.url}
              alt={bg.label || `Achtergrond ${idx + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {idx === selectedIdx && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  background: '#10b981',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                }}
              >
                ✓
              </div>
            )}
          </button>
        ))}
      </div>
      {backgrounds[selectedIdx]?.label && (
        <div className="fs-11 mt-4" style={{ color: '#888' }}>
          {backgrounds[selectedIdx].label}
        </div>
      )}
    </div>
  );
}

function ModelSelector({
  isVideo,
  selectedModel,
  variantCount,
  onSelectModel,
}: {
  isVideo: boolean;
  selectedModel: string;
  variantCount: number;
  onSelectModel: (modelId: string, provider?: string) => void;
}) {
  const models = isVideo ? VIDEO_MODELS : IMAGE_MODELS;
  const costStr = estimateCost(isVideo, selectedModel, variantCount);

  return (
    <div className="mb-16">
      <label
        className="block fs-12 fw-600"
        style={{ marginBottom: 6, color: 'var(--vscode-foreground, #ccc)' }}
      >
        {isVideo ? 'Video Model' : 'Image Model'}
      </label>
      <div className="flex-row gap-6 flex-wrap">
        {models.map((opt) => (
          <button
            key={opt.modelId}
            onClick={() => {
              if (isVideo) {
                const vm = opt as (typeof VIDEO_MODELS)[0];
                onSelectModel(vm.modelId, vm.provider);
              } else {
                onSelectModel(opt.modelId);
              }
            }}
            style={{
              flex: '1 1 auto',
              minWidth: 80,
              padding: '6px 8px',
              border:
                selectedModel === opt.modelId
                  ? '2px solid var(--vscode-focusBorder, #007fd4)'
                  : '1px solid var(--vscode-widget-border, #333)',
              background:
                selectedModel === opt.modelId
                  ? 'var(--vscode-list-activeSelectionBackground, #094771)'
                  : 'transparent',
              color: 'var(--vscode-foreground, #ccc)',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 11,
              textAlign: 'center',
            }}
          >
            <div className="fw-600 fs-11">{opt.label}</div>
            <div
              style={{
                fontSize: 9,
                color: 'var(--vscode-descriptionForeground, #888)',
                marginTop: 1,
              }}
            >
              {opt.desc}
            </div>
            {opt.costLabel && (
              <div
                style={{
                  fontSize: 9,
                  color: 'var(--vscode-charts-green, #4ec)',
                  marginTop: 1,
                }}
              >
                {opt.costLabel}
              </div>
            )}
          </button>
        ))}
      </div>
      {costStr && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--vscode-charts-green, #4ec)',
            marginTop: 4,
            fontWeight: 600,
          }}
        >
          Geschatte kosten: {costStr}
        </div>
      )}
    </div>
  );
}

function ResultsStep({
  generation,
  selectedTemplate,
  selectedVariantIdx,
  setSelectedVariantIdx,
  feedbackFields,
  setFeedbackFields,
  requireApproval,
  handleRegenerate,
}: {
  generation: any;
  selectedTemplate: any;
  selectedVariantIdx: number | null;
  setSelectedVariantIdx: (idx: number) => void;
  feedbackFields: any;
  setFeedbackFields: any;
  requireApproval: boolean;
  handleRegenerate: () => void;
}) {
  return (
    <div>
      {/* Submitting */}
      {generation.step === 'submitting' && (
        <div className="text-center" style={{ padding: '40px 0' }}>
          <div className="mb-16" style={{ fontSize: 48 }}>
            {selectedTemplate?.outputType === 'video' ? '🎬' : '🎨'}
          </div>
          <div className="fs-14 fw-600 mb-8">
            {selectedTemplate?.outputType === 'video'
              ? 'Video aanmelden...'
              : 'Afbeelding aanmelden...'}
          </div>
          <ProgressBar progress={generation.progress} />
          <div
            style={{
              fontSize: 12,
              color: 'var(--vscode-descriptionForeground, #888)',
              marginTop: 8,
            }}
          >
            Wordt toegevoegd aan de AI wachtrij...
          </div>
        </div>
      )}

      {/* Polling */}
      {generation.step === 'polling' && (
        <div className="text-center" style={{ padding: '40px 0' }}>
          <div className="mb-16" style={{ fontSize: 48 }}>🎬</div>
          <div className="fs-14 fw-600 mb-8">Video wordt gegenereerd...</div>
          <ProgressBar progress={generation.progress} />
          <div
            style={{
              fontSize: 12,
              color: 'var(--vscode-descriptionForeground, #888)',
              marginTop: 8,
              maxWidth: 320,
              margin: '8px auto 0',
            }}
          >
            Dit duurt 2\u20135 minuten. Je kunt dit venster open laten \u2014 het resultaat
            verschijnt automatisch.
          </div>
        </div>
      )}

      {/* Queued */}
      {generation.step === 'queued' && (
        <div className="text-center" style={{ padding: '40px 0' }}>
          <div className="mb-16" style={{ fontSize: 64 }}>🟢</div>
          <div className="fs-16 fw-700 mb-8">
            {requireApproval ? 'In Approvals Wachtrij!' : 'Toegevoegd aan de AI Queue!'}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--vscode-descriptionForeground, #888)',
              marginBottom: 24,
              maxWidth: 320,
              margin: '0 auto 24px',
            }}
          >
            {requireApproval
              ? 'Keur de gegenereerde afbeelding goed via de Approvals pagina, daarna verschijnt deze automatisch op deze pagina.'
              : selectedTemplate?.outputType === 'video'
                ? 'De video wordt op de achtergrond gegenereerd (2\u20135 min). Je krijgt een melding zodra hij klaar is.'
                : 'De afbeelding wordt op de achtergrond gegenereerd. Je krijgt een melding zodra hij klaar is.'}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: 'var(--vscode-editorWidget-background, #252526)',
              border: '1px solid var(--vscode-widget-border, #333)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--vscode-descriptionForeground, #888)',
            }}
          >
            <span>📥</span>
            <span>{requireApproval ? 'Keur goed via' : 'Volg de voortgang in'}</span>
            <a
              href={requireApproval ? '/approvals' : '/approvals?tab=ai_queue'}
              style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}
            >
              {requireApproval ? 'Approvals' : 'Workflow \u2192 AI Queue'}
            </a>
          </div>
        </div>
      )}

      {/* Error */}
      {generation.step === 'error' && (
        <div
          className="text-center"
          style={{ padding: '40px 0', color: 'var(--vscode-errorForeground, #f44)' }}
        >
          <div className="mb-16" style={{ fontSize: 48 }}>❌</div>
          <div className="fs-14 fw-600 mb-8">Generatie mislukt</div>
          <div className="fs-12 mb-16">{generation.error}</div>
          <Button onClick={handleRegenerate}>Opnieuw proberen</Button>
        </div>
      )}

      {/* Completed */}
      {generation.step === 'completed' && generation.variants.length > 0 && (
        <div>
          <div className="fs-13 fw-600 mb-12">Kies de beste variant:</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                generation.variants.length === 1
                  ? '1fr'
                  : `repeat(${Math.min(generation.variants.length, 2)}, 1fr)`,
              gap: 12,
              alignItems: 'start',
            }}
          >
            {generation.variants.map((v: any) => {
              const fullSrc =
                v.presigned_url ||
                (v.image_base64
                  ? `data:${v.mime_type || 'image/png'};base64,${v.image_base64}`
                  : null);
              return (
                <div key={v.variant_index}>
                  <VariantCard
                    variant={v}
                    selected={selectedVariantIdx === v.variant_index}
                    onClick={() => setSelectedVariantIdx(v.variant_index)}
                    isVideo={selectedTemplate?.outputType === 'video'}
                  />
                  {fullSrc && selectedTemplate?.outputType !== 'video' && (
                    <a
                      href={fullSrc}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'block',
                        marginTop: 4,
                        textAlign: 'center',
                        fontSize: 11,
                        color: 'var(--vscode-textLink-foreground, #60a5fa)',
                        textDecoration: 'none',
                        opacity: 0.8,
                      }}
                    >
                      🔍 Volledig bekijken
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* Feedback / Refine */}
          {selectedTemplate?.outputType !== 'video' && (
            <FeedbackRefinement
              feedbackFields={feedbackFields}
              setFeedbackFields={setFeedbackFields}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FeedbackRefinement({
  feedbackFields,
  setFeedbackFields,
}: {
  feedbackFields: any;
  setFeedbackFields: any;
}) {
  const fields = [
    { id: 'colors', label: 'Kleuren (Vb: "Rood zoals V1")' },
    { id: 'pattern', label: 'Patroon (Vb: "Strepen zoals V2")' },
    { id: 'logo', label: 'Logo/Sponsor' },
    { id: 'collar', label: 'Kraag/Mouwen' },
  ];
  return (
    <div
      style={{
        marginTop: 20,
        borderTop: '1px solid var(--vscode-widget-border, #333)',
        paddingTop: 16,
      }}
    >
      <div className="fs-13 fw-600 mb-12">Combineer & Verbeter Varianten:</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {fields.map((field) => (
          <div key={field.id}>
            <label
              className="block fs-11 mb-4"
              style={{ color: 'var(--vscode-descriptionForeground, #888)' }}
            >
              {field.label}
            </label>
            <input
              type="text"
              value={feedbackFields[field.id]}
              onChange={(e) =>
                setFeedbackFields((prev: any) => ({ ...prev, [field.id]: e.target.value }))
              }
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 12,
                background: 'var(--vscode-input-background, #3c3c3c)',
                color: 'var(--vscode-input-foreground, #ccc)',
                border: '1px solid var(--vscode-input-border, #3c3c3c)',
                borderRadius: 4,
                outline: 'none',
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-12">
        <label
          className="block fs-11 mb-4"
          style={{ color: 'var(--vscode-descriptionForeground, #888)' }}
        >
          Overig / Specifiek
        </label>
        <input
          type="text"
          value={feedbackFields.other}
          onChange={(e) =>
            setFeedbackFields((prev: any) => ({ ...prev, other: e.target.value }))
          }
          placeholder="Bijv. 'Sokken wit', 'Meer contrast in foto'..."
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: 12,
            background: 'var(--vscode-input-background, #3c3c3c)',
            color: 'var(--vscode-input-foreground, #ccc)',
            border: '1px solid var(--vscode-input-border, #3c3c3c)',
            borderRadius: 4,
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
}

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
    <div className="flex-between border-top" style={{ padding: '12px 20px' }}>
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
              style={{
                padding: '6px 14px',
                fontSize: 12,
                background: 'transparent',
                color: 'var(--vscode-foreground, #ccc)',
                border: '1px solid var(--vscode-widget-border, #333)',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              \u2190 Terug
            </button>
          )}
      </div>

      <div className="flex-row gap-8">
        <button
          onClick={handleClose}
          style={{
            padding: '6px 14px',
            fontSize: 12,
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
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: generation.step === 'queued' ? 600 : 400,
          }}
        >
          {generation.step === 'queued' ? '✓ Sluiten' : 'Annuleren'}
        </button>

        {modalStep === 'configure' && (
          <button
            onClick={handleGenerate}
            disabled={!selectedTemplate}
            style={{
              padding: '6px 16px',
              fontSize: 12,
              fontWeight: 600,
              background: 'var(--vscode-button-background, #0078d4)',
              color: 'var(--vscode-button-foreground, #fff)',
              border: 'none',
              borderRadius: 4,
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
              style={{
                padding: '6px 14px',
                fontSize: 12,
                background: 'transparent',
                color: 'var(--vscode-foreground, #ccc)',
                border: '1px solid var(--vscode-widget-border, #333)',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              🔄 Opnieuw
            </button>
            <button
              onClick={handleAccept}
              disabled={selectedVariantIdx === null || saving}
              style={{
                padding: '6px 16px',
                fontSize: 12,
                fontWeight: 600,
                background:
                  selectedVariantIdx !== null
                    ? '#10b981'
                    : 'var(--vscode-disabledForeground, #555)',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
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
