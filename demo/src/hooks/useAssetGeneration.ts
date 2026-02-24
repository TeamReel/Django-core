/**
 * useAssetGeneration Hook
 *
 * Manages the AI asset generation flow:
 * 1. Submit generation request (template + params + input image URLs)
 * 2. All requests (images + videos) go through the Celery ai_generation queue
 *    → Backend returns 202 + task_id, frontend polls /status/ until complete
 * 3. Display variants for selection
 *
 * Integrates with backend: POST /api/v1/generative/assets/generate/
 */

import { useState, useCallback, useRef } from 'react';
import { getApiBaseUrl } from '../utils/apiBase';
import { createWorkflowInstance } from './useWorkflows';
import { resolveContentTypeId, type ContentTypeName } from './useContentTypes';

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

type GenerationStep = 'idle' | 'submitting' | 'polling' | 'queued' | 'completed' | 'error';

/** Data returned from the /save/ endpoint after accepting a variant */
export interface SaveResult {
  file_asset_id?: string;
  brand_asset_id?: string;
  storage_path?: string;
  presigned_url?: string;
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
  const [queuedTaskId, setQueuedTaskId] = useState<string | null>(null);

  // Store context for saving
  const [context, setContext] = useState<{
    projectId: string | number;
    organisationId: string;
    outputAssetType?: string;
    membershipId?: string;
    workflowContentType?: ContentTypeName;
    workflowObjectId?: number;
    workflowTemplateId?: number;
    taskId?: string;
    label?: string;
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
    setQueuedTaskId(null);
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

        const rawJson = await res.json();
        // API envelope: { status: 'success', data: { task_id, status, ... } }
        const data = rawJson.data || rawJson;

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
        outputAssetType: params.outputAssetType,
        membershipId: params.membershipId,
        workflowContentType: params.workflowContentType,
        workflowObjectId: params.workflowObjectId,
        workflowTemplateId: params.workflowTemplateId,
        label: params.label,
      };
      console.log('📝 Storing context for save:', saveContext);

      setContext(saveContext);

      // Simulate progress while waiting (all requests are queued now)
      const progressTimer = setInterval(() => {
        setProgress((prev) => Math.min(prev + 1, 90));
      }, 3000);

      // Image generation timeout: 120s (OpenAI can take 30-90s for complex templates)
      let timedOut = false;

      try {
        // Inject user instruction into params if present
        const finalParams = { ...params.parameters };
        if (params.userPrompt) {
            finalParams['user_instruction'] = params.userPrompt;
        }

        const timeoutId = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, 120_000);

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
            ...(params.projectId ? { project_id: params.projectId } : {}),
            ...(params.membershipId ? { membership_id: params.membershipId } : {}),
            ...(params.outputAssetType ? { asset_type: params.outputAssetType } : {}),
            ...(params.provider ? { provider: params.provider } : {}),
            ...(params.model ? { model: params.model } : {}),
            // Route through approval queue if requested
            ...(params.requireApproval ? { save_to_brand: false, save_to_media_library: false } : {}),
          }),
        });

        clearTimeout(timeoutId);
        clearInterval(progressTimer);

        // ── Async path: video generation returns 202 + task_id ───────
        if (res.status === 202) {
          const asyncJson = await res.json();
          // API envelope: { status: 'success', data: { task_id, ... } }
          const asyncData = asyncJson.data || asyncJson;
          const taskId = asyncData.task_id;
          if (!taskId) throw new Error('Backend returned 202 but no task_id');

          console.log(`🎬 Video generation queued. task_id=${taskId}`);

          // Store task_id in context so acceptVariant can auto-approve the job
          setContext(prev => prev ? { ...prev, taskId } : prev);

          if (params.requireApproval) {
            // Approval flow: show "queued" and let user close — result goes
            // through the Approvals page review flow instead.
            setQueuedTaskId(taskId);
            setStep('queued');
            setProgress(100);
            return;
          }

          // Non-approval flow (celebration, intro, then_vs_now):
          // Poll for result in-modal so the user can accept & save to metadata.
          setStep('polling');
          setProgress(15);

          try {
            const polledVariants = await pollForResult(taskId, controller.signal);
            setVariants(polledVariants);
            setStep('completed');
            setProgress(100);
          } catch (pollErr) {
            if ((pollErr as Error).name === 'AbortError') return;
            setError(pollErr instanceof Error ? pollErr.message : 'Video generatie mislukt');
            setStep('error');
          }
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
        if ((err as Error).name === 'AbortError') {
          if (timedOut) {
            setError('Generatie timeout – de AI heeft te lang geduurd (>2 min). Probeer het opnieuw.');
            setStep('error');
          }
          return; // Cancelled by user
        }
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
      const memberId = context?.membershipId;

      console.log('💾 Accepting variant:', {
        variantIndex,
        context,
        orgId,
        assetType,
        hasImage: !!selectedVariant.image_base64,
        hasVideo: !!selectedVariant.video_url,
        hasPresigned: !!selectedVariant.presigned_url,
        storagePath: selectedVariant.storage_path || selectedVariant.storage_info?.storage_path,
        error: selectedVariant.error,
      });

      // Guard: variant with error should not be saved
      if (selectedVariant.error) {
        console.error('Variant has error, cannot save:', selectedVariant.error);
        setError(selectedVariant.error);
        return null;
      }

      if (!orgId) {
         console.error('Missing organisation context for saving asset');
         return null;
      }

      // Guard: ensure at least one content source is available
      const hasContent = selectedVariant.image_base64 ||
        selectedVariant.video_base64 ||
        selectedVariant.presigned_url ||
        selectedVariant.video_url ||
        selectedVariant.storage_path ||
        selectedVariant.storage_info?.storage_path;

      if (!hasContent) {
        console.error('No content source in variant (image_base64, storage_path, presigned_url all missing)');
        setError('Geen resultaat om op te slaan (server gaf geen afbeelding terug)');
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
            ...(memberId ? { membership_id: memberId } : {}),
            // Auto-approve the GenerationJob in the queue
            ...(context?.taskId ? { task_id: context.taskId, variant_index: variantIndex } : {}),
            // Label for multi-instance types (e.g. club backgrounds)
            ...(context?.label ? { label: context.label } : {}),
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

        const result: SaveResult = {
          file_asset_id: saveData?.file_asset_id,
          brand_asset_id: saveData?.brand_asset_id,
          storage_path: saveData?.storage_path,
          presigned_url: saveData?.presigned_url,
          asset_type: saveData?.asset_type,
        };

        // ── Auto-create workflow instance if configured ─────────────
        if (context?.workflowContentType && context?.workflowObjectId && context?.workflowTemplateId) {
          try {
            const contentTypeId = await resolveContentTypeId(context.workflowContentType);
            if (contentTypeId) {
              await createWorkflowInstance({
                workflow: context.workflowTemplateId,
                project: Number(context.projectId),
                content_type: contentTypeId,
                object_id: context.workflowObjectId,
                context: {
                  auto_created: true,
                  asset_type: context.outputAssetType,
                  file_asset_id: result.file_asset_id,
                  brand_asset_id: result.brand_asset_id,
                },
              });
              console.log('🔄 Auto-created workflow instance for', context.workflowContentType, context.workflowObjectId);
              // Notify other components to refresh workflow data
              window.dispatchEvent(new Event('workflowChanged'));
            }
          } catch (wfErr) {
            // Non-blocking: workflow creation failure should not break the save flow
            console.warn('⚠️ Auto-workflow creation failed (non-blocking):', wfErr);
          }
        }

        return result;
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
    queuedTaskId,
  };
}

export default useAssetGeneration;
