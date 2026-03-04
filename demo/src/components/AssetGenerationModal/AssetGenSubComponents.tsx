// =============================================================================
// AssetGenerationModal — Sub-components
// =============================================================================

import React from 'react';
import type { AssetTemplate } from '../../constants/assetTemplates';
import { getSecureMimeType } from './assetGenHelpers';
import styles from './AssetGenSubComponents.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// TemplateCard
// ─────────────────────────────────────────────────────────────────────────────

export function TemplateCard({
  template,
  selected,
  onClick,
}: {
  template: AssetTemplate;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={styles.templateCard}
      data-selected={selected}
    >
      <span className={styles.templateIcon}>{template.icon}</span>
      <span className="fs-12 fw-600 text-center">{template.name}</span>
      <span
        className={`text-center ${styles.templateCredits}`}
      >
        {template.creditsCost} credit{template.creditsCost > 1 ? 's' : ''} / variant
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ParameterSelect
// ─────────────────────────────────────────────────────────────────────────────

export function ParameterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}) {
  return (
    <div className="mb-12">
      <label
        className={`block fs-12 fw-600 mb-4 ${styles.parameterLabel}`}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.parameterSelect}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VariantCard
// ─────────────────────────────────────────────────────────────────────────────

export interface VariantData {
  variant_index: number;
  image_base64?: string | null;
  video_base64?: string | null;
  video_url?: string | null;
  presigned_url?: string | null;
  storage_path?: string | null;
  mime_type: string | null;
  error?: string | null;
}

export function VariantCard({
  variant,
  selected,
  onClick,
  isVideo = false,
}: {
  variant: VariantData;
  selected: boolean;
  onClick: () => void;
  isVideo?: boolean;
}) {
  let mediaSrc: string | undefined;
  // Determine if this is actually video content:
  // - explicit isVideo prop (from template outputType)
  // - video_base64 or video_url present (clear video signals)
  // - mime_type starts with 'video/'
  // NOTE: presigned_url is NOT a video signal — it's just a signed S3 URL for any file type
  const isVideoContent =
    isVideo ||
    !!variant.video_base64 ||
    !!variant.video_url ||
    (variant.mime_type?.startsWith('video/') ?? false);

  if (isVideoContent) {
    // Video: prefer video_url, then presigned_url (as fallback for video), then base64
    const videoUrl = variant.video_url || variant.presigned_url;
    if (videoUrl) {
      mediaSrc = videoUrl;
    } else if (variant.video_base64) {
      const mime = variant.mime_type || 'video/mp4';
      mediaSrc = `data:${mime};base64,${variant.video_base64}`;
    }
  } else if (variant.image_base64) {
    // Image from base64
    const mime = getSecureMimeType(variant.image_base64, variant.mime_type);
    mediaSrc = `data:${mime};base64,${variant.image_base64}`;
  } else if (variant.presigned_url) {
    // Image from presigned URL (no base64 available but S3 URL exists)
    mediaSrc = variant.presigned_url;
  }

  return (
    <button
      onClick={onClick}
      className={styles.variantCard}
      data-selected={selected}
    >
      {mediaSrc ? (
        isVideoContent ? (
          <video
            src={mediaSrc}
            className={styles.variantVideo}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img
            src={mediaSrc}
            alt={`Variant ${variant.variant_index + 1}`}
            className={styles.variantImage}
          />
        )
      ) : (
        <div
          className={`w-full flex-center fs-12 p-8 text-center ${styles.variantError}`}
          data-video={isVideoContent}
        >
          {variant.error || (isVideoContent ? 'Geen video' : 'Geen afbeelding')}
        </div>
      )}
      {selected && (
        <div className={styles.variantCheckmark}>
          {'\u2713'}
        </div>
      )}
      {/* Video indicator */}
      {isVideoContent && mediaSrc && (
        <div className={styles.videoIndicator}>
          {'\uD83C\uDFAC'} Video
        </div>
      )}
      <div className={styles.variantLabel}>
        Variant {variant.variant_index + 1}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProgressBar
// ─────────────────────────────────────────────────────────────────────────────

export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div
      className={`w-full overflow-hidden rounded-4 ${styles.progressBarTrack}`}
    >
      <div
        className={styles.progressBarFill}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
