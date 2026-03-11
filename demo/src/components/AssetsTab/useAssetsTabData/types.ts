/**
 * useAssetsTabData/types.ts
 * Props and return type for the AssetsTab data hook.
 */

import type { BrandAsset, BrandProfile } from '../../../hooks/useBrandProfile';
import type { HistoryItem } from '../AssetSubComponents';

export type AssetsLevel = 'organisation' | 'club' | 'team' | 'season' | 'match' | 'member';

export interface UseAssetsTabDataProps {
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
  profile: BrandProfile | null;
  assets: BrandAsset[];
  loading: boolean;
  parentLoading: boolean;
  error: string | null;
  getAsset: (assetType: string) => BrandAsset | undefined;
  getAssets: (assetType: string) => BrandAsset[];
  getAssetUrl: (url: string | undefined) => string | null;
  refresh: () => Promise<void>;

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
