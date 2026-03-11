/**
 * useAssetsTabData/handlers.ts
 * Event handlers for asset upload, delete, AI modal, and history.
 */

import { useCallback } from 'react';
import { getAssetUrl, MULTI_INSTANCE_TYPES, type BrandAsset } from '../../../hooks/useBrandProfile';
import { UPLOAD_OUTPUT_TYPE, UPLOAD_TO_AI_TEMPLATE } from '../assetsTabHelpers';
import type { AssetsLevel } from './types';
import type { HistoryItem } from '../AssetSubComponents';

interface UseAssetHandlersParams {
  level: AssetsLevel;
  entityName?: string;
  organisationId: string;
  projectId?: string | number | null;
  parentProjectId?: string | number | null;
  uploadAsset: (file: File, assetType: string, prefix: string, label?: string) => Promise<BrandAsset | null>;
  deleteAsset: (assetType: string) => Promise<boolean>;
  deleteAssetById: (assetId: string) => Promise<boolean>;
  fetchHistory: (assetType: string) => Promise<HistoryItem[]>;
  restoreAsset: (fileAssetId: string, assetType: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  getAsset: (assetType: string) => BrandAsset | undefined;
  parentGetAsset: ((assetType: string) => BrandAsset | undefined) | undefined;
  baseAiInputAssets: { logo: string | null; sponsor: string | null };
  startUploadAutoProcess: (outputType: string, params: any) => void;
  // State setters
  setUploading: (v: string | null) => void;
  setShowAiModal: (v: boolean) => void;
  setAiPreselectedTemplate: (v: string | undefined) => void;
  setAiPreviousResultUrl: (v: string | null) => void;
  setAiCustomInputs: (v: Record<string, string | null>) => void;
  setAiInitialParams: (v: Record<string, string>) => void;
  setAiLabel: (v: string | undefined) => void;
  setShowHistoryModal: (v: boolean) => void;
  setHistoryAssetType: (v: string | null) => void;
  setHistoryList: (v: HistoryItem[]) => void;
  setLoadingHistory: (v: boolean) => void;
  historyAssetType: string | null;
}

export function useAssetHandlers({
  level,
  entityName,
  organisationId,
  projectId,
  parentProjectId,
  uploadAsset,
  deleteAsset,
  deleteAssetById,
  fetchHistory,
  restoreAsset,
  refresh,
  getAsset,
  parentGetAsset,
  baseAiInputAssets,
  startUploadAutoProcess,
  setUploading,
  setShowAiModal,
  setAiPreselectedTemplate,
  setAiPreviousResultUrl,
  setAiCustomInputs,
  setAiInitialParams,
  setAiLabel,
  setShowHistoryModal,
  setHistoryAssetType,
  setHistoryList,
  setLoadingHistory,
  historyAssetType,
}: UseAssetHandlersParams) {

  const handleShowHistory = useCallback(async (assetType: string) => {
    setHistoryAssetType(assetType);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    const list = await fetchHistory(assetType);
    setHistoryList(list);
    setLoadingHistory(false);
  }, [fetchHistory, setHistoryAssetType, setShowHistoryModal, setLoadingHistory, setHistoryList]);

  const handleRestore = useCallback(async (fileAssetId: string) => {
    if (!historyAssetType) return;
    if (confirm('Weet je zeker dat je deze versie wilt herstellen? De huidige versie wordt overschreven (maar blijft in de geschiedenis).')) {
      await restoreAsset(fileAssetId, historyAssetType);
      setShowHistoryModal(false);
      refresh();
    }
  }, [historyAssetType, restoreAsset, refresh, setShowHistoryModal]);

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

        startUploadAutoProcess(outputType, {
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
  }, [level, entityName, organisationId, projectId, parentProjectId, uploadAsset, baseAiInputAssets, startUploadAutoProcess, setUploading, setShowAiModal, setAiPreselectedTemplate, setAiPreviousResultUrl, setAiCustomInputs, setAiInitialParams, setAiLabel]);

  const handleDelete = useCallback(async (assetType: string) => {
    await deleteAsset(assetType);
  }, [deleteAsset]);

  const handleDeleteById = useCallback(async (assetId: string) => {
    await deleteAssetById(assetId);
  }, [deleteAssetById]);

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
        if (parentProjectId && parentGetAsset) return parentGetAsset(type);
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
  }, [getAsset, parentProjectId, parentGetAsset, baseAiInputAssets, setAiPreviousResultUrl, setAiPreselectedTemplate, setAiInitialParams, setAiLabel, setAiCustomInputs, setShowAiModal]);

  const handleReplaceAi = useCallback((assetType: string) => {
    openAiForAsset(assetType);
  }, [openAiForAsset]);

  return {
    handleShowHistory,
    handleRestore,
    handleUpload,
    handleDelete,
    handleDeleteById,
    handleReplaceAi,
  };
}
