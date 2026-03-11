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
import styles from './AssetGenConfigWidgets.module.css';

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
      <label className={`block fs-12 fw-600 ${styles.sectionLabel}`}>
        Input Bron
      </label>
      <div className="flex-row gap-8">
        {(['upload', 'previous'] as const).map((src) => (
          <button
            key={src}
            onClick={() => onSelect(src)}
            className={styles.sourceButton}
            data-selected={referenceSource === src}
          >
            {src === 'upload' ? 'Originele Upload' : 'Huidige AI Versie'}
          </button>
        ))}
      </div>
      <div className={`fs-11 mt-4 ${styles.mutedHint}`}>
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
    <div className={styles.backgroundSelector}>
      <label className={`block fs-12 fw-600 mb-8 ${styles.backgroundLabel}`}>
        Selecteer achtergrond
      </label>
      <div className="flex-row gap-8 flex-wrap">
        {backgrounds.map((bg, idx) => (
          <button
            key={bg.url}
            onClick={() => onSelect(idx)}
            className={styles.backgroundButton}
            data-selected={idx === selectedIdx}
          >
            <img
              src={bg.url}
              alt={bg.label || `Achtergrond ${idx + 1}`}
              className={styles.backgroundImage}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {idx === selectedIdx && (
              <div className={styles.checkmark}>OK</div>
            )}
          </button>
        ))}
      </div>
      {backgrounds[selectedIdx]?.label && (
        <div className={`fs-11 mt-4 ${styles.mutedHint}`}>
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
      <label className={`block fs-12 fw-600 ${styles.sectionLabel}`}>
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
            className={styles.modelButton}
            data-selected={selectedModel === opt.modelId}
          >
            <div className="fw-600 fs-11">{opt.label}</div>
            <div className={styles.modelDesc}>{opt.desc}</div>
            {opt.costLabel && (
              <div className={styles.modelCostLabel}>{opt.costLabel}</div>
            )}
          </button>
        ))}
      </div>
      {costStr && (
        <div className={styles.costEstimate}>
          Geschatte kosten: {costStr}
        </div>
      )}
    </div>
  );
}
