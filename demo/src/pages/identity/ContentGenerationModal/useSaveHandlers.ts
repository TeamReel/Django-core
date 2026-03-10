/**
 * Save Handlers — manages saving generated variants as assets,
 * including single-variant save, save-all, and post-save toasts.
 *
 * Extracted from useContentGeneration to keep modules focused.
 */
import type {
  ContentTemplate,
  GeneratedVariant,
  GeneratedOutput,
  ContentGenerationModalProps,
} from './types';
import { saveGeneratedVariant } from './contentGenerationApi';
import { logger } from '@/utils/logger';
import type { ToastItem } from '@/components/ui/Toast';
import { CheckCircle } from 'lucide-react';

/* ================================================================== */
/*  Deps interface                                                     */
/* ================================================================== */

export interface SaveHandlersDeps {
  // Modal props
  matchData: ContentGenerationModalProps['matchData'];
  organisationId?: string | null;
  assetType?: string | null;
  onGenerated?: (message?: string) => void;
  onClose: () => void;

  // Generation state (read)
  selectedType: { type: string; subtype: string; label: string } | null;
  selectedTemplate: ContentTemplate | null;
  generatedVariants: GeneratedVariant[];
  generatedOutput: GeneratedOutput | null;
  selectedVariantIndex: number;
  savedVariantIndices: Set<number>;

  // State setters
  setGeneratedVariants: React.Dispatch<React.SetStateAction<GeneratedVariant[]>>;
  setSavingAsset: (saving: boolean) => void;
  setSaveSuccess: (success: boolean) => void;
  setSavedVariantIndices: React.Dispatch<React.SetStateAction<Set<number>>>;
  setGenerationError: (e: string | null) => void;

  // Navigation helpers (provided by orchestrator)
  pushToast: (t: Omit<ToastItem, 'id'>) => void;
  navigate: (path: string) => void;
}

/* ================================================================== */
/*  Hook                                                               */
/* ================================================================== */

export function useSaveHandlers(deps: SaveHandlersDeps) {
  const {
    matchData, organisationId, assetType, onGenerated, onClose,
    selectedType, selectedTemplate,
    generatedVariants, generatedOutput, selectedVariantIndex, savedVariantIndices,
    setGeneratedVariants, setSavingAsset, setSaveSuccess, setSavedVariantIndices,
    setGenerationError,
    pushToast, navigate,
  } = deps;

  const handleSaveVariantByIndex = async (variantIdx: number, opts?: { skipAutoClose?: boolean }) => {
    const variant = generatedVariants[variantIdx];
    if (!variant) return;

    setSavingAsset(true);
    try {
      const result = await saveGeneratedVariant({
        variant, variantIdx, totalVariants: generatedVariants.length,
        selectedType, selectedTemplate, assetType, matchData, organisationId,
      });

      setSavedVariantIndices(prev => new Set([...prev, variantIdx]));

      if (result.brand_asset_id || result.media_item_id) {
        const nextStorageInfo: NonNullable<GeneratedVariant['storage_info']> = variant.storage_info
          ? { ...variant.storage_info }
          : {
              storage_backend: 's3',
              storage_path: result.storage_path || variant.presigned_url || '',
              file_size_bytes: 0,
              mime_type: variant.mime_type || 'image/png',
            };

        if (result.storage_path) nextStorageInfo.storage_path = result.storage_path;
        if (result.file_asset_id) nextStorageInfo.file_asset_id = result.file_asset_id;
        if (result.brand_asset_id) nextStorageInfo.brand_asset_id = result.brand_asset_id;
        if (result.media_item_id) (nextStorageInfo as Record<string, unknown>).media_item_id = result.media_item_id;

        const updatedVariants = [...generatedVariants];
        updatedVariants[variantIdx] = { ...variant, storage_info: nextStorageInfo };
        setGeneratedVariants(updatedVariants);
      }

      if (!opts?.skipAutoClose && generatedVariants.length <= 1) {
        setSaveSuccess(true);
        const previewUrl = variant.presigned_url || generatedOutput?.presigned_url;
        pushToast({
          message: `${selectedType?.label || 'Content'} opgeslagen!`,
          type: 'success',
          icon: CheckCircle,
          actions: [
            ...(previewUrl ? [{ label: 'Bekijk', onClick: () => window.open(previewUrl, '_blank') }] : []),
            { label: 'Naar queue', onClick: () => navigate('/approvals') },
          ],
        });
        window.dispatchEvent(new CustomEvent('teamreel:queue-update'));
        setTimeout(() => {
          onGenerated?.(`${selectedType?.label || 'Content'} opgeslagen`);
          onClose();
        }, 1200);
      }
    } catch (err) {
      logger.error(`[!] Failed to save variant ${variantIdx + 1}`, err);
      setGenerationError(err instanceof Error ? err.message : 'Opslaan mislukt');
    } finally {
      setSavingAsset(false);
    }
  };

  const handleSaveAsAsset = async () => { await handleSaveVariantByIndex(selectedVariantIndex); };

  const handleSaveAllAsAssets = async () => {
    setSavingAsset(true);
    setSaveSuccess(false);
    for (let i = 0; i < generatedVariants.length; i++) {
      if (savedVariantIndices.has(i)) continue;
      await handleSaveVariantByIndex(i, { skipAutoClose: true });
    }
    setSaveSuccess(true);
    setSavingAsset(false);
    const previewUrl = generatedVariants[0]?.presigned_url || generatedOutput?.presigned_url;
    pushToast({
      message: `${generatedVariants.length} varianten opgeslagen!`,
      type: 'success',
      icon: CheckCircle,
      actions: [
        ...(previewUrl ? [{ label: 'Bekijk', onClick: () => window.open(previewUrl, '_blank') }] : []),
        { label: 'Naar queue', onClick: () => navigate('/approvals') },
      ],
    });
    window.dispatchEvent(new CustomEvent('teamreel:queue-update'));
    setTimeout(() => {
      onGenerated?.(`${generatedVariants.length} varianten opgeslagen`);
      onClose();
    }, 1200);
  };

  return { handleSaveVariantByIndex, handleSaveAsAsset, handleSaveAllAsAssets };
}
