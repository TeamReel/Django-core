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

        // Map response variants
        const generatedVariants: GenerationVariant[] = (json.variants || []).map(
          (v: GenerationVariant) => ({
            variant_index: v.variant_index,
            image_base64: v.image_base64,
            mime_type: v.mime_type,
            filename: v.filename,
            error: v.error,
            metadata: v.metadata,
          })
        );

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
      // In the synchronous flow, "accepting" means the frontend
      // will upload the selected variant's base64 image to the brand profile.
      // The actual upload is handled by the caller (modal component).
      // This is a placeholder that returns true for now.
      return true;
    },
    []
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
