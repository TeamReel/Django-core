/**
 * matchWizardSaving — Save-variant logic for MatchWizard.
 *
 * Extracted from useMatchWizardData so the hook stays slim.
 * Handles calling the backend save API and building the updated variant
 * with storage info — but does NOT touch React state (that stays in the hook).
 */
import type { ContentTemplate, GeneratedVariant } from '../pages/identity/ContentGenerationModal/types';
import { saveGeneratedVariant } from '../pages/identity/ContentGenerationModal/contentGenerationApi';

// ── Types ─────────────────────────────────────────────────

export interface SaveVariantParams {
  variant: GeneratedVariant;
  variantIdx: number;
  totalVariants: number;
  selectedType: { type: string; subtype: string; label: string } | null;
  selectedTemplate: ContentTemplate | null;
  matchDataForApi: any;
  organisationId: string | null | undefined;
  assetType: null;
}

export interface SaveVariantResult {
  savedVariantIdx: number;
  updatedVariant: GeneratedVariant;
}

// ── Core save logic ───────────────────────────────────────

/**
 * Persist a single generated variant via the backend API.
 * Returns the (potentially enriched) variant with storage_info attached.
 */
export async function executeSaveVariant(params: SaveVariantParams): Promise<SaveVariantResult> {
  const {
    variant, variantIdx, totalVariants,
    selectedType, selectedTemplate,
    matchDataForApi, organisationId, assetType,
  } = params;

  const result = await saveGeneratedVariant({
    variant, variantIdx, totalVariants,
    selectedType, selectedTemplate, assetType,
    matchData: matchDataForApi, organisationId,
  });

  let updatedVariant = variant;

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
    if (result.media_item_id) nextStorageInfo.media_item_id = result.media_item_id;

    updatedVariant = { ...variant, storage_info: nextStorageInfo };
  }

  return { savedVariantIdx: variantIdx, updatedVariant };
}
