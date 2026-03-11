// =============================================================================
// useAssetGenModal — state, effects, handlers for AssetGenerationModal
// =============================================================================

import { useState, useMemo, useEffect, useCallback } from 'react';
import type React from 'react';
import { getTemplatesForContext, type AssetTemplate } from '../../constants/assetTemplates';
import { useAssetGeneration, type UseAssetGenerationReturn } from '../../hooks/useAssetGeneration';
import type { ModalStep, FeedbackFields, SavedAssetInfo, AssetGenerationModalProps } from './assetGenHelpers';
import {
  getPrimaryInputKey,
  mapInputKeys,
  getEffectiveOutputAssetType,
  COMPOSITE_TEMPLATE_IDS,
} from './assetGenHelpers';

// ─────────────────────────────────────────────────────────────────────────────
// Return type
// ─────────────────────────────────────────────────────────────────────────────

export interface UseAssetGenModalReturn {
  // State
  modalStep: ModalStep;
  setModalStep: React.Dispatch<React.SetStateAction<ModalStep>>;
  selectedTemplateId: string | null;
  params: Record<string, string>;
  setParams: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  variantCount: number;
  setVariantCount: React.Dispatch<React.SetStateAction<number>>;
  extraInstructions: string;
  setExtraInstructions: React.Dispatch<React.SetStateAction<string>>;
  feedbackFields: FeedbackFields;
  setFeedbackFields: React.Dispatch<React.SetStateAction<FeedbackFields>>;
  selectedVariantIdx: number | null;
  setSelectedVariantIdx: React.Dispatch<React.SetStateAction<number | null>>;
  saving: boolean;
  referenceSource: 'upload' | 'previous';
  setReferenceSource: React.Dispatch<React.SetStateAction<'upload' | 'previous'>>;
  shoeColor: string;
  setShoeColor: React.Dispatch<React.SetStateAction<string>>;
  videoProvider: string;
  setVideoProvider: React.Dispatch<React.SetStateAction<string>>;
  selectedModel: string;
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>;
  selectedBackgroundIdx: number;
  setSelectedBackgroundIdx: React.Dispatch<React.SetStateAction<number>>;
  // Derived
  templates: AssetTemplate[];
  selectedTemplate: AssetTemplate | null;
  generation: UseAssetGenerationReturn;
  stepTitle: string;
  // Handlers
  handleSelectTemplate: (id: string) => void;
  handleGenerate: () => void;
  handleAccept: () => Promise<void>;
  handleRegenerate: () => void;
  handleClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAssetGenModal(props: AssetGenerationModalProps): UseAssetGenModalReturn {
  const {
    isOpen,
    onClose,
    context,
    preSelectedTemplate,
    projectId,
    organisationId,
    membershipId,
    inputAssets = {},
    previousResultUrl,
    initialParams = {},
    label,
    onAssetSaved,
    requireApproval = false,
    availableBackgrounds = [],
  } = props;

  // ── State ──────────────────────────────────────────────────────────────────
  const [modalStep, setModalStep] = useState<ModalStep>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    preSelectedTemplate || null,
  );
  const [params, setParams] = useState<Record<string, string>>({});
  const [variantCount, setVariantCount] = useState(2);
  const [extraInstructions, setExtraInstructions] = useState('');
  const [feedbackFields, setFeedbackFields] = useState<FeedbackFields>({
    colors: '',
    pattern: '',
    logo: '',
    collar: '',
    other: '',
  });
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [referenceSource, setReferenceSource] = useState<'upload' | 'previous'>('upload');
  const [shoeColor, setShoeColor] = useState<string>('zwart');
  const [videoProvider, setVideoProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedBackgroundIdx, setSelectedBackgroundIdx] = useState<number>(0);

  const generation = useAssetGeneration();

  // ── Derived ────────────────────────────────────────────────────────────────
  const templates = useMemo(() => getTemplatesForContext(context), [context]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId],
  );

  // Stabilize initialParams reference to prevent resetting params on every render
  const initialParamsKey = JSON.stringify(initialParams ?? {});

  // ── Effects ────────────────────────────────────────────────────────────────

  // Initialize params when template changes
  useEffect(() => {
    if (selectedTemplate) {
      const defaults: Record<string, string> = {};
      Object.entries(selectedTemplate.parameters).forEach(([key, param]) => {
        defaults[key] = param.default;
      });

      // Apply initialParams overrides if any
      const overrides = JSON.parse(initialParamsKey) as Record<string, string>;
      Object.entries(overrides).forEach(([key, val]) => {
        defaults[key] = val;
      });
      setParams(defaults);
    }
  }, [selectedTemplate, initialParamsKey]);

  // Auto-select first variant when generation completes with exactly 1 variant
  useEffect(() => {
    if (generation.step === 'completed' && generation.variants.length === 1) {
      setSelectedVariantIdx(generation.variants[0].variant_index);
    }
  }, [generation.step, generation.variants]);

  // Auto-reload page after 2s when queued with requireApproval
  useEffect(() => {
    if (generation.step === 'queued' && requireApproval) {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [generation.step, requireApproval]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      if (preSelectedTemplate) {
        setSelectedTemplateId(preSelectedTemplate);
        setModalStep('configure');
      } else {
        setSelectedTemplateId(null);
        setModalStep('template');
      }
      setSelectedVariantIdx(null);
      setExtraInstructions('');
      setFeedbackFields({ colors: '', pattern: '', logo: '', collar: '', other: '' });
      setShoeColor('zwart');
      setVideoProvider('');
      setSelectedModel('');
      generation.reset();
    }
  }, [isOpen, preSelectedTemplate]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectTemplate = useCallback((id: string) => {
    setSelectedTemplateId(id);
    setModalStep('configure');
  }, []);

  const effectiveOutputAssetType = useCallback(() => {
    return getEffectiveOutputAssetType(selectedTemplate, params, context);
  }, [selectedTemplate, params, context]);

  const handleGenerate = useCallback(() => {
    if (!selectedTemplate) return;

    // Filter out nulls from inputAssets
    const validInputs: Record<string, string> = {};
    Object.entries(inputAssets).forEach(([key, val]) => {
      if (val) validInputs[key] = val;
    });

    // Override background for composite templates
    const needsBackground = COMPOSITE_TEMPLATE_IDS.includes(selectedTemplate.id);
    if (needsBackground && availableBackgrounds.length > 0) {
      const selectedBg = availableBackgrounds[selectedBackgroundIdx];
      if (selectedBg?.url) {
        validInputs['background'] = selectedBg.url;
      }
    }

    // Source picker: swap primary input with previousResultUrl when 'previous' is selected
    if (referenceSource === 'previous' && previousResultUrl) {
      const primaryKey = getPrimaryInputKey(selectedTemplate);
      if (primaryKey) {
        validInputs[primaryKey] = previousResultUrl;
      }
    }

    const mappedInputs = mapInputKeys(validInputs);

    generation.submit({
      templateId: selectedTemplate.id,
      parameters: {
        ...params,
        ...(selectedTemplate.id === 'fullbody_in_tenue' ? { shoe_color: shoeColor } : {}),
        ...(context === 'guest' ? { guest_player: 'true' } : {}),
      },
      variantCount,
      projectId,
      organisationId,
      membershipId,
      outputAssetType: effectiveOutputAssetType(),
      inputImageUrls: mappedInputs,
      userPrompt: extraInstructions,
      ...(videoProvider ? { provider: videoProvider } : {}),
      ...(selectedModel ? { model: selectedModel } : {}),
      ...(label ? { label } : {}),
      requireApproval,
    });
    setModalStep('results');
  }, [
    selectedTemplate, inputAssets, availableBackgrounds, selectedBackgroundIdx,
    referenceSource, previousResultUrl, params, shoeColor, context,
    variantCount, projectId, organisationId, membershipId, effectiveOutputAssetType,
    extraInstructions, videoProvider, selectedModel, label, requireApproval, generation,
  ]);

  const handleAccept = useCallback(async () => {
    if (selectedVariantIdx === null) return;
    setSaving(true);
    const saveResult = await generation.acceptVariant(selectedVariantIdx);
    setSaving(false);
    if (saveResult) {
      const selectedVariant = generation.variants.find(
        (v) => v.variant_index === selectedVariantIdx,
      );
      const storagePath =
        saveResult.storage_path ||
        selectedVariant?.storage_path ||
        selectedVariant?.storage_info?.storage_path ||
        null;
      const savedInfo: SavedAssetInfo = {
        storagePath,
        assetType: saveResult.asset_type || effectiveOutputAssetType(),
        presignedUrl: saveResult.presigned_url || selectedVariant?.presigned_url || null,
      };
      onAssetSaved?.(savedInfo);
      onClose();
    }
  }, [selectedVariantIdx, generation, effectiveOutputAssetType, onAssetSaved, onClose]);

  const handleRegenerate = useCallback(() => {
    if (!selectedTemplate) return;

    const validInputs: Record<string, string> = {};
    Object.entries(inputAssets).forEach(([key, val]) => {
      if (val) validInputs[key] = val;
    });

    // Override background for composite templates
    if (
      COMPOSITE_TEMPLATE_IDS.includes(selectedTemplate.id) &&
      availableBackgrounds.length > 0
    ) {
      const selectedBg = availableBackgrounds[selectedBackgroundIdx];
      if (selectedBg?.url) {
        validInputs['background'] = selectedBg.url;
      }
    }

    // On regeneration, use last generated result as reference input
    const primaryKey = getPrimaryInputKey(selectedTemplate);
    const base64Inputs: Record<string, string> = {};

    if (primaryKey) {
      const bestVariant =
        selectedVariantIdx !== null
          ? generation.variants.find((v) => v.variant_index === selectedVariantIdx)
          : generation.variants[0];

      if (bestVariant?.presigned_url) {
        validInputs[primaryKey] = bestVariant.presigned_url;
      } else if (bestVariant?.image_base64) {
        const backendKey =
          primaryKey === 'person'
            ? 'person_photo'
            : primaryKey === 'reference'
              ? 'reference_photo'
              : primaryKey;
        base64Inputs[backendKey] = bestVariant.image_base64;
        delete validInputs[primaryKey];
      } else if (referenceSource === 'previous' && previousResultUrl) {
        validInputs[primaryKey] = previousResultUrl;
      }
    }

    const mappedInputs = mapInputKeys(validInputs);

    // Combine instructions with feedback
    let prompt = extraInstructions;
    const parts: string[] = [];
    if (feedbackFields.colors) parts.push(`KLEUREN: ${feedbackFields.colors}`);
    if (feedbackFields.pattern) parts.push(`PATROON: ${feedbackFields.pattern}`);
    if (feedbackFields.logo) parts.push(`LOGOS/SPONSOR: ${feedbackFields.logo}`);
    if (feedbackFields.collar) parts.push(`KRAAG/MOUWEN: ${feedbackFields.collar}`);
    if (feedbackFields.other) parts.push(`OVERIG: ${feedbackFields.other}`);

    if (parts.length > 0) {
      const feedbackBlock = parts.join('\n- ');
      prompt = prompt
        ? `${prompt}\n\nFEEDBACK/REFINEMENT:\n- ${feedbackBlock}`
        : `FEEDBACK/REFINEMENT:\n- ${feedbackBlock}`;
    }

    setSelectedVariantIdx(null);
    generation.submit({
      templateId: selectedTemplate.id,
      parameters: {
        ...params,
        ...(selectedTemplate.id === 'fullbody_in_tenue' ? { shoe_color: shoeColor } : {}),
        ...(context === 'guest' ? { guest_player: 'true' } : {}),
      },
      variantCount,
      projectId,
      organisationId,
      membershipId,
      outputAssetType: effectiveOutputAssetType(),
      inputImageUrls: mappedInputs,
      inputImages: Object.keys(base64Inputs).length > 0 ? base64Inputs : undefined,
      userPrompt: prompt,
      ...(videoProvider ? { provider: videoProvider } : {}),
      ...(selectedModel ? { model: selectedModel } : {}),
      ...(label ? { label } : {}),
      requireApproval,
    });
  }, [
    selectedTemplate, inputAssets, availableBackgrounds, selectedBackgroundIdx,
    selectedVariantIdx, generation, referenceSource, previousResultUrl,
    extraInstructions, feedbackFields, params, shoeColor, context,
    variantCount, projectId, organisationId, membershipId, effectiveOutputAssetType,
    videoProvider, selectedModel, label, requireApproval,
  ]);

  const handleClose = useCallback(() => {
    generation.reset();
    onClose();
  }, [generation, onClose]);

  // ── Step title ─────────────────────────────────────────────────────────────
  const stepTitle = useMemo(() => {
    const titles: Record<ModalStep, string> = {
      template: 'Stap 1 \u2014 Kies type',
      configure: 'Stap 2 \u2014 Instellingen',
      results:
        generation.step === 'queued'
          ? 'In de wachtrij gezet \u2705'
          : generation.step === 'polling'
            ? 'Video wordt gegenereerd...'
            : 'Stap 3 \u2014 Resultaten',
    };
    return titles[modalStep];
  }, [modalStep, generation.step]);

  // ── Return ─────────────────────────────────────────────────────────────────
  return {
    // State
    modalStep,
    setModalStep,
    selectedTemplateId,
    params,
    setParams,
    variantCount,
    setVariantCount,
    extraInstructions,
    setExtraInstructions,
    feedbackFields,
    setFeedbackFields,
    selectedVariantIdx,
    setSelectedVariantIdx,
    saving,
    referenceSource,
    setReferenceSource,
    shoeColor,
    setShoeColor,
    videoProvider,
    setVideoProvider,
    selectedModel,
    setSelectedModel,
    selectedBackgroundIdx,
    setSelectedBackgroundIdx,

    // Derived
    templates,
    selectedTemplate,
    generation,
    stepTitle,

    // Handlers
    handleSelectTemplate,
    handleGenerate,
    handleAccept,
    handleRegenerate,
    handleClose,
  };
}
