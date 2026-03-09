/**
 * useAssetAutoProcessing — Post-process & upload-auto-process logic
 *
 * Extracted from useAssetsTabData for file-size compliance.
 * Owns two useAssetGeneration() instances plus their auto-accept effects,
 * and the handlePostProcess handler.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  useAssetGeneration,
  type SubmitParams,
} from '../../hooks/useAssetGeneration';
import {
  getAssetUrl,
  type BrandAsset,
} from '../../hooks/useBrandProfile';
import { getTemplate } from '../../constants/assetTemplates';

// ============================================================================
// Params & return type
// ============================================================================

interface AutoProcessingParams {
  refresh: () => Promise<void>;
  getAsset: (type: string) => BrandAsset | undefined;
  parentGetAsset?: (type: string) => BrandAsset | undefined;
  parentProjectId?: string | number | null;
  projectId?: string | number | null;
  organisationId: string;
}

export interface UseAssetAutoProcessingReturn {
  postProcessingAsset: string | null;
  uploadProcessingAsset: string | null;
  handlePostProcess: (assetType: string) => void;
  startUploadAutoProcess: (outputType: string, submitParams: SubmitParams) => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useAssetAutoProcessing({
  refresh,
  getAsset,
  parentGetAsset,
  parentProjectId,
  projectId,
  organisationId,
}: AutoProcessingParams): UseAssetAutoProcessingReturn {
  // ── Postprocess generation ──
  const postProcessGen = useAssetGeneration();
  const [postProcessingAsset, setPostProcessingAsset] = useState<string | null>(null);
  const [postProcessOutputType, setPostProcessOutputType] = useState<string | null>(null);
  const postProcessSavingRef = useRef(false);

  // Auto-accept postprocess result
  useEffect(() => {
    if (postProcessGen.step === 'completed' && postProcessGen.variants.length > 0 && postProcessingAsset) {
      if (postProcessSavingRef.current) return;
      postProcessSavingRef.current = true;

      (async () => {
        try {
          const variant = postProcessGen.variants[0];
          if (variant?.error) {
            console.error('[Error] Postprocess variant has error:', variant.error);
            alert(`Bewerken mislukt: ${variant.error}`);
            return;
          }
          if (!variant?.image_base64 && !variant?.storage_path && !variant?.presigned_url && !variant?.storage_info?.storage_path) {
            console.error('[Error] Postprocess variant has no content:', variant);
            alert('Bewerken mislukt: geen resultaat ontvangen van de server.');
            return;
          }
          const result = await postProcessGen.acceptVariant(0);
          if (result) {
            await refresh();
          } else {
            console.error('[Error] Postprocess save failed for', postProcessingAsset);
          }
        } catch (err) {
          console.error(err);
          console.error('[Error] Postprocess auto-accept error:', err);
        } finally {
          setPostProcessingAsset(null);
          setPostProcessOutputType(null);
          postProcessGen.reset();
          postProcessSavingRef.current = false;
        }
      })();
    } else if (postProcessGen.step === 'error' && postProcessingAsset) {
      console.error('[Error] Postprocess failed:', postProcessGen.error);
      alert(`Bewerken mislukt: ${postProcessGen.error || 'Onbekende fout'}`);
      setPostProcessingAsset(null);
      setPostProcessOutputType(null);
      postProcessGen.reset();
      postProcessSavingRef.current = false;
    }
  }, [postProcessGen.step, postProcessGen.variants.length]);

  // ── Upload auto-processing ──
  const uploadAutoGen = useAssetGeneration();
  const [uploadProcessingAsset, setUploadProcessingAsset] = useState<string | null>(null);
  const uploadAutoSavingRef = useRef(false);

  useEffect(() => {
    if (uploadAutoGen.step === 'completed' && uploadAutoGen.variants.length > 0 && uploadProcessingAsset) {
      if (uploadAutoSavingRef.current) return;
      uploadAutoSavingRef.current = true;

      (async () => {
        try {
          const variant = uploadAutoGen.variants[0];
          if (variant?.error) {
            console.error('[Error] Upload auto-process variant has error:', variant.error);
            return;
          }
          if (!variant?.image_base64 && !variant?.storage_path && !variant?.presigned_url && !variant?.storage_info?.storage_path) {
            console.error('[Error] Upload auto-process variant has no content:', variant);
            return;
          }
          const result = await uploadAutoGen.acceptVariant(0);
          if (result) {
            await refresh();
          } else {
            console.error('[Error] Upload auto-save failed for', uploadProcessingAsset);
          }
        } catch (err) {
          console.error(err);
          console.error('[Error] Upload auto-accept error:', err);
        } finally {
          setUploadProcessingAsset(null);
          uploadAutoGen.reset();
          uploadAutoSavingRef.current = false;
        }
      })();
    } else if (uploadAutoGen.step === 'error' && uploadProcessingAsset) {
      console.error('[Error] Upload auto-process failed:', uploadAutoGen.error);
      setUploadProcessingAsset(null);
      uploadAutoGen.reset();
      uploadAutoSavingRef.current = false;
    }
  }, [uploadAutoGen.step, uploadAutoGen.variants.length]);

  // ── Effective asset helper ──
  const getEffAsset = useCallback((type: string) => {
    const own = getAsset(type);
    if (own) return own;
    if (parentProjectId && parentGetAsset) return parentGetAsset(type);
    return undefined;
  }, [getAsset, parentProjectId, parentGetAsset]);

  // ── handlePostProcess ──
  const handlePostProcess = useCallback((assetType: string) => {
    if (postProcessingAsset) return;

    let templateId: string | undefined;
    if (assetType === 'logo') templateId = 'logo_postprocess';
    else if (assetType === 'sponsor_logo') templateId = 'sponsor_postprocess';
    else if (assetType.includes('kit_')) templateId = 'kit_postprocess';
    else if (assetType === 'stadium_background') templateId = 'location_postprocess';

    if (!templateId) return;

    const asset = getEffAsset(assetType);
    if (!asset) {
      alert('Genereer eerst een AI versie voordat je kunt bewerken.');
      return;
    }

    const tmpl = getTemplate(templateId);
    const defaultParams: Record<string, string> = {};
    if (tmpl) {
      Object.entries(tmpl.parameters).forEach(([key, param]) => {
        defaultParams[key] = param.default;
      });
    }

    setPostProcessingAsset(assetType);
    setPostProcessOutputType(tmpl?.outputAssetType || assetType);

    postProcessGen.submit({
      templateId,
      parameters: defaultParams,
      variantCount: 1,
      projectId: projectId || '',
      organisationId,
      outputAssetType: assetType,
      inputImageUrls: { source: getAssetUrl(asset.url) || '' },
    });
  }, [postProcessingAsset, getEffAsset, projectId, organisationId, postProcessGen]);

  // ── Start upload auto-process (called by handleUpload in orchestrator) ──
  const startUploadAutoProcess = useCallback((outputType: string, submitParams: SubmitParams) => {
    setUploadProcessingAsset(outputType);
    uploadAutoGen.submit(submitParams);
  }, [uploadAutoGen]);

  return {
    postProcessingAsset,
    uploadProcessingAsset,
    handlePostProcess,
    startUploadAutoProcess,
  };
}
