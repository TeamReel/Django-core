/**
 * Types & constants for the asset-generation hook.
 *
 * Extracted so the hook file stays focused on runtime logic.
 */
import type { ContentTypeName } from './useContentTypes';

// ============================================================================
// Types
// ============================================================================

export interface GenerationVariant {
  variant_index: number;
  image_base64: string | null;
  video_base64?: string | null;
  video_url?: string | null;
  file_asset_id?: string | null;
  mime_type: string | null;
  filename: string | null;
  error?: string | null;
  metadata?: Record<string, unknown>;
  presigned_url?: string | null;
  storage_path?: string | null;
  storage_info?: {
    storage_backend: string;
    storage_path: string;
    original_name: string;
    file_size_bytes: number;
    file_size_kb: number;
    mime_type: string;
    created_at: string;
  } | null;
}

export type GenerationStep = 'idle' | 'submitting' | 'polling' | 'queued' | 'completed' | 'error';

/** Data returned from the /save/ endpoint after accepting a variant */
export interface SaveResult {
  file_asset_id?: string;
  brand_asset_id?: string;
  storage_path?: string;
  presigned_url?: string;
  asset_type?: string;
}

export interface UseAssetGenerationReturn {
  /** Current step in the generation flow */
  step: GenerationStep;
  /** Generated variant images */
  variants: GenerationVariant[];
  /** Error message if failed */
  error: string | null;
  /** Submit a generation request */
  submit: (params: SubmitParams) => Promise<void>;
  /** Accept a variant (save image to brand profile). Returns save response data or null on failure. */
  acceptVariant: (variantIndex: number) => Promise<SaveResult | null>;
  /** Reset to idle state */
  reset: () => void;
  /** Progress percentage (0-100) for display */
  progress: number;
  /** task_id for async (video) jobs in queued state */
  queuedTaskId: string | null;
}

export interface SubmitParams {
  templateId: string;
  parameters: Record<string, string>;
  variantCount: number;
  projectId: string | number;
  organisationId: string;
  /** Brand asset type to save the result as */
  outputAssetType?: string;
  /** Membership ID for member-scoped S3 storage */
  membershipId?: string;
  /** Input images as URLs (fetched from brand profile S3) */
  inputImageUrls?: Record<string, string>;
  /** Input images as base64 strings (if already loaded) */
  inputImages?: Record<string, string>;
  /** Optional user instruction text */
  userPrompt?: string;
  /** Explicit video provider (minimax, runway, veo). If omitted, auto-selects. */
  provider?: string;
  /** Explicit model ID (e.g. gen4_turbo, video-01). If omitted, uses provider default. */
  model?: string;
  /** Workflow: content type model name for auto-creating workflow instance */
  workflowContentType?: ContentTypeName;
  /** Workflow: the object ID that the workflow attaches to (e.g. match ID) */
  workflowObjectId?: number;
  /** Workflow: template ID to use when auto-creating workflow instance */
  workflowTemplateId?: number;
  /** Route through approval queue instead of auto-saving */
  requireApproval?: boolean;
  /** Display label for multi-instance types (e.g. club backgrounds) */
  label?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Milliseconds between status polls for async (video) generation. */
export const VIDEO_POLL_INTERVAL_MS = 5_000;

/** Maximum number of polls (~12.5 min max wait). */
export const VIDEO_MAX_POLLS = 150;
