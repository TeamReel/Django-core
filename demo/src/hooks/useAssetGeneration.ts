/**
 * useAssetGeneration Hook
 *
 * Manages the AI asset generation flow:
 * 1. Submit generation request (template + params + input image URLs)
 * 2. Wait for synchronous response (30-90s per variant)
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
  mime_type: string | null;
  filename: string | null;
  error?: string | null;
  metadata?: Record<string, unknown>;
  presigned_url?: string | null;
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

type GenerationStep = 'idle' | 'submitting' | 'completed' | 'error';

interface UseAssetGenerationReturn {
  /** Current step in the generation flow */
  step: GenerationStep;
  /** Generated variant images */
  variants: GenerationVariant[];
  /** Error message if failed */
  error: string | null;
  /** Submit a generation request */
  submit: (params: SubmitParams) => Promise<void>;
  /** Accept a variant (save image to brand profile) */
  acceptVariant: (variantIndex: number) => Promise<boolean>;
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
  /** Input images as URLs (fetched from brand profile S3) */
  inputImageUrls?: Record<string, string>;
  /** Input images as base64 strings (if already loaded) */
  inputImages?: Record<string, string>;
}

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

      // Simulate progress while waiting (generation takes 30-90s)
      const progressTimer = setInterval(() => {
        setProgress((prev) => Math.min(prev + 3, 90));
      }, 2000);

      try {
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
            params: params.parameters,
            variant_count: params.variantCount,
            input_images: params.inputImages || {},
            input_image_urls: params.inputImageUrls || {},
          }),
        });

        clearInterval(progressTimer);

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
            mime_type: v.mime_type,
            filename: v.filename,
            error: v.error,
            metadata: v.metadata,
            presigned_url: v.presigned_url,
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
    [apiBase]
  );

  const acceptVariant = useCallback(
    async (variantIndex: number): Promise<boolean> => {
      const selectedVariant = variants.find(v => v.variant_index === variantIndex);
      if (!selectedVariant) {
        console.error('Selected variant not found');
        return false;
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
        hasImage: !!selectedVariant.image_base64
      });

      if (!orgId) {
         console.error('Missing organisation context for saving asset');
         return false;
      }

      try {
        const response = await fetch(`${apiBase}/api/v1/generative/assets/save/`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          body: JSON.stringify({
            storage_path: selectedVariant.storage_info?.storage_path,
            presigned_url: selectedVariant.presigned_url,
            image_base64: selectedVariant.image_base64,
            filename: selectedVariant.filename,
            mime_type: selectedVariant.mime_type || 'image/png',
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

        return true;
      } catch (e) {
        console.error('Error saving asset:', e);
        setError(e instanceof Error ? e.message : 'Opslaan mislukt');
        return false;
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
