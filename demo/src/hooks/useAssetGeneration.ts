/**
 * useAssetGeneration Hook
 *
 * Manages the AI asset generation flow:
 * 1. Submit generation request (template + params + input image URLs)
 * 2. For images: wait for synchronous response (30-90s per variant)
 *    For videos: receive task_id (202) then poll /status/ until complete
 * 3. Display variants for selection
 *
 * Integrates with backend: POST /api/v1/generative/assets/generate/
 */

import { useState, useCallback, useRef } from 'react';
import { getApiBaseUrl } from '../utils/apiBase';

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

type GenerationStep = 'idle' | 'submitting' | 'polling' | 'completed' | 'error';

/** Data returned from the /save/ endpoint after accepting a variant */
export interface SaveResult {
  file_asset_id?: string;
  brand_asset_id?: string;
  storage_path?: string;
  asset_type?: string;
}

interface UseAssetGenerationReturn {
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
}

// ============================================================================
// Constants
// ============================================================================

const VIDEO_POLL_INTERVAL_MS = 5_000; // 5 seconds between polls
const VIDEO_MAX_POLLS = 150; // ~12.5 min max wait

// ============================================================================
// Hook
// ============================================================================

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

export function useAssetGeneration(): UseAssetGenerationReturn {
  const [step, setStep] = useState<GenerationStep>('idle');
  const [variants, setVariants] = useState<GenerationVariant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Store context for saving
  const [context, setContext] = useState<{
    projectId: string | number;
    organisationId: string;
    outputAssetType?: string;
  } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const apiBase = getApiBaseUrl();

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStep('idle');
    setVariants([]);
    setError(null);
    setProgress(0);
    setContext(null);
  }, []);

  // ── Poll for async video generation result ─────────────────────────
  const pollForResult = useCallback(
    async (taskId: string, signal: AbortSignal): Promise<GenerationVariant[]> => {
      for (let i = 0; i < VIDEO_MAX_POLLS; i++) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        await new Promise((r) => setTimeout(r, VIDEO_POLL_INTERVAL_MS));

        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const res = await fetch(
          `${apiBase}/api/v1/generative/assets/generate/${taskId}/status/`,
          { signal, credentials: 'include' }
        );

        if (res.status === 404) {
          throw new Error('Generatie taak verlopen of niet gevonden');
        }
        if (!res.ok) {
          throw new Error(`Status check mislukt: HTTP ${res.status}`);
        }

        const data = await res.json();

        if (data.status === 'completed') {
          const responseData = data.data || {};
          return (responseData.variants || []).map((v: GenerationVariant) => ({
            variant_index: v.variant_index,
            image_base64: v.image_base64 ?? null,
            video_base64: v.video_base64 ?? null,
            video_url: v.video_url ?? null,
            file_asset_id: v.file_asset_id ?? null,
            mime_type: v.mime_type ?? null,
            filename: v.filename ?? null,
            error: v.error ?? null,
            metadata: v.metadata,
            presigned_url: v.presigned_url ?? null,
            storage_path: v.storage_path ?? null,
            storage_info: v.storage_info ?? null,
          }));
        }

        if (data.status === 'failed') {
          throw new Error(data.error || 'Video generatie mislukt');
        }

        // Still processing — update progress from server
        if (typeof data.progress === 'number') {
          setProgress(Math.min(data.progress, 95));
        }
      }

      throw new Error('Video generatie timeout (te lang gewacht)');
    },
    [apiBase]
  );

  // ── Submit generation request ──────────────────────────────────────
  const submit = useCallback(
    async (params: SubmitParams) => {
      // Abort any previous request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStep('submitting');
      setError(null);
      setProgress(10);
      setVariants([]);

      // Store context for later saving
      const saveContext = {
        projectId: params.projectId,
        organisationId: params.organisationId,
        outputAssetType: params.outputAssetType
      };
      console.log('📝 Storing context for save:', saveContext);

      setContext(saveContext);

      // Simulate progress while waiting (images take 30-90s)
      const progressTimer = setInterval(() => {
        setProgress((prev) => Math.min(prev + 1, 90));
      }, 3000);

      try {
        // Inject user instruction into params if present
        const finalParams = { ...params.parameters };
        if (params.userPrompt) {
            finalParams['user_instruction'] = params.userPrompt;
        }

        const res = await fetch(`${apiBase}/api/v1/generative/assets/generate/`, {
          method: 'POST',
          signal: controller.signal,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          body: JSON.stringify({
            template_id: params.templateId,
            params: finalParams,
            variant_count: params.variantCount,
            input_images: params.inputImages || {},
            input_image_urls: params.inputImageUrls || {},
            ...(params.organisationId ? { organisation_id: params.organisationId } : {}),
            ...(params.membershipId ? { membership_id: params.membershipId } : {}),
          }),
        });

        clearInterval(progressTimer);

        // ── Async path: video generation returns 202 + task_id ───────
        if (res.status === 202) {
          const asyncData = await res.json();
          const taskId = asyncData.task_id;
          if (!taskId) throw new Error('Backend returned 202 but no task_id');

          console.log(`🎬 Video generation started async. task_id=${taskId}`);
          setStep('polling');
          setProgress(15);

          const polledVariants = await pollForResult(taskId, controller.signal);
          console.log(`🎬 Video generation complete: ${polledVariants.length} variant(s)`);
          setVariants(polledVariants);
          setStep('completed');
          setProgress(100);
          return;
        }

        // ── Sync path: image generation returns 200 ─────────────────
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson?.error || errJson?.detail || `Fout: ${res.status}`);
        }

        const json = await res.json();

        // Handle standardized API response format { status: "success", data: { variants: [] } }
        const responseData = json.data || json;
        const variantsList = responseData.variants || [];

        // Map response variants
        const generatedVariants: GenerationVariant[] = variantsList.map(
          (v: GenerationVariant) => ({
            variant_index: v.variant_index,
            image_base64: v.image_base64,
            video_base64: v.video_base64,
            video_url: v.video_url,
            file_asset_id: v.file_asset_id,
            mime_type: v.mime_type,
            filename: v.filename,
            error: v.error,
            metadata: v.metadata,
            presigned_url: v.presigned_url,
            storage_path: v.storage_path,
            storage_info: v.storage_info,
          })
        );

        console.log(`Parsed ${generatedVariants.length} variants from response`);

        setVariants(generatedVariants);
        setStep('completed');
        setProgress(100);
      } catch (err) {
        clearInterval(progressTimer);
        if ((err as Error).name === 'AbortError') return; // Cancelled by user
        setError(err instanceof Error ? err.message : 'Generatie mislukt');
        setStep('error');
      }
    },
    [apiBase, pollForResult]
  );

  const acceptVariant = useCallback(
    async (variantIndex: number): Promise<SaveResult | null> => {
      const selectedVariant = variants.find(v => v.variant_index === variantIndex);
      if (!selectedVariant) {
        console.error('Selected variant not found');
        return null;
      }

      // Use stored context or fall back defaults if missing (should not happen if flow followed)
      const orgId = context?.organisationId;
      const projId = context?.projectId;
      const assetType = context?.outputAssetType;

      console.log('💾 Accepting variant:', {
        variantIndex,
        context,
        orgId,
        assetType,
        hasImage: !!selectedVariant.image_base64,
        hasVideo: !!selectedVariant.video_url,
        storagePath: selectedVariant.storage_path || selectedVariant.storage_info?.storage_path,
      });

      if (!orgId) {
         console.error('Missing organisation context for saving asset');
         return null;
      }

      try {
        const isVideo = selectedVariant.mime_type?.startsWith('video/') ||
            !!selectedVariant.video_url || !!selectedVariant.video_base64;

        const response = await fetch(`${apiBase}/api/v1/generative/assets/save/`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          body: JSON.stringify({
            storage_path: selectedVariant.storage_path || selectedVariant.storage_info?.storage_path,
            presigned_url: selectedVariant.presigned_url,
            video_url: selectedVariant.video_url,
            image_base64: selectedVariant.image_base64,
            video_base64: selectedVariant.video_base64,
            filename: selectedVariant.filename,
            mime_type: selectedVariant.mime_type || (isVideo ? 'video/mp4' : 'image/png'),
            file_size_bytes: selectedVariant.storage_info?.file_size_bytes || 0,
            organisation_id: orgId,
            project_id: projId,
            asset_type: assetType,
          }),
        });

        if (!response.ok) {
           const errText = await response.text();
           console.error('Failed to save asset (raw):', errText);
           let errData = {};
           try {
             errData = JSON.parse(errText);
           } catch (e) {
             // ignore
           }
           console.error('Failed to save asset (json):', errData);
           // @ts-ignore
           throw new Error(errData?.error || 'Failed to save asset');
        }

        // Parse save response to get authoritative storage_path
        const saveJson = await response.json();
        const saveData = saveJson?.data?.data || saveJson?.data || saveJson;
        console.log('💾 Save response:', saveData);
        return {
          file_asset_id: saveData?.file_asset_id,
          brand_asset_id: saveData?.brand_asset_id,
          storage_path: saveData?.storage_path,
          asset_type: saveData?.asset_type,
        };
      } catch (e) {
        console.error('Error saving asset:', e);
        setError(e instanceof Error ? e.message : 'Opslaan mislukt');
        return null;
      }
    },
    [apiBase, variants, context]
  );

  return {
    step,
    variants,
    error,
    submit,
    acceptVariant,
    reset,
    progress,
  };
}

export default useAssetGeneration;
