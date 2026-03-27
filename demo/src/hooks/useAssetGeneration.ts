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
import { api } from '@/api';
import { createWorkflowInstance } from './useWorkflows';
import { resolveContentTypeId, type ContentTypeName } from './useContentTypes';
import { logger } from '@/utils/logger';
import {
  VIDEO_POLL_INTERVAL_MS,
  VIDEO_MAX_POLLS,
  type GenerationVariant,
  type GenerationStep,
  type SaveResult,
  type UseAssetGenerationReturn,
  type SubmitParams,
} from './assetGenerationTypes';

// Re-export types for backward compatibility
export type { GenerationVariant, GenerationStep, SaveResult, UseAssetGenerationReturn, SubmitParams } from './assetGenerationTypes';
export { VIDEO_POLL_INTERVAL_MS, VIDEO_MAX_POLLS } from './assetGenerationTypes';

interface GenerationStatusResponse {
  status: string;
  progress?: number;
  message?: string;
  error?: string;
  data?: {
    variants?: GenerationVariant[];
    [key: string]: unknown;
  };
}

interface GenerationSubmitResponse {
  task_id?: string;
  variants?: GenerationVariant[];
  [key: string]: unknown;
}

interface SaveResponse {
  data?: SaveResponseData;
  file_asset_id?: string;
  brand_asset_id?: string;
  storage_path?: string;
  presigned_url?: string;
  asset_type?: string;
  [key: string]: unknown;
}

interface SaveResponseData {
  file_asset_id?: string;
  brand_asset_id?: string;
  storage_path?: string;
  presigned_url?: string;
  asset_type?: string;
}

// ============================================================================
// Hook
// ============================================================================

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

        const res = await api.get<GenerationStatusResponse>(
          `/generative/assets/generate/${taskId}/status/`,
          signal,
        );

        // api.get auto-unwraps envelope, so `res` is the inner data
        const data = res;

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

        // Retrying — transient error (503 / rate limit), backend will retry automatically
        if (data.status === 'retrying') {
          setProgress(10);
          setError(data.message || 'AI model tijdelijk niet beschikbaar, wordt automatisch opnieuw geprobeerd…');
          // Don't throw — keep polling, the task will be re-dispatched
          continue;
        }

        // Still processing — update progress from server
        if (typeof data.progress === 'number') {
          setProgress(Math.min(data.progress, 95));
        }

        // Clear any previous retrying message when back to processing
        if (data.status === 'processing' || data.status === 'queued') {
          setError(null);
        }
      }

      throw new Error('Video generatie timeout (te lang gewacht)');
    },
    []
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

        const res = await api.post<GenerationSubmitResponse>('/generative/assets/generate/', {
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
        }, { signal: controller.signal });

        clearTimeout(timeoutId);
        clearInterval(progressTimer);

        // api.post returns the unwrapped data; check for task_id (async path)
        const asyncData = res;
        const taskId = asyncData?.task_id;

        if (taskId) {
          // ── Async path: video generation returns task_id ───────
          // Store task_id in context so acceptVariant can auto-approve the job
          setContext(prev => prev ? { ...prev, taskId } : prev);

          if (params.requireApproval) {
            // Approval flow: show "queued" and let user close
            setQueuedTaskId(taskId);
            setStep('queued');
            setProgress(100);
            return;
          }

          // Non-approval flow: Poll for result in-modal
          setStep('polling');
          setProgress(15);

          try {
            const polledVariants = await pollForResult(taskId, controller.signal);
            setVariants(polledVariants);
            setStep('completed');
            setProgress(100);
          } catch (pollErr) {
            logger.error('Video generation polling failed', pollErr);
            if ((pollErr as Error).name === 'AbortError') return;
            setError(pollErr instanceof Error ? pollErr.message : 'Video generatie mislukt');
            setStep('error');
          }
          return;
        }

        // ── Sync path: image generation returns variants directly ─────
        const responseData = res;
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

        setVariants(generatedVariants);
        setStep('completed');
        setProgress(100);
      } catch (err) {
        logger.error('Asset generation failed', err);
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
    [pollForResult]
  );

  const acceptVariant = useCallback(
    async (variantIndex: number): Promise<SaveResult | null> => {
      const selectedVariant = variants.find(v => v.variant_index === variantIndex);
      if (!selectedVariant) {
        logger.error('Selected variant not found');
        return null;
      }

      // Use stored context or fall back defaults if missing (should not happen if flow followed)
      const orgId = context?.organisationId;
      const projId = context?.projectId;
      const assetType = context?.outputAssetType;
      const memberId = context?.membershipId;

      // Guard: variant with error should not be saved
      if (selectedVariant.error) {
        logger.error('Variant has error, cannot save', selectedVariant.error);
        setError(selectedVariant.error);
        return null;
      }

      if (!orgId) {
         logger.error('Missing organisation context for saving asset');
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
        logger.error('No content source in variant (image_base64, storage_path, presigned_url all missing)');
        setError('Geen resultaat om op te slaan (server gaf geen afbeelding terug)');
        return null;
      }

      try {
        const isVideo = selectedVariant.mime_type?.startsWith('video/') ||
            !!selectedVariant.video_url || !!selectedVariant.video_base64;

        const response = await api.post<SaveResponse>('/generative/assets/save/', {
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
        });

        // api.post auto-unwraps envelope; drill into nested .data if present
        const saveData = response?.data || response;

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
              // Notify other components to refresh workflow data
              window.dispatchEvent(new Event('workflowChanged'));
            }
          } catch (wfErr) {
            // Non-blocking: workflow creation failure should not break the save flow
            logger.warn('[Workflow] Auto-workflow creation failed (non-blocking)', wfErr);
          }
        }

        return result;
      } catch (e) {
        logger.error('Error saving asset', e);
        setError(e instanceof Error ? e.message : 'Opslaan mislukt');
        return null;
      }
    },
    [variants, context]
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
