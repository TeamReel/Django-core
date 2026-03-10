/**
 * useAssetsTabData/index.ts
 * Main orchestrator hook for AssetsTab state management.
 *
 * Extracted from AssetsTab.tsx. Contains all state, effects, and handler functions.
 */

import { useState } from 'react';
import {
  useBrandProfile,
  getAssetUrl,
} from '../../../hooks/useBrandProfile';
import { useAssetAutoProcessing } from '../useAssetAutoProcessing';
import type { HistoryItem } from '../AssetSubComponents';
import type { UseAssetsTabDataProps, AssetsTabData } from './types';
import { useDerivedAssets } from './derived';
import { useAssetHandlers } from './handlers';

// Re-export types
export type { UseAssetsTabDataProps, AssetsTabData, AssetsLevel } from './types';

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

  // ── Auto-processing (sub-hook) ──
  const { postProcessingAsset, uploadProcessingAsset, handlePostProcess, startUploadAutoProcess } = useAssetAutoProcessing({
    refresh,
    getAsset,
    parentGetAsset: parentBrand.getAsset,
    parentProjectId,
    projectId,
    organisationId,
  });

  // ── History state ──
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyAssetType, setHistoryAssetType] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const sponsorMode = externalSponsorMode || 'club';

  const { fetchHistory, restoreAsset } = useBrandProfile({ projectId, organisationId, autoFetch: false });

  // ── Derived state ──
  const { getEffectiveAsset, baseAiInputAssets } = useDerivedAssets({
    getAsset,
    parentProjectId,
    parentGetAsset: parentBrand.getAsset,
  });

  // ── Handlers ──
  const {
    handleShowHistory,
    handleRestore,
    handleUpload,
    handleDelete,
    handleDeleteById,
    handleReplaceAi,
  } = useAssetHandlers({
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
    parentGetAsset: parentBrand.getAsset,
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
  });

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
    handleReplaceAi,
    handlePostProcess,
    handleShowHistory,
    handleRestore,
    setShowHistoryModal,
  };
}
