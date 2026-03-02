// =============================================================================
// AssetGenerationModal — Sub-components
// =============================================================================

import React from 'react';
import type { AssetTemplate } from '../../constants/assetTemplates';
import { getSecureMimeType } from './assetGenHelpers';

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
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '16px 12px',
        border: selected
          ? '2px solid var(--vscode-focusBorder, #007fd4)'
          : '1px solid var(--vscode-widget-border, #333)',
        borderRadius: 8,
        background: selected
          ? 'var(--vscode-list-activeSelectionBackground, #094771)'
          : 'var(--vscode-editor-background, #1e1e1e)',
        color: 'var(--vscode-foreground, #ccc)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        minWidth: 100,
      }}
    >
      <span style={{ fontSize: 28 }}>{template.icon}</span>
      <span className="fs-12 fw-600 text-center">{template.name}</span>
      <span
        className="text-center"
        style={{
          fontSize: 10,
          color: 'var(--vscode-descriptionForeground, #888)',
        }}
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
        className="block fs-12 fw-600 mb-4"
        style={{
          color: 'var(--vscode-foreground, #ccc)',
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 10px',
          fontSize: 13,
          background: 'var(--vscode-input-background, #3c3c3c)',
          color: 'var(--vscode-input-foreground, #ccc)',
          border: '1px solid var(--vscode-input-border, #3c3c3c)',
          borderRadius: 4,
          outline: 'none',
        }}
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
      style={{
        position: 'relative',
        border: selected
          ? '3px solid #10b981'
          : '1px solid var(--vscode-widget-border, #333)',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        padding: 0,
        background: 'transparent',
      }}
    >
      {mediaSrc ? (
        isVideoContent ? (
          <video
            src={mediaSrc}
            style={{
              width: '100%',
              aspectRatio: '9 / 16',
              objectFit: 'cover',
              display: 'block',
            }}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img
            src={mediaSrc}
            alt={`Variant ${variant.variant_index + 1}`}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              objectFit: 'contain',
              background: '#1a1a1a',
            }}
          />
        )
      ) : (
        <div
          className="w-full flex-center fs-12 p-8 text-center"
          style={{
            aspectRatio: isVideoContent ? '9 / 16' : '3 / 4',
            background: 'var(--vscode-input-background, #3c3c3c)',
            color: '#ef4444',
          }}
        >
          {variant.error || (isVideoContent ? 'Geen video' : 'Geen afbeelding')}
        </div>
      )}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            background: '#10b981',
            color: '#fff',
            width: 24,
            height: 24,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {'\u2713'}
        </div>
      )}
      {/* Video indicator */}
      {isVideoContent && mediaSrc && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 10,
          }}
        >
          {'\uD83C\uDFAC'} Video
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: '4px 8px',
          fontSize: 11,
          textAlign: 'center',
        }}
      >
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
      className="w-full overflow-hidden rounded-4"
      style={{
        height: 6,
        background: 'var(--vscode-progressBar-background, #333)',
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          background: 'var(--vscode-progressBar-background, #0078d4)',
          borderRadius: 3,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
}
