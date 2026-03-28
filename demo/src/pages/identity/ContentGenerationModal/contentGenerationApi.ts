/**
 * ContentGenerationModal — API helper functions
 *
 * Pure async functions for all content generation API calls.
 * No React hooks — just fetch + return.
 */
import { api } from '@/api';
import type { ContentTemplate, GeneratedVariant, GeneratedOutput } from './types';
import { CONTENT_TYPES, ASSET_TYPE_TO_MEDIA_KEY } from './constants';

/* — Re-exports so existing consumers keep working — */
export type {
  FetchTemplatesParams,
  GenerateLineupFlyerParams,
  GenerateTeamPosterParams,
  GenerateMatchFlyerParams,
  GenerateMatchSummaryParams,
} from './contentGenerationApiTypes';

export {
  generateLineupFlyer,
  generateTeamPoster,
  generateMatchFlyer,
  generateMatchSummary,
} from './contentGenerationApiVisual';

import type {
  FetchTemplatesParams,
  GenerateGenericAIParams,
  GenericAIResult,
  SaveVariantParams,
  SaveVariantResult,
} from './contentGenerationApiTypes';
export type { GenerateGenericAIParams, GenericAIResult, SaveVariantParams, SaveVariantResult };

/* ================================================================== */
/*  Shared helpers                                                     */
/* ================================================================== */

export const resolveProjectId = (
  matchData: { project?: { id: string } } | null,
  seasonProjectId?: string | number,
): string => {
  const id = matchData?.project?.id || seasonProjectId;
  if (!id) throw new Error('No project ID available');
  return String(id);
};

/** DRF response envelope returned by postJson — allows nested .data access without any. */
interface ApiEnvelope extends Record<string, unknown> {
  data?: Record<string, unknown>;
}

export const postJson = async (path: string, body: Record<string, unknown>, extra?: Record<string, string>): Promise<ApiEnvelope> => {
  return api.post<ApiEnvelope>(path, body, extra ? { headers: extra } as Record<string, unknown> : undefined);
};

/* ================================================================== */
/*  Fetch templates                                                    */
/* ================================================================== */

export const fetchContentTemplates = async ({
  templateType,
  templateSubtype,
  organisationSport,
}: FetchTemplatesParams): Promise<ContentTemplate[]> => {
  const params = new URLSearchParams();
  params.append('is_active', 'true');
  params.append('template_type', templateType);
  params.append('template_subtype', templateSubtype);

  const contentTypeConfig = CONTENT_TYPES[templateType as keyof typeof CONTENT_TYPES];
  const sportRequired = contentTypeConfig?.sportRequired !== false;

  if (organisationSport?.id && sportRequired) {
    params.append('sport', String(organisationSport.id));
  }

  const response = await api.list<ContentTemplate>('/content-generation/templates/', {
    params: Object.fromEntries(params),
  });
  let results = response.results;

  // Fallback: try without sport filter
  if (results.length === 0 && organisationSport?.id && sportRequired) {
    const paramsAll = new URLSearchParams();
    paramsAll.append('is_active', 'true');
    paramsAll.append('template_type', templateType);
    paramsAll.append('template_subtype', templateSubtype);

    try {
      const responseAll = await api.list<ContentTemplate>('/content-generation/templates/', {
        params: Object.fromEntries(paramsAll),
      });
      results = responseAll.results;
    } catch {
      // ignore fallback failure
    }
  }

  return results;
};

/* ================================================================== */
/*  Generic AI generation                                              */
/* ================================================================== */

export const generateGenericAI = async (p: GenerateGenericAIParams): Promise<GenericAIResult> => {
  const isStandardize = (p.selectedType?.subtype || '').includes('standardize') ||
    (p.selectedType?.subtype || '').includes('logo') ||
    (p.selectedType?.subtype || '').includes('sponsor');
  const variantCount = isStandardize ? 3 : 1;

  const data = await postJson('/generative/assets/generate/', {
    template_id: p.selectedTemplate?.id?.toString() || 'default',
    params: {
      template_type: p.selectedType?.type || p.selectedTemplate?.template_type,
      template_subtype: p.selectedType?.subtype || p.selectedTemplate?.template_subtype,
      style_variant: p.selectedTemplate?.style_variant || 'default',
      match_id: p.matchData?.id,
      project_name: p.matchData?.project?.name,
      opponent_name: p.matchData?.opponent_project?.name,
    },
    variant_count: variantCount,
    input_images: {},
    input_image_urls: {},
    project_id: p.matchData?.project?.id || null,
    organisation_id: p.organisationId || null,
    activity_id: p.matchData?.id || null,
    asset_type: p.assetType || p.selectedTemplate?.template_subtype || null,
    save_to_brand: false,
    save_to_media_library: false,
  });

  const responseData = data.data || data;
  const variants = (responseData.variants || []) as GeneratedVariant[];

  const firstError = variants.find((v: GeneratedVariant) => v.error);
  if (firstError?.error) throw new Error(firstError.error);

  let generatedOutput: GeneratedOutput | null = null;
  const firstVariant = variants[0];

  if (firstVariant) {
    generatedOutput = {
      image_base64: firstVariant.image_base64 || null,
      presigned_url: firstVariant.presigned_url || null,
      storage_info: firstVariant.storage_info || null,
      metadata: firstVariant.metadata || {},
    };
  } else if (responseData.image_base64 || responseData.presigned_url) {
    const singleVariant: GeneratedVariant = {
      variant_index: 0,
      image_base64: responseData.image_base64 as string | null,
      presigned_url: responseData.presigned_url as string | null,
      mime_type: responseData.mime_type as string | null,
      filename: responseData.filename as string | null,
      error: null,
      storage_info: responseData.storage_info as GeneratedVariant['storage_info'],
      metadata: (responseData.metadata || {}) as Record<string, unknown>,
    };
    variants.push(singleVariant);
    generatedOutput = {
      image_base64: singleVariant.image_base64,
      presigned_url: singleVariant.presigned_url,
      storage_info: singleVariant.storage_info,
      metadata: singleVariant.metadata,
    };
  }

  return { variants, generatedOutput };
};

/* ================================================================== */
/*  Save variant                                                       */
/* ================================================================== */

export const saveGeneratedVariant = async (p: SaveVariantParams): Promise<SaveVariantResult> => {
  const templateSubtype = p.selectedType?.subtype || p.selectedTemplate?.template_subtype || '';
  const isVideo = (p.variant.mime_type || '').startsWith('video/');
  let brandAssetType = p.assetType;

  if (templateSubtype.includes('logo')) brandAssetType = 'logo';
  else if (templateSubtype.includes('sponsor')) brandAssetType = 'sponsor_logo';
  else if (templateSubtype.includes('kit') || templateSubtype.includes('tenue')) {
    const kitType = (p.selectedTemplate as ContentTemplate & { params?: { kit_type?: string } })?.params?.kit_type || 'home';
    brandAssetType = `kit_${kitType}`;
  } else if (templateSubtype === 'lineup_flyer') brandAssetType = `lineup_flyer_${(p.matchData?.id || '').toString().slice(0, 8) || 'unknown'}`;
  else if (templateSubtype === 'flyer') brandAssetType = `match_flyer_${(p.matchData?.id || '').toString().slice(0, 8) || 'unknown'}`;
  else if (templateSubtype === 'goal' || templateSubtype === 'goal_celebration') brandAssetType = `goal_${(p.matchData?.id || '').toString().slice(0, 8) || 'unknown'}`;
  else if (templateSubtype === 'match_intro') brandAssetType = `match_intro_${(p.matchData?.id || '').toString().slice(0, 8) || 'unknown'}`;
  else if (templateSubtype === 'poster') brandAssetType = `poster_${(p.matchData?.id || '').toString().slice(0, 8) || 'unknown'}`;
  else if (templateSubtype === 'lineup' || isVideo) brandAssetType = `lineup_${(p.matchData?.id || '').toString().slice(0, 8) || 'unknown'}`;

  if (!brandAssetType) brandAssetType = 'other';
  if (p.totalVariants > 1) brandAssetType = `${brandAssetType}_v${p.variantIdx + 1}`;

  const filename = p.variant.filename || (isVideo ? 'lineup.mp4' : 'saved_asset.png');

  const data = await postJson('/generative/assets/save/', {
    storage_path: p.variant.storage_info?.storage_path,
    presigned_url: p.variant.presigned_url,
    video_url: isVideo ? p.variant.presigned_url : null,
    image_base64: p.variant.image_base64,
    filename,
    mime_type: p.variant.mime_type || (isVideo ? 'video/mp4' : 'image/png'),
    file_size_bytes: p.variant.storage_info?.file_size_bytes || 0,
    organisation_id: p.organisationId,
    project_id: p.matchData?.project?.id,
    activity_id: p.matchData?.id || null,
    asset_type: brandAssetType,
  });

  const result = data.data || data;
  return {
    file_asset_id: result.file_asset_id as string | undefined,
    brand_asset_id: result.brand_asset_id as string | undefined,
    media_item_id: result.media_item_id as string | undefined,
    storage_path: result.storage_path as string | undefined,
  };
};
