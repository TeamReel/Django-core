/**
 * useAssetsTabData — State management hook for AssetsTab
 *
 * Extracted from AssetsTab.tsx (Phase 23).
 * Contains all state, effects, and handler functions.
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  useBrandProfile,
  getAssetUrl,
  MULTI_INSTANCE_TYPES,
  type BrandAsset,
} from '../../hooks/useBrandProfile';
import { useAssetGeneration } from '../../hooks/useAssetGeneration';
import { getTemplate } from '../../constants/assetTemplates';
import { UPLOAD_OUTPUT_TYPE, UPLOAD_TO_AI_TEMPLATE, type AssetsLevel } from './assetsTabHelpers';
import type { HistoryItem } from './AssetSubComponents';

// ============================================================================
// Hook props & return type
// ============================================================================

interface UseAssetsTabDataProps {
  level: AssetsLevel;
  organisationId: string;
  projectId?: string | number | null;
  parentProjectId?: string | number | null;
  entityName?: string;
  readOnly?: boolean;
  sponsorMode?: 'club' | 'custom';
}

export interface AssetsTabData {
  // Brand profile
  profile: ReturnType<typeof useBrandProfile>['profile'];
  assets: ReturnType<typeof useBrandProfile>['assets'];
  loading: boolean;
  parentLoading: boolean;
  error: string | null;
  getAsset: ReturnType<typeof useBrandProfile>['getAsset'];
  getAssets: ReturnType<typeof useBrandProfile>['getAssets'];
  getAssetUrl: typeof getAssetUrl;
  refresh: ReturnType<typeof useBrandProfile>['refresh'];

  // Upload state
  uploading: string | null;

  // AI modal state
  showAiModal: boolean;
  setShowAiModal: (v: boolean) => void;
  aiPreselectedTemplate: string | undefined;
  setAiPreselectedTemplate: (v: string | undefined) => void;
  aiPreviousResultUrl: string | null;
  setAiPreviousResultUrl: (v: string | null) => void;
  aiCustomInputs: Record<string, string | null>;
  setAiCustomInputs: (v: Record<string, string | null>) => void;
  aiInitialParams: Record<string, string>;
  setAiInitialParams: (v: Record<string, string>) => void;
  aiLabel: string | undefined;
  setAiLabel: (v: string | undefined) => void;

  // Processing state
  postProcessingAsset: string | null;
  uploadProcessingAsset: string | null;

  // History
  showHistoryModal: boolean;
  historyAssetType: string | null;
  historyList: HistoryItem[];
  loadingHistory: boolean;

  // Computed
  sponsorMode: 'club' | 'custom';
  baseAiInputAssets: { logo: string | null; sponsor: string | null };

  // Handlers
  handleUpload: (file: File, assetType: string) => Promise<void>;
  handleDelete: (assetType: string) => Promise<void>;
  handleDeleteById: (assetId: string) => Promise<void>;
  getEffectiveAsset: (assetType: string) => { asset: BrandAsset | undefined; inherited: boolean };
  handleReplaceAi: (assetType: string) => void;
  handlePostProcess: (assetType: string) => void;
  handleShowHistory: (assetType: string) => Promise<void>;
  handleRestore: (fileAssetId: string) => Promise<void>;
  setShowHistoryModal: (v: boolean) => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useAssetsTabData({
  level,
  organisationId,
  projectId,
  parentProjectId,
  entityName,
  sponsorMode: externalSponsorMode,
}: UseAssetsTabDataProps): AssetsTabData {
  // ── Brand profiles ──
  const {
    profile,
    assets,
    loading,
    error,
    getAsset,
    getAssets,
    getAssetUrl: getAssetUrlByType,
    uploadAsset,
    deleteAsset,
    deleteAssetById,
    refresh,
  } = useBrandProfile({
    organisationId,
    projectId: level !== 'organisation' ? projectId : undefined,
  });

  const parentBrand = useBrandProfile({
    projectId: parentProjectId || undefined,
    autoFetch: !!parentProjectId,
  });

  // ── Upload state ──
  const [uploading, setUploading] = useState<string | null>(null);

  // ── AI modal state ──
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPreselectedTemplate, setAiPreselectedTemplate] = useState<string | undefined>();
  const [aiPreviousResultUrl, setAiPreviousResultUrl] = useState<string | null>(null);
  const [aiCustomInputs, setAiCustomInputs] = useState<Record<string, string | null>>({});
  const [aiInitialParams, setAiInitialParams] = useState<Record<string, string>>({});
  const [aiLabel, setAiLabel] = useState<string | undefined>();

  // ── Postprocess: direct API call without modal ──
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
            console.error('❌ Postprocess variant has error:', variant.error);
            alert(`Bewerken mislukt: ${variant.error}`);
            return;
          }
          if (!variant?.image_base64 && !variant?.storage_path && !variant?.presigned_url && !variant?.storage_info?.storage_path) {
            console.error('❌ Postprocess variant has no content:', variant);
            alert('Bewerken mislukt: geen resultaat ontvangen van de server.');
            return;
          }
          console.log('📝 Postprocess auto-accept starting for', postProcessingAsset);
          const result = await postProcessGen.acceptVariant(0);
          if (result) {
            console.log('✅ Postprocess auto-saved:', postProcessingAsset, result);
            await refresh();
            console.log('🔄 Profile refreshed after postprocess save');
          } else {
            console.error('❌ Postprocess save failed for', postProcessingAsset);
          }
        } catch (err) {
          console.error('❌ Postprocess auto-accept error:', err);
        } finally {
          setPostProcessingAsset(null);
          setPostProcessOutputType(null);
          postProcessGen.reset();
          postProcessSavingRef.current = false;
        }
      })();
    } else if (postProcessGen.step === 'error' && postProcessingAsset) {
      console.error('❌ Postprocess failed:', postProcessGen.error);
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
            console.error('❌ Upload auto-process variant has error:', variant.error);
            return;
          }
          if (!variant?.image_base64 && !variant?.storage_path && !variant?.presigned_url && !variant?.storage_info?.storage_path) {
            console.error('❌ Upload auto-process variant has no content:', variant);
            return;
          }
          console.log('📝 Upload auto-accept starting for', uploadProcessingAsset);
          const result = await uploadAutoGen.acceptVariant(0);
          if (result) {
            console.log('✅ Upload auto-saved:', uploadProcessingAsset, result);
            await refresh();
            console.log('🔄 Profile refreshed after upload auto-process');
          } else {
            console.error('❌ Upload auto-save failed for', uploadProcessingAsset);
          }
        } catch (err) {
          console.error('❌ Upload auto-accept error:', err);
        } finally {
          setUploadProcessingAsset(null);
          uploadAutoGen.reset();
          uploadAutoSavingRef.current = false;
        }
      })();
    } else if (uploadAutoGen.step === 'error' && uploadProcessingAsset) {
      console.error('❌ Upload auto-process failed:', uploadAutoGen.error);
      setUploadProcessingAsset(null);
      uploadAutoGen.reset();
      uploadAutoSavingRef.current = false;
    }
  }, [uploadAutoGen.step, uploadAutoGen.variants.length]);

  // ── History state ──
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyAssetType, setHistoryAssetType] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const sponsorMode = externalSponsorMode || 'club';

  const { fetchHistory, restoreAsset } = useBrandProfile({ projectId, organisationId, autoFetch: false });

  // ── Computed: effective asset helper ──
  const getEffectiveAsset = useCallback((assetType: string): { asset: BrandAsset | undefined; inherited: boolean } => {
    const own = getAsset(assetType);
    if (own) return { asset: own, inherited: false };

    if (parentProjectId && parentBrand.getAsset) {
      const parent = parentBrand.getAsset(assetType);
      if (parent) return { asset: parent, inherited: true };
    }

    return { asset: undefined, inherited: false };
  }, [getAsset, parentProjectId, parentBrand]);

  // ── Computed: base AI input assets ──
  const baseAiInputAssets = useMemo(() => {
    const getEff = (type: string) => {
      const own = getAsset(type);
      if (own) return own;
      if (parentProjectId && parentBrand.getAsset) return parentBrand.getAsset(type);
      return undefined;
    };

    const logoAsset = getEff('logo_upload');
    const sponsorAsset = getEff('sponsor_logo_upload');

    return {
      logo: logoAsset ? getAssetUrl(logoAsset.url) : null,
      sponsor: sponsorAsset ? getAssetUrl(sponsorAsset.url) : null,
    };
  }, [getAsset, parentBrand, parentProjectId]);

  // ── Handlers ──

  const handleShowHistory = useCallback(async (assetType: string) => {
    setHistoryAssetType(assetType);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    const list = await fetchHistory(assetType);
    setHistoryList(list);
    setLoadingHistory(false);
  }, [fetchHistory]);

  const handleRestore = useCallback(async (fileAssetId: string) => {
    if (!historyAssetType) return;
    if (confirm('Weet je zeker dat je deze versie wilt herstellen? De huidige versie wordt overschreven (maar blijft in de geschiedenis).')) {
      await restoreAsset(fileAssetId, historyAssetType);
      setShowHistoryModal(false);
      refresh();
    }
  }, [historyAssetType, restoreAsset, refresh]);

  const handleUpload = useCallback(async (file: File, assetType: string) => {
    setUploading(assetType);

    let folder = `${level}s`;
    let pathId = entityName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'entity';

    if (level === 'organisation') {
      folder = 'orgs';
      pathId = organisationId;
    } else if (level === 'club') {
      folder = 'clubs';
      const slug = entityName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'club';
      const pid = projectId?.toString() || '';
      pathId = pid ? `${slug}-${pid}` : slug;
    } else if (level === 'team') {
      folder = 'teams';
      const slug = entityName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'team';
      const pid = projectId?.toString() || '';
      pathId = pid ? `${slug}-${pid}` : slug;
    }

    const typeFolder = assetType.replace('_upload', '');
    const prefix = `${folder}/${pathId}/${typeFolder}`;

    const result = await uploadAsset(file, assetType, prefix, MULTI_INSTANCE_TYPES.has(assetType) ? file.name.replace(/\.[^.]+$/, '') : undefined);
    setUploading(null);

    // Auto-trigger AI processing after successful upload
    if (result) {
      const autoAi = UPLOAD_TO_AI_TEMPLATE[assetType];
      if (!autoAi) return;

      const uploadUrl = result.url ? getAssetUrl(result.url) : null;
      if (!uploadUrl) return;

      const outputType = UPLOAD_OUTPUT_TYPE[assetType];

      // Auto-process path: logo, sponsor, kits, backgrounds → fire & auto-accept
      if (outputType) {
        const inputKey = assetType === 'logo_upload' ? 'logo'
          : assetType === 'sponsor_logo_upload' ? 'sponsor'
          : 'reference';

        const params: Record<string, string> = { ...(autoAi.initialParams || {}) };
        if (parentProjectId && (autoAi.templateId === 'tenue_generate' || autoAi.templateId === 'legacy_tenue_generate' || autoAi.templateId === 'keeper_tenue')) {
          params['team_level'] = 'true';
        }

        const uploadLabel = MULTI_INSTANCE_TYPES.has(assetType)
          ? (result as any)?.label || file.name.replace(/\.[^.]+$/, '')
          : undefined;

        setUploadProcessingAsset(outputType);
        uploadAutoGen.submit({
          templateId: autoAi.templateId,
          parameters: params,
          variantCount: 1,
          projectId: projectId || '',
          organisationId,
          outputAssetType: outputType,
          label: uploadLabel,
          inputImageUrls: {
            [inputKey]: uploadUrl,
            ...(baseAiInputAssets.logo ? { logo: baseAiInputAssets.logo } : {}),
            ...(baseAiInputAssets.sponsor ? { sponsor: baseAiInputAssets.sponsor } : {}),
          },
        });
        return;
      }

      // Modal path: location_photo, club_background_upload → needs user review
      setTimeout(() => {
        const inputs: Record<string, string | null> = { ...baseAiInputAssets };
        if (assetType === 'location_photo') inputs['location'] = uploadUrl;
        if (assetType === 'club_background_upload') inputs['source'] = uploadUrl;

        setAiPreviousResultUrl(null);
        setAiPreselectedTemplate(autoAi.templateId);
        setAiInitialParams(autoAi.initialParams || {});
        setAiCustomInputs(inputs);
        if (MULTI_INSTANCE_TYPES.has(assetType)) {
          setAiLabel(file.name.replace(/\.[^.]+$/, ''));
        } else {
          setAiLabel(undefined);
        }
        setShowAiModal(true);
      }, 300);
    }
  }, [level, entityName, organisationId, projectId, parentProjectId, uploadAsset, baseAiInputAssets, uploadAutoGen]);

  const handleDelete = useCallback(async (assetType: string) => {
    await deleteAsset(assetType);
  }, [deleteAsset]);

  const handleDeleteById = useCallback(async (assetId: string) => {
    await deleteAssetById(assetId);
  }, [deleteAssetById]);

  const handleReplaceAi = useCallback((assetType: string) => {
    openAiForAsset(assetType);
  }, []);

  const handlePostProcess = useCallback((assetType: string) => {
    if (postProcessingAsset) return;

    const getEff = (type: string) => {
      const own = getAsset(type);
      if (own) return own;
      if (parentProjectId && parentBrand.getAsset) return parentBrand.getAsset(type);
      return undefined;
    };

    let templateId: string | undefined;
    if (assetType === 'logo') templateId = 'logo_postprocess';
    else if (assetType === 'sponsor_logo') templateId = 'sponsor_postprocess';
    else if (assetType.includes('kit_')) templateId = 'kit_postprocess';
    else if (assetType === 'stadium_background') templateId = 'location_postprocess';

    if (!templateId) return;

    const asset = getEff(assetType);
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
  }, [postProcessingAsset, getAsset, parentProjectId, parentBrand, projectId, organisationId, postProcessGen]);

  const openAiForAsset = useCallback((assetType: string) => {
    let templateId: string | undefined;
    let referenceAssetType: string | null = null;
    let initialParams: Record<string, string> = {};

    if (assetType === 'logo') {
      templateId = 'logo_standardize';
      referenceAssetType = 'logo_upload';
    } else if (assetType === 'sponsor_logo') {
      templateId = 'sponsor_standardize';
      referenceAssetType = 'sponsor_logo_upload';
    } else if (assetType.includes('kit_home')) {
      templateId = 'tenue_generate';
      referenceAssetType = 'kit_home_upload';
      initialParams['kit_type'] = 'home';
    } else if (assetType.includes('kit_away')) {
      templateId = 'tenue_generate';
      referenceAssetType = 'kit_away_upload';
      initialParams['kit_type'] = 'away';
    } else if (assetType.includes('kit_third')) {
      templateId = 'tenue_generate';
      referenceAssetType = 'kit_third_upload';
      initialParams['kit_type'] = 'third';
    } else if (assetType.includes('kit_goalkeeper')) {
      templateId = 'keeper_tenue';
      referenceAssetType = 'kit_goalkeeper_upload';
    } else if (assetType.includes('kit_training')) {
      templateId = 'tracksuit_generate';
      referenceAssetType = 'kit_training_upload';
    } else if (assetType.includes('kit_coach')) {
      templateId = 'coach_outfit';
      referenceAssetType = 'kit_coach_upload';
    } else if (assetType.includes('kit_assistant')) {
      templateId = 'coach_outfit';
      referenceAssetType = 'kit_assistant_upload';
    } else if (assetType.includes('kit_legacy')) {
      templateId = 'legacy_tenue_generate';
      referenceAssetType = 'kit_legacy_upload';
    }

    if (parentProjectId && (templateId === 'tenue_generate' || templateId === 'legacy_tenue_generate' || templateId === 'keeper_tenue')) {
      initialParams['team_level'] = 'true';
    }

    if (assetType === 'stadium_background') {
      templateId = 'location_standardize';
      referenceAssetType = 'location_photo';
    }

    if (assetType === 'club_background') {
      templateId = 'background_standardize';
      referenceAssetType = 'club_background_upload';
    }

    if (templateId) {
      const getEff = (type: string) => {
        const own = getAsset(type);
        if (own) return own;
        if (parentProjectId && parentBrand.getAsset) return parentBrand.getAsset(type);
        return undefined;
      };

      const asset = getEff(assetType);
      setAiPreviousResultUrl(asset ? getAssetUrl(asset.url) : null);
      setAiPreselectedTemplate(templateId);
      setAiInitialParams(initialParams);
      setAiLabel(asset?.label || undefined);

      const inputs: Record<string, string | null> = { ...baseAiInputAssets };
      if (referenceAssetType) {
        const refAsset = getEff(referenceAssetType);
        if (refAsset) {
          if (referenceAssetType === 'location_photo') {
            inputs['location'] = getAssetUrl(refAsset.url);
          } else if (referenceAssetType === 'club_background_upload') {
            inputs['source'] = getAssetUrl(refAsset.url);
          } else {
            inputs['reference'] = getAssetUrl(refAsset.url);
          }
        }
      }
      setAiCustomInputs(inputs);
      setShowAiModal(true);
    }
  }, [getAsset, parentProjectId, parentBrand, baseAiInputAssets]);

  // Fix: handleReplaceAi needs to reference openAiForAsset after it's defined
  const stableHandleReplaceAi = useCallback((assetType: string) => {
    openAiForAsset(assetType);
  }, [openAiForAsset]);

  return {
    // Brand profile
    profile,
    assets,
    loading,
    parentLoading: parentBrand.loading,
    error,
    getAsset,
    getAssets,
    getAssetUrl,
    refresh,

    // Upload state
    uploading,

    // AI modal state
    showAiModal,
    setShowAiModal,
    aiPreselectedTemplate,
    setAiPreselectedTemplate,
    aiPreviousResultUrl,
    setAiPreviousResultUrl,
    aiCustomInputs,
    setAiCustomInputs,
    aiInitialParams,
    setAiInitialParams,
    aiLabel,
    setAiLabel,

    // Processing state
    postProcessingAsset,
    uploadProcessingAsset,

    // History
    showHistoryModal,
    historyAssetType,
    historyList,
    loadingHistory,

    // Computed
    sponsorMode,
    baseAiInputAssets,

    // Handlers
    handleUpload,
    handleDelete,
    handleDeleteById,
    getEffectiveAsset,
    handleReplaceAi: stableHandleReplaceAi,
    handlePostProcess,
    handleShowHistory,
    handleRestore,
    setShowHistoryModal,
  };
}
