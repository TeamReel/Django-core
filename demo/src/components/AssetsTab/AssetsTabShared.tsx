/**
 * AssetsTabShared — Shared sub-components used by both Club and Team levels.
 *
 * Extracted from AssetsTab.tsx to eliminate duplication between club and team.
 */

import React from 'react';
import { AssetGenerationModal } from '../AssetGenerationModal';
import { HistoryModal } from './AssetSubComponents';
import type { AssetsTabData } from './useAssetsTabData';
import s from './AssetsTab.module.css';

// ============================================================================
// Types
// ============================================================================

interface SharedModalsProps {
  d: AssetsTabData;
  projectId: string | number;
  organisationId: string;
}

interface AiButtonsRowProps {
  d: AssetsTabData;
}

// ============================================================================
// SharedAssetModals — HistoryModal + AssetGenerationModal overlay
// ============================================================================

export const SharedAssetModals: React.FC<SharedModalsProps> = ({ d, projectId, organisationId }) => (
  <>
    <HistoryModal
      show={d.showHistoryModal}
      loading={d.loadingHistory}
      list={d.historyList}
      onClose={() => d.setShowHistoryModal(false)}
      onRestore={d.handleRestore}
    />

    {/* Spinner animation for postprocess overlay */}
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

    <AssetGenerationModal
      isOpen={d.showAiModal}
      onClose={() => { d.setShowAiModal(false); d.setAiPreviousResultUrl(null); d.setAiLabel(undefined); }}
      context="club"
      preSelectedTemplate={d.aiPreselectedTemplate}
      projectId={projectId || ''}
      organisationId={organisationId}
      inputAssets={d.aiCustomInputs}
      previousResultUrl={d.aiPreviousResultUrl}
      initialParams={d.aiInitialParams}
      label={d.aiLabel}
      onAssetSaved={d.refresh}
    />
  </>
);

// ============================================================================
// AiButtonsRow — Quick AI generation buttons
// ============================================================================

export const AiButtonsRow: React.FC<AiButtonsRowProps> = ({ d }) => (
  <div className="flex-row gap-8 mb-20 flex-wrap">
    <button
      onClick={() => { d.setAiPreselectedTemplate(undefined); d.setAiInitialParams({}); d.setAiCustomInputs(d.baseAiInputAssets); d.setShowAiModal(true); }}
      className={s.aiGradientBtn}
    >
      🎨 AI Asset Genereren
    </button>
    <button
      onClick={() => { d.setAiPreselectedTemplate('tenue_generate'); d.setAiInitialParams({ kit_type: 'home' }); d.setAiCustomInputs(d.baseAiInputAssets); d.setShowAiModal(true); }}
      className={s.quickBtn}
    >
      👕 Tenue
    </button>
    <button
      onClick={() => { d.setAiPreselectedTemplate('keeper_tenue'); d.setAiInitialParams({}); d.setAiCustomInputs(d.baseAiInputAssets); d.setShowAiModal(true); }}
      className={s.quickBtn}
    >
      🧤 Keeper
    </button>
    <button
      onClick={() => { d.setAiPreselectedTemplate('tracksuit_generate'); d.setAiInitialParams({}); d.setAiCustomInputs(d.baseAiInputAssets); d.setShowAiModal(true); }}
      className={s.quickBtn}
    >
      🏃 Training
    </button>
  </div>
);
