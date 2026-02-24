/**
 * AssetGenerationModal — AI Asset Generation Wizard
 *
 * 3-step modal for generating AI assets:
 * 1. Select template type (logo, tenue, keeper, etc.)
 * 2. Configure parameters (sleeves, neck, color, count)
 * 3. View results, select best variant, save
 *
 * Integrates with:
 * - assetTemplates.ts (template definitions)
 * - useAssetGeneration hook (API flow)
 * - useBrandProfile (save accepted variant)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Button, Badge } from '@django-core/design-system';
import {
  ASSET_TEMPLATES,
  getTemplatesForContext,
  type AssetTemplate,
} from '../../constants/assetTemplates';
import { useAssetGeneration } from '../../hooks/useAssetGeneration';

// ============================================================================
// Types
// ============================================================================

// Helper to detect mime type from base64 signature
function getSecureMimeType(base64: string | null, declaredType: string | undefined | null): string {
  if (!base64) return declaredType || 'image/png';
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return declaredType || 'image/png';
}

/** Info about a saved asset returned from the callback */
export interface SavedAssetInfo {
  storagePath: string | null;
  assetType: string;
  presignedUrl?: string | null;
}

interface AssetGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Context: which templates to show */
  context: 'club' | 'member' | 'guest';
  /** Pre-selected template ID (from asset card button) */
  preSelectedTemplate?: string;
  /** Project (club/team) ID */
  projectId: string | number;
  /** Organisation ID */
  organisationId: string;
  /** Membership ID — for member-scoped S3 storage (videos, fullbody, closeup) */
  membershipId?: string;
  /** Available input assets (logo, sponsor, etc) as URLs */
  inputAssets?: Record<string, string | null>;
  /** Previous AI Result URL (for improvements) */
  previousResultUrl?: string | null;
  /** Initial parameter overrides (e.g. for pre-selecting output type) */
  initialParams?: Record<string, string>;
  /** Label for multi-instance asset types (e.g. club backgrounds) — passed through to save endpoint */
  label?: string;
  /** Callback after a variant is accepted and saved. Receives info about the saved asset. */
  onAssetSaved?: (info?: SavedAssetInfo) => void;
  /** Route through approval queue instead of auto-saving (shows different message) */
  requireApproval?: boolean;
}

type ModalStep = 'template' | 'configure' | 'results';

// ============================================================================
// Sub-components
// ============================================================================

function TemplateCard({
  template,
  selected,
  onClick,
}: {
  template: AssetTemplate;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '16px 12px',
        border: selected
          ? '2px solid var(--vscode-focusBorder, #007fd4)'
          : '1px solid var(--vscode-widget-border, #333)',
        borderRadius: 8,
        background: selected
          ? 'var(--vscode-list-activeSelectionBackground, #094771)'
          : 'var(--vscode-editor-background, #1e1e1e)',
        color: 'var(--vscode-foreground, #ccc)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        minWidth: 100,
      }}
    >
      <span style={{ fontSize: 28 }}>{template.icon}</span>
      <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
        {template.name}
      </span>
      <span
        style={{
          fontSize: 10,
          color: 'var(--vscode-descriptionForeground, #888)',
          textAlign: 'center',
        }}
      >
        {template.creditsCost} credit{template.creditsCost > 1 ? 's' : ''} / variant
      </span>
    </button>
  );
}

function ParameterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 4,
          color: 'var(--vscode-foreground, #ccc)',
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 10px',
          fontSize: 13,
          background: 'var(--vscode-input-background, #3c3c3c)',
          color: 'var(--vscode-input-foreground, #ccc)',
          border: '1px solid var(--vscode-input-border, #3c3c3c)',
          borderRadius: 4,
          outline: 'none',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function VariantCard({
  variant,
  selected,
  onClick,
  isVideo = false,
}: {
  variant: {
    variant_index: number;
    image_base64?: string | null;
    video_base64?: string | null;
    video_url?: string | null;
    presigned_url?: string | null;
    storage_path?: string | null;
    mime_type: string | null;
    error?: string | null;
  };
  selected: boolean;
  onClick: () => void;
  isVideo?: boolean;
}) {
  let mediaSrc: string | undefined;
  // Determine if this is actually video content:
  // - explicit isVideo prop (from template outputType)
  // - video_base64 or video_url present (clear video signals)
  // - mime_type starts with 'video/'
  // NOTE: presigned_url is NOT a video signal — it's just a signed S3 URL for any file type
  const isVideoContent = isVideo || !!variant.video_base64 || !!variant.video_url || (variant.mime_type?.startsWith('video/') ?? false);

  if (isVideoContent) {
    // Video: prefer video_url, then presigned_url (as fallback for video), then base64
    const videoUrl = variant.video_url || variant.presigned_url;
    if (videoUrl) {
      mediaSrc = videoUrl;
    } else if (variant.video_base64) {
      const mime = variant.mime_type || 'video/mp4';
      mediaSrc = `data:${mime};base64,${variant.video_base64}`;
    }
  } else if (variant.image_base64) {
    // Image from base64
    const mime = getSecureMimeType(variant.image_base64, variant.mime_type);
    mediaSrc = `data:${mime};base64,${variant.image_base64}`;
  } else if (variant.presigned_url) {
    // Image from presigned URL (no base64 available but S3 URL exists)
    mediaSrc = variant.presigned_url;
  }

  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        border: selected
          ? '3px solid #10b981'
          : '1px solid var(--vscode-widget-border, #333)',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        padding: 0,
        background: 'transparent',
      }}
    >
      {mediaSrc ? (
        isVideoContent ? (
          <video
            src={mediaSrc}
            style={{
              width: '100%',
              aspectRatio: '9 / 16',
              objectFit: 'cover',
              display: 'block',
            }}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img
            src={mediaSrc}
            alt={`Variant ${variant.variant_index + 1}`}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              objectFit: 'contain',
              background: '#1a1a1a',
            }}
          />
        )
      ) : (
        <div
          style={{
            width: '100%',
            aspectRatio: isVideoContent ? '9 / 16' : '3 / 4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--vscode-input-background, #3c3c3c)',
            color: '#ef4444',
            fontSize: 12,
            padding: 8,
            textAlign: 'center',
          }}
        >
          {variant.error || (isVideoContent ? 'Geen video' : 'Geen afbeelding')}
        </div>
      )}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            background: '#10b981',
            color: '#fff',
            width: 24,
            height: 24,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          ✓
        </div>
      )}
      {/* Video indicator */}
      {isVideoContent && mediaSrc && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 10,
          }}
        >
          🎬 Video
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: '4px 8px',
          fontSize: 11,
          textAlign: 'center',
        }}
      >
        Variant {variant.variant_index + 1}
      </div>
    </button>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: 6,
        background: 'var(--vscode-progressBar-background, #333)',
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          background: 'var(--vscode-progressBar-background, #0078d4)',
          borderRadius: 3,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
}

// ============================================================================
// Main Modal
// ============================================================================

export default function AssetGenerationModal({
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
}: AssetGenerationModalProps) {
  // State
  const [modalStep, setModalStep] = useState<ModalStep>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    preSelectedTemplate || null
  );
  const [params, setParams] = useState<Record<string, string>>({});
  const [variantCount, setVariantCount] = useState(2);
  const [extraInstructions, setExtraInstructions] = useState('');
  const [feedbackFields, setFeedbackFields] = useState({
      colors: '',
      pattern: '',
      logo: '',
      collar: '',
      other: ''
  });
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [referenceSource, setReferenceSource] = useState<'upload' | 'previous'>('upload'); // Default: use original upload
  const [shoeColor, setShoeColor] = useState<string>('zwart'); // For fullbody_in_tenue template
  const [videoProvider, setVideoProvider] = useState<string>(''); // '' = auto-select
  const [selectedModel, setSelectedModel] = useState<string>(''); // '' = provider default

  const generation = useAssetGeneration();

  // Available templates for this context
  const templates = useMemo(() => getTemplatesForContext(context), [context]);

  // Selected template object
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  // Stabilize initialParams reference to prevent resetting params on every render
  const initialParamsKey = JSON.stringify(initialParams ?? {});

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate, initialParamsKey]);

  // Auto-select first variant when generation completes with exactly 1 variant
  useEffect(() => {
    if (generation.step === 'completed' && generation.variants.length === 1) {
      setSelectedVariantIdx(generation.variants[0].variant_index);
    }
  }, [generation.step, generation.variants]);

  // Auto-reload page after 2s when queued with requireApproval (so approved asset appears after refresh)
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

  if (!isOpen) return null;

  // Helper: determine which input key is the "primary" for source switching
  // This is the key that gets swapped when user picks "Vorige AI versie" vs "Upload"
  const _getPrimaryInputKey = (tmpl: AssetTemplate): string | null => {
    // Postprocess templates use 'source' as the primary input
    if (tmpl.inputRequirements.includes('source')) return 'source';
    // Templates with only one relevant input: logo/sponsor/location
    if (tmpl.id === 'logo_standardize') return 'logo';
    if (tmpl.id === 'sponsor_standardize') return 'sponsor';
    if (tmpl.id === 'location_standardize') return 'location';
    // Kit templates use 'reference' as the primary switchable input
    if (tmpl.inputRequirements.includes('reference')) return 'reference';
    return null;
  };

  // Handlers
  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    setModalStep('configure');
  };

  const handleGenerate = () => {
    if (!selectedTemplate) return;

    // Filter out nulls from inputAssets
    const validInputs: Record<string, string> = {};
    Object.entries(inputAssets).forEach(([key, val]) => {
      if (val) validInputs[key] = val;
    });

    // Source picker: swap the primary input with previousResultUrl when 'previous' is selected
    if (referenceSource === 'previous' && previousResultUrl) {
      // Determine which input key is the "primary" for this template
      const primaryKey = _getPrimaryInputKey(selectedTemplate);
      if (primaryKey) {
        validInputs[primaryKey] = previousResultUrl;
      }
    }

    // Map frontend keys to backend expected keys
    // Frontend uses: person, reference
    // Backend expects: person_photo, reference_photo
    const mappedInputs: Record<string, string> = {};
    Object.entries(validInputs).forEach(([key, val]) => {
      if (key === 'person') {
        mappedInputs['person_photo'] = val;
      } else if (key === 'reference') {
        mappedInputs['reference_photo'] = val;
      } else {
        mappedInputs[key] = val;
      }
    });

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
      outputAssetType: getEffectiveOutputAssetType(),
      inputImageUrls: mappedInputs,
      userPrompt: extraInstructions,
      ...(videoProvider ? { provider: videoProvider } : {}),
      ...(selectedModel ? { model: selectedModel } : {}),
      ...(label ? { label } : {}),
      requireApproval,
    });
    setModalStep('results');
  };

  const handleAccept = async () => {
    if (selectedVariantIdx === null) return;
    setSaving(true);
    const saveResult = await generation.acceptVariant(selectedVariantIdx);
    setSaving(false);
    if (saveResult) {
      // Build savedInfo: prefer save response storage_path (authoritative from backend),
      // then variant top-level storage_path, then storage_info, then presigned_url as last resort
      const selectedVariant = generation.variants.find(v => v.variant_index === selectedVariantIdx);
      const storagePath = saveResult.storage_path
        || selectedVariant?.storage_path
        || selectedVariant?.storage_info?.storage_path
        || null;
      const savedInfo: SavedAssetInfo = {
        storagePath,
        assetType: saveResult.asset_type || getEffectiveOutputAssetType(),
        presignedUrl: saveResult.presigned_url || selectedVariant?.presigned_url || null,
      };
      console.log('💾 Saved asset info:', savedInfo);
      onAssetSaved?.(savedInfo);
      onClose();
    }
  };

  // Helper to determine effective output asset type based on template and params
  const getEffectiveOutputAssetType = () => {
    if (!selectedTemplate) return 'unknown';

    // Guest context: use guest_player prefix for all asset types
    if (context === 'guest') {
      if (selectedTemplate.id === 'fullbody_in_tenue') return 'guest_player';
      if (selectedTemplate.id === 'closeup_in_tenue') return 'guest_player_closeup';
      if (selectedTemplate.id === 'member_intro') return 'guest_player_intro';
      if (selectedTemplate.id === 'member_goal_celebration') return 'guest_player_celebration';
      return 'guest_player';
    }

    let effectiveOutputAssetType = selectedTemplate.outputAssetType;
    if (selectedTemplate.id === 'tenue_generate') {
      if (params['kit_type'] === 'away') effectiveOutputAssetType = 'kit_away';
      else if (params['kit_type'] === 'third') effectiveOutputAssetType = 'kit_third';
      else effectiveOutputAssetType = 'kit_home';
    } else if (selectedTemplate.id === 'fullbody_in_tenue') {
      const kitType = params['kit_type'] || 'home';
      effectiveOutputAssetType = `member_in_tenue_${kitType}`;
    } else if (selectedTemplate.id === 'closeup_in_tenue') {
      const kitType = params['kit_type'] || 'home';
      effectiveOutputAssetType = `member_closeup_${kitType}`;
    }
    return effectiveOutputAssetType;
  };

  const handleRegenerate = () => {
    if (!selectedTemplate) return;

    // Start from the original inputs
    const validInputs: Record<string, string> = {};
    Object.entries(inputAssets).forEach(([key, val]) => {
      if (val) validInputs[key] = val;
    });

    // ── KEY FIX: On regeneration, ALWAYS use the last generated result as
    // the reference input so the AI can iterate on its own output.
    // This replaces the primary input key (reference, logo, sponsor, etc.)
    // with the presigned_url of the best variant from the previous run.
    const primaryKey = _getPrimaryInputKey(selectedTemplate);
    const base64Inputs: Record<string, string> = {}; // For variants where we only have base64

    if (primaryKey) {
      // Priority: selected variant > first variant > original previousResultUrl
      const bestVariant = selectedVariantIdx !== null
        ? generation.variants.find(v => v.variant_index === selectedVariantIdx)
        : generation.variants[0];

      if (bestVariant?.presigned_url) {
        // Best case: S3 presigned URL is fetchable by backend
        validInputs[primaryKey] = bestVariant.presigned_url;
        console.log(`♻️ Regenerate: using presigned_url as ${primaryKey}`);
      } else if (bestVariant?.image_base64) {
        // Fallback: send raw base64 via input_images instead of input_image_urls
        // Map to backend key (reference→reference_photo, etc.)
        const backendKey = primaryKey === 'person' ? 'person_photo'
          : primaryKey === 'reference' ? 'reference_photo'
          : primaryKey;
        base64Inputs[backendKey] = bestVariant.image_base64;
        // Remove from URL inputs to avoid conflict
        delete validInputs[primaryKey];
        console.log(`♻️ Regenerate: using image_base64 as ${backendKey}`);
      } else if (referenceSource === 'previous' && previousResultUrl) {
        // Fallback: use the previousResultUrl from when modal opened
        validInputs[primaryKey] = previousResultUrl;
      }
      // else: keep original upload as-is
    }

    // Map frontend keys to backend expected keys
    const mappedInputs: Record<string, string> = {};
    Object.entries(validInputs).forEach(([key, val]) => {
      if (key === 'person') {
        mappedInputs['person_photo'] = val;
      } else if (key === 'reference') {
        mappedInputs['reference_photo'] = val;
      } else {
        mappedInputs[key] = val;
      }
    });

    // Combine original instructions with new feedback if present
    let prompt = extraInstructions;

    const parts = [];
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
      outputAssetType: getEffectiveOutputAssetType(),
      inputImageUrls: mappedInputs,
      inputImages: Object.keys(base64Inputs).length > 0 ? base64Inputs : undefined,
      userPrompt: prompt,
      ...(videoProvider ? { provider: videoProvider } : {}),
      ...(selectedModel ? { model: selectedModel } : {}),
      ...(label ? { label } : {}),
      requireApproval,
    });
  };

  const handleClose = () => {
    generation.reset();
    onClose();
  };

  // Step title
  const stepTitles: Record<ModalStep, string> = {
    template: 'Stap 1 — Kies type',
    configure: 'Stap 2 — Instellingen',
    results: generation.step === 'queued' ? 'In de wachtrij gezet ✅'
      : generation.step === 'polling' ? 'Video wordt gegenereerd...'
      : 'Stap 3 — Resultaten',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '94vw',
          maxWidth: 800,
          maxHeight: '92vh',
          background: 'var(--vscode-editor-background, #1e1e1e)',
          border: '1px solid var(--vscode-widget-border, #333)',
          borderRadius: 12,
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--vscode-widget-border, #333)',
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              🎨 AI Asset Genereren
            </h2>
            <p
              style={{
                fontSize: 12,
                color: 'var(--vscode-descriptionForeground, #888)',
                margin: '4px 0 0',
              }}
            >
              {stepTitles[modalStep]}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--vscode-foreground, #ccc)',
              fontSize: 20,
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {/* ── STEP 1: Template Selection ── */}
          {modalStep === 'template' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 12,
              }}
            >
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={selectedTemplateId === t.id}
                  onClick={() => handleSelectTemplate(t.id)}
                />
              ))}
            </div>
          )}

          {/* ── STEP 2: Configure Parameters ── */}
          {modalStep === 'configure' && selectedTemplate && (
            <div>
              {/* Template info */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: 'var(--vscode-editor-inactiveSelectionBackground, #2a2a2a)',
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 32 }}>{selectedTemplate.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {selectedTemplate.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--vscode-descriptionForeground, #888)',
                    }}
                  >
                    {selectedTemplate.description}
                  </div>
                </div>
              </div>

              {/* Source Selection — shown whenever there's a previous AI result to choose from */}
              {previousResultUrl && _getPrimaryInputKey(selectedTemplate) && (
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 6,
                      color: 'var(--vscode-foreground, #ccc)',
                    }}
                  >
                    Input Bron
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setReferenceSource('upload')}
                      style={{
                         flex: 1,
                         padding: '8px 12px',
                         border: referenceSource === 'upload' ? '2px solid var(--vscode-focusBorder, #007fd4)' : '1px solid var(--vscode-widget-border, #333)',
                         background: referenceSource === 'upload' ? 'var(--vscode-list-activeSelectionBackground, #094771)' : 'transparent',
                         color: 'var(--vscode-foreground, #ccc)',
                         borderRadius: 6,
                         cursor: 'pointer',
                         fontSize: 13,
                         textAlign: 'center'
                      }}
                    >
                       📤 Originele Upload
                    </button>
                    <button
                      onClick={() => setReferenceSource('previous')}
                      style={{
                         flex: 1,
                         padding: '8px 12px',
                         border: referenceSource === 'previous' ? '2px solid var(--vscode-focusBorder, #007fd4)' : '1px solid var(--vscode-widget-border, #333)',
                         background: referenceSource === 'previous' ? 'var(--vscode-list-activeSelectionBackground, #094771)' : 'transparent',
                         color: 'var(--vscode-foreground, #ccc)',
                         borderRadius: 6,
                         cursor: 'pointer',
                         fontSize: 13,
                         textAlign: 'center'
                      }}
                    >
                       🎨 Huidige AI Versie
                    </button>
                  </div>
                   <div style={{ fontSize: 11, color: '#888', marginTop: 4}}>
                      {referenceSource === 'upload'
                        ? 'Gebruikt de origineel geüploade afbeelding als basis.'
                        : 'Gebruikt het huidige AI resultaat als basis voor verdere aanpassingen.'}
                   </div>
                </div>
              )}

              {/* Parameters */}
              {Object.entries(selectedTemplate.parameters).map(([key, param]) => {
                // Check visibility condition
                if (param.visibleIf) {
                  const dependencyValue = params[param.visibleIf.param];
                  if (param.visibleIf.includes) {
                    if (!param.visibleIf.includes.includes(dependencyValue)) {
                      return null;
                    }
                  } else if (param.visibleIf.excludes) {
                    if (param.visibleIf.excludes.includes(dependencyValue)) {
                      return null;
                    }
                  }
                }

                return (
                  <ParameterSelect
                    key={key}
                    label={param.label}
                    value={params[key] || param.default}
                    options={param.options}
                    onChange={(val) =>
                      setParams((prev) => ({ ...prev, [key]: val }))
                    }
                  />
                );
              })}

              {/* Shoe color — only for fullbody_in_tenue */}
              {selectedTemplate.id === 'fullbody_in_tenue' && (
                <ParameterSelect
                  label="Voetbalschoenen kleur"
                  value={shoeColor}
                  options={[
                    { value: 'zwart', label: '⚫ Zwart' },
                    { value: 'wit', label: '⚪ Wit' },
                    { value: 'rood', label: '🔴 Rood' },
                    { value: 'blauw', label: '🔵 Blauw' },
                    { value: 'geel', label: '🟡 Geel' },
                    { value: 'oranje', label: '🟠 Oranje' },
                    { value: 'groen', label: '🟢 Groen' },
                    { value: 'roze', label: '🩷 Roze' },
                  ]}
                  onChange={setShoeColor}
                />
              )}

              {/* Variant count */}
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 6,
                    color: 'var(--vscode-foreground, #ccc)',
                  }}
                >
                  Aantal varianten
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setVariantCount(n)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        border:
                          variantCount === n
                            ? '2px solid var(--vscode-focusBorder, #007fd4)'
                            : '1px solid var(--vscode-widget-border, #333)',
                        background:
                          variantCount === n
                            ? 'var(--vscode-list-activeSelectionBackground, #094771)'
                            : 'transparent',
                        color: 'var(--vscode-foreground, #ccc)',
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--vscode-descriptionForeground, #888)',
                    marginTop: 4,
                  }}
                >
                  Kosten: {variantCount * selectedTemplate.creditsCost} credits
                </div>
              </div>

              {/* Extra Instructions */}
              <div style={{ marginBottom: 16 }}>

              {/* ── AI Model Selector ── */}
              {(() => {
                const isVideo = selectedTemplate.outputType === 'video';
                // Model options per provider (video) or for image
                const VIDEO_MODELS: { provider: string; modelId: string; label: string; desc: string; costLabel: string }[] = [
                  { provider: '', modelId: '', label: '🔄 Auto', desc: 'Automatisch kiezen', costLabel: '' },
                  { provider: 'minimax', modelId: 'video-01', label: '🎬 MiniMax', desc: 'Video-01', costLabel: '$0.05/video' },
                  { provider: 'minimax', modelId: 'video-01-live2d', label: '🎬 Live2D', desc: 'MiniMax 2D→Video', costLabel: '$0.05/video' },
                  { provider: 'runway', modelId: 'gen4_turbo', label: '✈️ Gen4 Turbo', desc: 'Runway — snel', costLabel: '$0.096/s' },
                  { provider: 'runway', modelId: 'gen4', label: '✈️ Gen4', desc: 'Runway — beter', costLabel: '$0.23/s' },
                  { provider: 'pika', modelId: 'pika-2.2', label: '🎨 Pika 2.2', desc: 'fal.ai', costLabel: '$0.05/s' },
                  { provider: 'veo', modelId: 'veo-3.1-fast', label: '🌐 Veo Fast', desc: 'Google Veo 3.1', costLabel: '$0.15/video' },
                  { provider: 'veo', modelId: 'veo-3.1-generate', label: '🌐 Veo Std', desc: 'Google Veo 3.1 HQ', costLabel: '$0.60/video' },
                ];
                const IMAGE_MODELS: { modelId: string; label: string; desc: string; costLabel: string }[] = [
                  { modelId: '', label: '🔄 Auto', desc: 'Standard model', costLabel: '~€0.04/img' },
                  { modelId: 'nano-banana-pro-preview', label: '🍌 Nano Banana', desc: 'Snel & goedkoop', costLabel: '~€0.04/img' },
                  { modelId: 'gemini-2.5-flash-preview-native-audio-dialog', label: '⚡ Gemini 2.5 Flash', desc: 'Iets beter, iets duurder', costLabel: '~€0.04/img' },
                ];

                // Cost estimate helper
                const estimateCost = (): string => {
                  if (isVideo) {
                    const sel = VIDEO_MODELS.find(m => m.modelId === selectedModel);
                    if (!sel || !sel.costLabel) return '';
                    // Parse cost
                    const match = sel.costLabel.match(/\$([\d.]+)\/(video|s)/);
                    if (!match) return '';
                    const rate = parseFloat(match[1]);
                    const unit = match[2];
                    const dur = unit === 's' ? 5 : 1; // 5s default for per-second
                    const totalUsd = rate * dur * variantCount;
                    const totalEur = totalUsd * 0.92;
                    return `~€${totalEur.toFixed(2)} (${variantCount} variant${variantCount > 1 ? 'en' : ''})`;
                  } else {
                    // Image — ~€0.04 per image
                    const rateMap: Record<string, number> = {
                      '': 0.04,
                      'nano-banana-pro-preview': 0.04,
                      'gemini-2.5-flash-preview-native-audio-dialog': 0.043,
                    };
                    const rate = rateMap[selectedModel] ?? 0.04;
                    const total = rate * variantCount;
                    return `~€${total.toFixed(2)} (${variantCount} variant${variantCount > 1 ? 'en' : ''})`;
                  }
                };

                const models = isVideo ? VIDEO_MODELS : IMAGE_MODELS;

                return (
                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 6,
                        color: 'var(--vscode-foreground, #ccc)',
                      }}
                    >
                      {isVideo ? 'Video Model' : 'Image Model'}
                    </label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {models.map((opt) => (
                        <button
                          key={opt.modelId}
                          onClick={() => {
                            setSelectedModel(opt.modelId);
                            if (isVideo) {
                              const vm = opt as typeof VIDEO_MODELS[0];
                              setVideoProvider(vm.provider);
                            }
                          }}
                          style={{
                            flex: '1 1 auto',
                            minWidth: 80,
                            padding: '6px 8px',
                            border:
                              selectedModel === opt.modelId
                                ? '2px solid var(--vscode-focusBorder, #007fd4)'
                                : '1px solid var(--vscode-widget-border, #333)',
                            background:
                              selectedModel === opt.modelId
                                ? 'var(--vscode-list-activeSelectionBackground, #094771)'
                                : 'transparent',
                            color: 'var(--vscode-foreground, #ccc)',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 11,
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 11 }}>{opt.label}</div>
                          <div
                            style={{
                              fontSize: 9,
                              color: 'var(--vscode-descriptionForeground, #888)',
                              marginTop: 1,
                            }}
                          >
                            {opt.desc}
                          </div>
                          {opt.costLabel && (
                            <div
                              style={{
                                fontSize: 9,
                                color: 'var(--vscode-charts-green, #4ec)',
                                marginTop: 1,
                              }}
                            >
                              {opt.costLabel}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    {estimateCost() && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--vscode-charts-green, #4ec)',
                          marginTop: 4,
                          fontWeight: 600,
                        }}
                      >
                        Geschatte kosten: {estimateCost()}
                      </div>
                    )}
                  </div>
                );
              })()}

                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 4,
                    color: 'var(--vscode-foreground, #ccc)',
                  }}
                >
                  Extra instructies (optioneel)
                </label>
                <textarea
                  value={extraInstructions}
                  onChange={(e) => setExtraInstructions(e.target.value)}
                  placeholder="Bijv. 'Gebruik felle kleuren', 'Geen strepen op mouwen', 'Witte sponsortekst'..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: 13,
                    background: 'var(--vscode-input-background, #3c3c3c)',
                    color: 'var(--vscode-input-foreground, #ccc)',
                    border: '1px solid var(--vscode-input-border, #3c3c3c)',
                    borderRadius: 4,
                    outline: 'none',
                    minHeight: 60,
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          )}

          {/* ── STEP 3: Results ── */}
          {modalStep === 'results' && (
            <div>
              {/* Submitting (sending request) */}
              {generation.step === 'submitting' && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>
                    {selectedTemplate?.outputType === 'video' ? '🎬' : '🎨'}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                    {selectedTemplate?.outputType === 'video'
                      ? 'Video aanmelden...'
                      : 'Afbeelding aanmelden...'}
                  </div>
                  <ProgressBar progress={generation.progress} />
                  <div style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground, #888)', marginTop: 8 }}>
                    Wordt toegevoegd aan de AI wachtrij...
                  </div>
                </div>
              )}

              {/* Polling — video is being generated, waiting for result */}
              {generation.step === 'polling' && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                    Video wordt gegenereerd...
                  </div>
                  <ProgressBar progress={generation.progress} />
                  <div style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground, #888)', marginTop: 8, maxWidth: 320, margin: '8px auto 0' }}>
                    Dit duurt 2–5 minuten. Je kunt dit venster open laten — het resultaat verschijnt automatisch.
                  </div>
                </div>
              )}

              {/* Queued — video job accepted, processing on background */}
              {generation.step === 'queued' && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 64, marginBottom: 16 }}>🟢</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                    {requireApproval ? 'In Approvals Wachtrij!' : 'Toegevoegd aan de AI Queue!'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--vscode-descriptionForeground, #888)', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
                    {requireApproval
                      ? 'Keur de gegenereerde afbeelding goed via de Approvals pagina, daarna verschijnt deze automatisch op deze pagina.'
                      : selectedTemplate?.outputType === 'video'
                        ? 'De video wordt op de achtergrond gegenereerd (2–5 min). Je krijgt een melding zodra hij klaar is.'
                        : 'De afbeelding wordt op de achtergrond gegenereerd. Je krijgt een melding zodra hij klaar is.'}
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 16px',
                      background: 'var(--vscode-editorWidget-background, #252526)',
                      border: '1px solid var(--vscode-widget-border, #333)',
                      borderRadius: 8,
                      fontSize: 12,
                      color: 'var(--vscode-descriptionForeground, #888)',
                    }}
                  >
                    <span>📥</span>
                    <span>{requireApproval ? 'Keur goed via' : 'Volg de voortgang in'}</span>
                    <a
                      href={requireApproval ? '/approvals' : '/approvals?tab=ai_queue'}
                      style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}
                    >
                      {requireApproval ? 'Approvals' : 'Workflow → AI Queue'}
                    </a>
                  </div>
                </div>
              )}

              {/* Error state */}
              {generation.step === 'error' && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 0',
                    color: 'var(--vscode-errorForeground, #f44)',
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                    Generatie mislukt
                  </div>
                  <div style={{ fontSize: 12, marginBottom: 16 }}>
                    {generation.error}
                  </div>
                  <Button onClick={handleRegenerate}>Opnieuw proberen</Button>
                </div>
              )}

              {/* Completed — show variants */}
              {generation.step === 'completed' &&
                generation.variants.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 12,
                      }}
                    >
                      Kies de beste variant:
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: generation.variants.length === 1
                          ? '1fr'
                          : `repeat(${Math.min(generation.variants.length, 2)}, 1fr)`,
                        gap: 12,
                        alignItems: 'start',
                      }}
                    >
                      {generation.variants.map((v) => {
                        const fullSrc = v.presigned_url || (v.image_base64 ? `data:${v.mime_type || 'image/png'};base64,${v.image_base64}` : null);
                        return (
                          <div key={v.variant_index}>
                            <VariantCard
                              variant={v}
                              selected={selectedVariantIdx === v.variant_index}
                              onClick={() => setSelectedVariantIdx(v.variant_index)}
                              isVideo={selectedTemplate?.outputType === 'video'}
                            />
                            {fullSrc && selectedTemplate?.outputType !== 'video' && (
                              <a
                                href={fullSrc}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'block',
                                  marginTop: 4,
                                  textAlign: 'center',
                                  fontSize: 11,
                                  color: 'var(--vscode-textLink-foreground, #60a5fa)',
                                  textDecoration: 'none',
                                  opacity: 0.8,
                                }}
                              >
                                🔍 Volledig bekijken
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Feedback / Refine - only for images, not videos */}
                    {selectedTemplate?.outputType !== 'video' && (
                    <div style={{ marginTop: 20, borderTop: '1px solid var(--vscode-widget-border, #333)', paddingTop: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Combineer & Verbeter Varianten:</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                           {[
                             { id: 'colors', label: 'Kleuren (Vb: "Rood zoals V1")' },
                             { id: 'pattern', label: 'Patroon (Vb: "Strepen zoals V2")' },
                             { id: 'logo', label: 'Logo/Sponsor' },
                             { id: 'collar', label: 'Kraag/Mouwen' },
                           ].map(field => (
                             <div key={field.id}>
                               <label style={{display:'block', fontSize:11, marginBottom:4, color:'var(--vscode-descriptionForeground, #888)'}}>{field.label}</label>
                               <input
                                  type="text"
                                  value={(feedbackFields as any)[field.id]}
                                  onChange={(e) => setFeedbackFields(prev => ({ ...prev, [field.id]: e.target.value }))}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    fontSize: 12,
                                    background: 'var(--vscode-input-background, #3c3c3c)',
                                    color: 'var(--vscode-input-foreground, #ccc)',
                                    border: '1px solid var(--vscode-input-border, #3c3c3c)',
                                    borderRadius: 4,
                                    outline: 'none',
                                  }}
                               />
                             </div>
                           ))}
                        </div>
                        <div style={{ marginTop: 12 }}>
                           <label style={{display:'block', fontSize:11, marginBottom:4, color:'var(--vscode-descriptionForeground, #888)'}}>Overig / Specifiek</label>
                           <input
                              type="text"
                              value={feedbackFields.other}
                              onChange={(e) => setFeedbackFields(prev => ({ ...prev, other: e.target.value }))}
                              placeholder="Bijv. 'Sokken wit', 'Meer contrast in foto'..."
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                fontSize: 12,
                                background: 'var(--vscode-input-background, #3c3c3c)',
                                color: 'var(--vscode-input-foreground, #ccc)',
                                border: '1px solid var(--vscode-input-border, #3c3c3c)',
                                borderRadius: 4,
                                outline: 'none',
                              }}
                           />
                        </div>
                    </div>
                    )}
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            borderTop: '1px solid var(--vscode-widget-border, #333)',
          }}
        >
          <div>
            {modalStep !== 'template' && generation.step !== 'submitting' && generation.step !== 'polling' && generation.step !== 'queued' && (
              <button
                onClick={() => {
                  if (modalStep === 'configure') setModalStep('template');
                  else if (modalStep === 'results') handleRegenerate();
                }}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  background: 'transparent',
                  color: 'var(--vscode-foreground, #ccc)',
                  border: '1px solid var(--vscode-widget-border, #333)',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                ← Terug
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleClose}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                background: generation.step === 'queued' ? 'var(--vscode-button-background, #0078d4)' : 'transparent',
                color: generation.step === 'queued' ? 'var(--vscode-button-foreground, #fff)' : 'var(--vscode-foreground, #ccc)',
                border: generation.step === 'queued' ? 'none' : '1px solid var(--vscode-widget-border, #333)',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: generation.step === 'queued' ? 600 : 400,
              }}
            >
              {generation.step === 'queued' ? '✓ Sluiten' : 'Annuleren'}
            </button>

            {modalStep === 'configure' && (
              <button
                onClick={handleGenerate}
                disabled={!selectedTemplate}
                style={{
                  padding: '6px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  background: 'var(--vscode-button-background, #0078d4)',
                  color: 'var(--vscode-button-foreground, #fff)',
                  border: 'none',
                  borderRadius: 4,
                  cursor: selectedTemplate ? 'pointer' : 'not-allowed',
                  opacity: selectedTemplate ? 1 : 0.5,
                }}
              >
                🍌 Genereren ({variantCount} variant
                {variantCount > 1 ? 'en' : ''})
              </button>
            )}

            {modalStep === 'results' && generation.step === 'completed' && (
              <>
                <button
                  onClick={handleRegenerate}
                  style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    background: 'transparent',
                    color: 'var(--vscode-foreground, #ccc)',
                    border: '1px solid var(--vscode-widget-border, #333)',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  🔄 Opnieuw
                </button>
                <button
                  onClick={handleAccept}
                  disabled={selectedVariantIdx === null || saving}
                  style={{
                    padding: '6px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    background:
                      selectedVariantIdx !== null
                        ? '#10b981'
                        : 'var(--vscode-disabledForeground, #555)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor:
                      selectedVariantIdx !== null ? 'pointer' : 'not-allowed',
                    opacity: selectedVariantIdx !== null ? 1 : 0.5,
                  }}
                >
                  {saving ? 'Opslaan...' : '💾 Opslaan als asset'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
