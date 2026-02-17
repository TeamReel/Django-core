/**
 * Asset Processing Specifications
 *
 * Defines the target specs for each asset type when processing from "raw" to "lineup-ready".
 * Used by both the frontend (to display specs & badges) and referenced by the backend processor.
 */

// ── Processing States ────────────────────────────────────────────────────────

export type AssetProcessingState = 'raw' | 'processing' | 'cancelling' | 'cancelled' | 'processed' | 'failed';

// ── Asset Spec Definitions ───────────────────────────────────────────────────

export interface ImageProcessingSpec {
  type: 'image';
  /** Target width in pixels */
  width: number;
  /** Target height in pixels */
  height: number;
  /** Output format (always PNG for transparency support) */
  format: 'png';
  /** Whether background must be removed */
  bgRemoved: true;
  /** Aspect ratio label for display */
  aspectRatio: string;
}

export interface VideoProcessingSpec {
  type: 'video';
  /** Target width in pixels */
  width: number;
  /** Target height in pixels */
  height: number;
  /** Output format */
  format: 'mp4' | 'webm';
  /** Frames per second */
  fps: number;
  /** Whether background must be removed (chroma-key or AI) */
  bgRemoved: true;
  /** Max duration in seconds (null = keep original) */
  maxDuration: number | null;
  /** Video codec */
  codec: 'h264' | 'vp9';
  /** Aspect ratio label for display */
  aspectRatio: string;
}

export type ProcessingSpec = ImageProcessingSpec | VideoProcessingSpec;

// ── Target Specifications per Asset Type ─────────────────────────────────────

/**
 * Full body (In Tenue) — PNG, 9:16, transparent background
 * Used as: reveal scene, hold scene in lineup video
 */
export const FULLBODY_SPEC: ImageProcessingSpec = {
  type: 'image',
  width: 1080,
  height: 1920,
  format: 'png',
  bgRemoved: true,
  aspectRatio: '9:16',
};

/**
 * Close-up — PNG, 1:1 square, transparent background
 * Used as: positioned overlay in lineup video
 */
export const CLOSEUP_SPEC: ImageProcessingSpec = {
  type: 'image',
  width: 512,
  height: 512,
  format: 'png',
  bgRemoved: true,
  aspectRatio: '1:1',
};

/**
 * Short Intro video — WebM VP9, 9:16, transparent background via RVM
 * Used as: player intro segment in lineup video
 */
export const INTRO_SPEC: VideoProcessingSpec = {
  type: 'video',
  width: 1080,
  height: 1920,
  format: 'webm',
  fps: 30,
  bgRemoved: true,
  maxDuration: null, // keep original duration
  codec: 'vp9',
  aspectRatio: '9:16',
};

/**
 * Celebration video — WebM VP9, 9:16, transparent background via RVM
 * Used as: goal celebration segment
 */
export const CELEBRATION_SPEC: VideoProcessingSpec = {
  type: 'video',
  width: 1080,
  height: 1920,
  format: 'webm',
  fps: 30,
  bgRemoved: true,
  maxDuration: null,
  codec: 'vp9',
  aspectRatio: '9:16',
};

// ── Lookup Map ───────────────────────────────────────────────────────────────

export const ASSET_PROCESSING_SPECS: Record<string, ProcessingSpec> = {
  fullbody: FULLBODY_SPEC,
  closeup: CLOSEUP_SPEC,
  intro: INTRO_SPEC,
  celebration: CELEBRATION_SPEC,
} as const;

// ── Variant Value Interface ──────────────────────────────────────────────────

/**
 * New structured variant value — replaces plain URL string.
 *
 * Migration path:
 *   Old: images.fullbody.home = "s3://path/to/image.png"
 *   New: images.fullbody.home = { raw: "s3://...", processed: "s3://...", ... }
 *
 * Backward compat: if the value is a string, treat it as { raw: string }.
 */
export interface AssetVariantValue {
  /** Original AI-generated or uploaded file */
  raw: string;
  /** Lineup-ready processed file (null if not yet processed) */
  processed: string | null;
  /** Current processing state */
  processing_state: AssetProcessingState;
  /** Browser-playable preview URL (e.g. MP4 when processed is MOV) */
  preview_url?: string;
  /** Original processed file before browser conversion (e.g. ProRes MOV) */
  processed_source?: string;
  /** Actual specs of the processed file (set after processing) */
  specs?: {
    width?: number;
    height?: number;
    format?: string;
    bg_removed?: boolean;
    duration?: number;
    fps?: number;
  };
  /** Error message if processing failed */
  error?: string;
  /** ISO timestamp of last processing attempt */
  processed_at?: string;
}

// ── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Normalize a variant value from either old string format or new object format.
 */
export function normalizeVariantValue(value: string | AssetVariantValue | null | undefined): AssetVariantValue | null {
  if (!value) return null;

  // Old format: plain URL string → treat as raw
  if (typeof value === 'string') {
    return {
      raw: value,
      processed: null,
      processing_state: 'raw',
    };
  }

  // New format: already an object
  return value;
}

/**
 * Get the best available URL for display (prefers processed, falls back to raw).
 */
export function getBestUrl(value: string | AssetVariantValue | null | undefined): string | null {
  const normalized = normalizeVariantValue(value);
  if (!normalized) return null;
  // Prefer browser-playable preview (e.g. MP4) over processed (may be MOV)
  return normalized.preview_url || normalized.processed || normalized.raw || null;
}

/**
 * Get the lineup-ready URL (processed only, no fallback).
 */
export function getLineupReadyUrl(value: string | AssetVariantValue | null | undefined): string | null {
  const normalized = normalizeVariantValue(value);
  if (!normalized) return null;
  return normalized.processed || null;
}

/**
 * Check if an asset variant is lineup-ready.
 */
export function isLineupReady(value: string | AssetVariantValue | null | undefined): boolean {
  const normalized = normalizeVariantValue(value);
  if (!normalized) return false;
  return normalized.processing_state === 'processed' && !!normalized.processed;
}

/**
 * Check if an asset variant is currently being processed.
 */
export function isProcessing(value: string | AssetVariantValue | null | undefined): boolean {
  const normalized = normalizeVariantValue(value);
  if (!normalized) return false;
  return normalized.processing_state === 'processing' || normalized.processing_state === 'cancelling';
}

/**
 * Human-readable label for processing state.
 */
export function getProcessingStateLabel(state: AssetProcessingState | null | undefined): { label: string; color: string; icon: string } {
  switch (state) {
    case 'raw':
      return { label: 'Ruw', color: '#f59e0b', icon: '🔶' };
    case 'processing':
      return { label: 'Bezig...', color: '#3b82f6', icon: '⏳' };
    case 'cancelling':
      return { label: 'Annuleren...', color: '#3b82f6', icon: '⏹️' };
    case 'cancelled':
      return { label: 'Geannuleerd', color: '#f59e0b', icon: '⏹️' };
    case 'processed':
      return { label: 'Lineup-ready', color: '#10b981', icon: '✅' };
    case 'failed':
      return { label: 'Fout', color: '#ef4444', icon: '❌' };
    default:
      // null/undefined means no processing state yet - treat as raw
      return { label: 'Ruw', color: '#f59e0b', icon: '🔶' };
  }
}
