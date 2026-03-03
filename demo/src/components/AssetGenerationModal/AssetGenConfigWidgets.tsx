/**
 * AssetGenConfigWidgets — step-2 (configure) sub-components.
 *
 * - SourcePicker: choose upload vs previous AI result as input
 * - BackgroundSelector: thumbnail grid for background selection
 * - ModelSelector: AI model picker (image or video) with cost estimate
 */
import React from 'react';
import {
  VIDEO_MODELS,
  IMAGE_MODELS,
  estimateCost,
} from './assetGenHelpers';

// ── Source Picker ────────────────────────────────────────────────────

export function SourcePicker({
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

// ── Background Selector ──────────────────────────────────────────────

export function BackgroundSelector({
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
                  background: 'var(--color-green-400)',
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

// ── Model Selector ───────────────────────────────────────────────────

export function ModelSelector({
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
