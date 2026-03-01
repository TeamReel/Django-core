/**
 * AssetsTab — Visual brand assets display component
 *
 * Separated from IdentityTab to distinguish:
 * - AssetsTab: visual assets (logos, kits, sponsors, photos)
 * - Identity tab: design tokens (colors, fonts, spacing)
 *
 * Used across Club, Team, Season, Match, and Member detail pages.
 * Shows logo, kits, sponsor with inheritance indicators.
 *
 * Hierarchy:
 * - Club: Upload logo, kits, sponsor → AI generates combined
 * - Team: Inherits kits+logo from club, optional own sponsor
 * - Season: Snapshot of team assets, can override sponsor/kit
 * - Match: Read-only display of season's identity
 * - Member: Profile photo + season's combined kit → player card
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  useBrandProfile,
  getAssetUrl,
  ASSET_TYPE_LABELS,
  KIT_ROLES,
  MULTI_INSTANCE_TYPES,
  type BrandAsset,
  type BrandProfile,
} from '../../hooks/useBrandProfile';
import { useAssetGeneration } from '../../hooks/useAssetGeneration';
import { getTemplate } from '../../constants/assetTemplates';
import { AssetGenerationModal } from '../AssetGenerationModal';

// ============================================================================
// Types
// ============================================================================

export type AssetsLevel = 'organisation' | 'club' | 'team' | 'season' | 'match' | 'member';

interface AssetsTabProps {
  /** What level of the hierarchy */
  level: AssetsLevel;
  /** Organisation UUID */
  organisationId: string;
  /** Project ID (club or team) */
  projectId?: string | number | null;
  /** Parent project ID (club, when level=team) */
  parentProjectId?: string | number | null;
  /** Entity display name */
  entityName?: string;
  /** Read-only mode (match, member views) */
  readOnly?: boolean;
  /** Sponsor mode for teams: 'club' | 'custom' */
  sponsorMode?: 'club' | 'custom';
  /** Callback when sponsor mode changes */
  onSponsorModeChange?: (mode: 'club' | 'custom') => void;
}

// ============================================================================
// Sub-components
// ============================================================================

interface AssetCardProps {
  label: string;
  assetType: string;
  asset: BrandAsset | undefined;
  inherited?: boolean;
  inheritedFrom?: string;
  readOnly?: boolean;
  onUpload?: (file: File, assetType: string) => void;
  onDelete?: (assetType: string) => void;
  onReplace?: (assetType: string) => void;
  onPostProcess?: (assetType: string) => void;
  onShowHistory?: (assetType: string) => void;
  aspectRatio?: string;
  /** Show a processing spinner overlay */
  isProcessing?: boolean;
}

function AssetCard({
  label,
  assetType,
  asset,
  inherited = false,
  inheritedFrom,
  readOnly = false,
  onUpload,
  onDelete,
  onReplace,
  onPostProcess,
  onShowHistory,
  aspectRatio = '3 / 4',
  isProcessing = false,
}: AssetCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const url = asset ? getAssetUrl(asset.url) : null;

  const isUploadType = assetType.endsWith('_upload');
  const isProcessed = !isUploadType; // Simplification as combined is removed

  let badgeColor = '#6b7280'; // gray
  let badgeText = '';
  if (isUploadType) {
    badgeColor = '#3b82f6'; // blue
    badgeText = 'Upload';
  } else if (
    isProcessed &&
    ![
      'watermark',
      'favicon',
      'font_file',
      'location_photo',
      'stadium_background',
      'other',
    ].includes(assetType)
  ) {
    badgeColor = '#10b981'; // green
    badgeText = 'AI Bewerkt';
  }

  return (
    <div
      style={{
        border: '1px solid var(--vscode-widget-border, #333)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--vscode-editor-background, #1e1e1e)',
        opacity: inherited ? 0.8 : 1,
      }}
    >
      {/* Preview area */}
      <div
        style={{
          aspectRatio,
          background: url
            ? `url(${url}) center/contain no-repeat`
            : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
          position: 'relative',
          minHeight: 120,
        }}
      >
        {/* Phase badge */}
        {badgeText && (
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              background: badgeColor,
              color: '#fff',
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            {badgeText}
          </span>
        )}

        {/* History Button - always show if processed type, even if no asset set yet (might have history) */}
        {!readOnly &&
          onShowHistory &&
          isProcessed &&
          ![
            'watermark',
            'favicon',
            'font_file',
            'location_photo',
            'stadium_background',
            'other',
          ].includes(assetType) && (
            <button
                onClick={() => onShowHistory(assetType)}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: badgeText ? 80 : 6, // Position left of badge if exists
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 12,
                  padding: '2px 6px',
                  cursor: 'pointer'
                }}
            >
             ⏱️
            </button>
        )}

        {/* Inherited badge */}
        {inherited && (
          <span
            style={{
              position: 'absolute',
              top: 6,
              left: 6,
              background: '#f59e0b',
              color: '#000',
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            ← {inheritedFrom || 'Geërfd'}
          </span>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.7)',
              zIndex: 5,
              gap: 8,
            }}
          >
            <div style={{ width: 24, height: 24, border: '3px solid #8b5cf6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#fff', fontSize: 11 }}>Bewerken...</span>
          </div>
        )}

        {/* Empty state */}
        {!url && !isProcessing && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--vscode-descriptionForeground, #888)',
              fontSize: 12,
            }}
          >
            Niet ingesteld
          </div>
        )}
      </div>

      {/* Info + actions */}
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</div>

        {!readOnly && onUpload && (
          <>
            {/* AI processed assets with Genereer + Bewerk buttons */}
            {isProcessed && onReplace ? (
              <div style={{ display: 'grid', gridTemplateColumns: onPostProcess ? '1fr 1fr' : '1fr', gap: 4 }}>
                <button
                  onClick={() => onReplace(assetType)}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    fontSize: 11,
                    cursor: 'pointer',
                    background: 'var(--vscode-button-background, #0078d4)',
                    color: 'var(--vscode-button-foreground, #fff)',
                    border: 'none',
                    borderRadius: 4,
                  }}
                >
                  🎨 Genereer
                </button>
                {onPostProcess && (
                  <button
                    onClick={() => onPostProcess(assetType)}
                    disabled={isProcessing}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      fontSize: 11,
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      background: isProcessing ? '#555' : '#8b5cf6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      opacity: isProcessing ? 0.6 : 1,
                    }}
                  >
                    {isProcessing ? '⏳ Bezig...' : '✂️ Bewerk'}
                  </button>
                )}
              </div>
            ) : (
              /* Upload-type assets with file picker */
              <div style={{ display: 'grid', gridTemplateColumns: url ? '1fr 1fr' : '1fr', gap: 4 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    fontSize: 11,
                    cursor: 'pointer',
                    background: 'var(--vscode-button-background, #0078d4)',
                    color: 'var(--vscode-button-foreground, #fff)',
                    border: 'none',
                    borderRadius: 4,
                  }}
                >
                  {url ? 'Vervang' : 'Uploaden'}
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file, assetType);
                e.target.value = '';
              }}
            />
          </>
        )}

        {!readOnly && onDelete && url && (
          <button
            onClick={() => {
              if (window.confirm('Weet je zeker dat je dit asset wilt verwijderen?')) {
                onDelete(assetType);
              }
            }}
            style={{
              width: '100%',
              padding: '4px 8px',
              fontSize: 11,
              cursor: 'pointer',
              background: 'transparent',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: 4,
              marginTop: 4,
            }}
          >
            Verwijderen
          </button>
        )}

        {asset && (
          <div style={{ fontSize: 10, color: 'var(--vscode-descriptionForeground, #888)', marginTop: 4 }}>
            {new Date(asset.updated_at).toLocaleDateString('nl-NL')}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Section components
// ============================================================================

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  return (
    <div className="mb-24">
      <h3 className="fs-14 fw-600" style={{ marginBottom: 4 }}>{title}</h3>
      {description && (
        <p style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground, #888)', marginBottom: 12 }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

function AssetGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AssetsTab({
  level,
  organisationId,
  projectId,
  parentProjectId,
  entityName,
  readOnly = false,
  sponsorMode: externalSponsorMode,
  onSponsorModeChange,
}: AssetsTabProps) {
  // Load brand profile for this entity
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

  // Load parent (club) brand profile for inheritance (team/season/match/member)
  const parentBrand = useBrandProfile({
    projectId: parentProjectId || undefined,
    autoFetch: !!parentProjectId,
  });

  const [uploading, setUploading] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPreselectedTemplate, setAiPreselectedTemplate] = useState<string | undefined>();
  const [aiPreviousResultUrl, setAiPreviousResultUrl] = useState<string | null>(null);
  const [aiCustomInputs, setAiCustomInputs] = useState<Record<string, string | null>>({});
  const [aiInitialParams, setAiInitialParams] = useState<Record<string, string>>({});
  const [aiLabel, setAiLabel] = useState<string | undefined>();

  // Postprocess: direct API call without modal
  const postProcessGen = useAssetGeneration();
  const [postProcessingAsset, setPostProcessingAsset] = useState<string | null>(null);
  const [postProcessOutputType, setPostProcessOutputType] = useState<string | null>(null);
  const postProcessSavingRef = useRef(false);

  // Auto-accept postprocess result when generation completes
  useEffect(() => {
    if (postProcessGen.step === 'completed' && postProcessGen.variants.length > 0 && postProcessingAsset) {
      // Guard against double-fire (React 18 StrictMode)
      if (postProcessSavingRef.current) return;
      postProcessSavingRef.current = true;

      (async () => {
        try {
          const variant = postProcessGen.variants[0];
          // Guard: if the variant has an error (e.g. Pillow postprocess failed), don't try to save
          if (variant?.error) {
            console.error('❌ Postprocess variant has error:', variant.error);
            alert(`Bewerken mislukt: ${variant.error}`);
            return;
          }
          // Guard: ensure at least one content field is present
          if (!variant?.image_base64 && !variant?.storage_path && !variant?.presigned_url && !variant?.storage_info?.storage_path) {
            console.error('❌ Postprocess variant has no content:', variant);
            alert('Bewerken mislukt: geen resultaat ontvangen van de server.');
            return;
          }
          console.log('📝 Postprocess auto-accept starting for', postProcessingAsset);
          const result = await postProcessGen.acceptVariant(0);
          if (result) {
            console.log('✅ Postprocess auto-saved:', postProcessingAsset, result);
            // Force fresh profile fetch (cache: no-store prevents stale data)
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

  // ── Upload auto-processing: fire AI after upload, auto-accept result ──
  // Maps upload type → output asset type for auto-save
  const UPLOAD_OUTPUT_TYPE: Record<string, string> = {
    'logo_upload': 'logo',
    'sponsor_logo_upload': 'sponsor_logo',
    'kit_home_upload': 'kit_home',
    'kit_away_upload': 'kit_away',
    'kit_third_upload': 'kit_third',
    'kit_goalkeeper_upload': 'kit_goalkeeper',
    'kit_training_upload': 'kit_training',
    'kit_coach_upload': 'kit_coach',
    'kit_assistant_upload': 'kit_assistant',
    'kit_legacy_upload': 'kit_legacy',
  };

  const uploadAutoGen = useAssetGeneration();
  const [uploadProcessingAsset, setUploadProcessingAsset] = useState<string | null>(null);
  const uploadAutoSavingRef = useRef(false);

  // Auto-accept upload auto-gen result when generation completes
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

  // History State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyAssetType, setHistoryAssetType] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<Array<{id: string, url: string, created_at: string, original_name: string}>>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const sponsorMode = externalSponsorMode || 'club';

  const { fetchHistory, restoreAsset } = useBrandProfile({ projectId, organisationId, autoFetch: false }); // Reuse hook for methods

  const handleShowHistory = async (assetType: string) => {
      setHistoryAssetType(assetType);
      setShowHistoryModal(true);
      setLoadingHistory(true);
      const list = await fetchHistory(assetType);
      setHistoryList(list);
      setLoadingHistory(false);
  };

  const handleRestore = async (fileAssetId: string) => {
      if (!historyAssetType) return;
      if (confirm('Weet je zeker dat je deze versie wilt herstellen? De huidige versie wordt overschreven (maar blijft in de geschiedenis).')) {
          await restoreAsset(fileAssetId, historyAssetType);
          setShowHistoryModal(false);
          refresh(); // Reload main assets to show new active one
      }
  };

  // Mapping: upload asset type → AI template to auto-trigger
  const UPLOAD_TO_AI_TEMPLATE: Record<string, { templateId: string; initialParams?: Record<string, string> }> = {
    'logo_upload': { templateId: 'logo_standardize' },
    'sponsor_logo_upload': { templateId: 'sponsor_standardize' },
    'kit_home_upload': { templateId: 'tenue_generate', initialParams: { kit_type: 'home' } },
    'kit_away_upload': { templateId: 'tenue_generate', initialParams: { kit_type: 'away' } },
    'kit_third_upload': { templateId: 'tenue_generate', initialParams: { kit_type: 'third' } },
    'kit_goalkeeper_upload': { templateId: 'keeper_tenue' },
    'kit_training_upload': { templateId: 'tracksuit_generate' },
    'kit_coach_upload': { templateId: 'coach_outfit' },
    'kit_assistant_upload': { templateId: 'coach_outfit' },
    'kit_legacy_upload': { templateId: 'legacy_tenue_generate' },
    'location_photo': { templateId: 'location_standardize' },
    'club_background_upload': { templateId: 'background_standardize' },
  };

  const handleUpload = async (file: File, assetType: string) => {
    setUploading(assetType);

    let folder = `${level}s`; // default fallback
    let pathId = entityName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'entity';

    if (level === 'organisation') {
      folder = 'orgs';
      pathId = organisationId;
    } else if (level === 'club') {
      folder = 'clubs';
      // "ID en slug gecombineerd" -> unique path like "ajax-uuid"
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

      // ── Auto-process path: logo, sponsor, kits, backgrounds → fire & auto-accept ──
      if (outputType) {
        const inputKey = assetType === 'logo_upload' ? 'logo'
          : assetType === 'sponsor_logo_upload' ? 'sponsor'
          : 'reference';

        const params: Record<string, string> = { ...(autoAi.initialParams || {}) };
        // Team-level: tell backend to preserve club kit, only add sponsor
        if (parentProjectId && (autoAi.templateId === 'tenue_generate' || autoAi.templateId === 'legacy_tenue_generate' || autoAi.templateId === 'keeper_tenue')) {
          params['team_level'] = 'true';
        }

        // Derive label for multi-instance types (use filename without extension)
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
            // Also pass logo+sponsor context for kit generation
            ...(baseAiInputAssets.logo ? { logo: baseAiInputAssets.logo } : {}),
            ...(baseAiInputAssets.sponsor ? { sponsor: baseAiInputAssets.sponsor } : {}),
          },
        });
        return; // Done — auto-accept via useEffect
      }

      // ── Modal path: location_photo, club_background_upload → needs user review ──
      setTimeout(() => {
        const inputs: Record<string, string | null> = { ...baseAiInputAssets };
        if (assetType === 'location_photo') inputs['location'] = uploadUrl;
        if (assetType === 'club_background_upload') inputs['source'] = uploadUrl;

        setAiPreviousResultUrl(null);
        setAiPreselectedTemplate(autoAi.templateId);
        setAiInitialParams(autoAi.initialParams || {});
        setAiCustomInputs(inputs);
        // Pass label for multi-instance types so the AI result pairs with the upload
        if (MULTI_INSTANCE_TYPES.has(assetType)) {
          setAiLabel(file.name.replace(/\.[^.]+$/, ''));
        } else {
          setAiLabel(undefined);
        }
        setShowAiModal(true);
      }, 300);
    }
  };

  const handleDelete = async (assetType: string) => {
    await deleteAsset(assetType);
  };

  const handleDeleteById = async (assetId: string) => {
    await deleteAssetById(assetId);
  };

  // Helper: get asset from this level OR parent
  const getEffectiveAsset = (assetType: string): { asset: BrandAsset | undefined; inherited: boolean } => {
    const own = getAsset(assetType);
    if (own) return { asset: own, inherited: false };

    if (parentProjectId && parentBrand.getAsset) {
      const parent = parentBrand.getAsset(assetType);
      if (parent) return { asset: parent, inherited: true };
    }

    return { asset: undefined, inherited: false };
  };

  // Input assets for AI generation
  const baseAiInputAssets = React.useMemo(() => {
    // We want EFFECTIVE assets for generation context, so if I generate a kit at season level,
    // I use the season's effective logo and sponsor (which might be inherited).
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

  const handleReplaceAi = (assetType: string) => {
    openAiForAsset(assetType);
  };

  const handlePostProcess = (assetType: string) => {
    // Direct postprocess: no modal, fire API with default params, auto-accept result
    if (postProcessingAsset) return; // Already processing

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

    // Get default parameters from template definition
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
      outputAssetType: assetType, // Save back to the same asset type
      inputImageUrls: { source: getAssetUrl(asset.url) || '' },
    });
  };

  const openAiForAsset = (assetType: string) => {
    // Map asset type to template
    let templateId: string | undefined;

    // Determine reference asset type based on outcome asset type
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

    // Team-level: tell backend to preserve club kit, only add sponsor
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
       // Look for effective asset if local is missing, to allow "Improving" an inherited asset into a local one
       const getEff = (type: string) => {
           const own = getAsset(type);
           if (own) return own;
           if (parentProjectId && parentBrand.getAsset) return parentBrand.getAsset(type);
           return undefined;
       };

       const asset = getEff(assetType);
       // Always pass the current AI result URL so the modal can offer source choice
       setAiPreviousResultUrl(asset ? getAssetUrl(asset.url) : null);
       setAiPreselectedTemplate(templateId);
       setAiInitialParams(initialParams);

       // Pass label for multi-instance types (e.g. backgrounds)
       setAiLabel(asset?.label || undefined);

       // Build inputs specific to this flow
       const inputs: Record<string, string | null> = { ...baseAiInputAssets };
       if (referenceAssetType) {
           const refAsset = getEff(referenceAssetType);
           if (refAsset) {
             // Map the reference asset to the correct input key expected by the template
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
  };



  if (loading || parentBrand.loading) {
    return (
      <div className="p-24 text-center" style={{ color: 'var(--vscode-descriptionForeground, #888)' }}>
        Assets laden...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-24" style={{ color: 'var(--vscode-errorForeground, #f44)' }}>
        Fout bij laden: {error}
      </div>
    );
  }

  // ── ORGANISATION level ──
  if (level === 'organisation') {
    return (
      <div className="p-16">
        <Section title="Organisatie Logo" description="Het logo van de organisatie.">
          <AssetGrid>
            <AssetCard
              label="Logo (upload)"
              assetType="logo_upload"
              asset={getAsset('logo_upload')}
              onUpload={handleUpload}
              onDelete={handleDelete}
              readOnly={readOnly}
              aspectRatio="1 / 1"
            />
            <AssetCard label="Logo (bewerkt)" assetType="logo" asset={getAsset('logo')} onUpload={handleUpload} onDelete={handleDelete} aspectRatio="1 / 1" />
          </AssetGrid>
        </Section>
      </div>
    );
  }

  // ── CLUB level ──
  if (level === 'club') {
    return (
      <div className="p-16">
        {/* AI Generation Button */}
        <div className="flex-row gap-8 mb-20">
          <button
            onClick={() => { setAiPreselectedTemplate(undefined); setAiInitialParams({}); setAiCustomInputs(baseAiInputAssets); setShowAiModal(true); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            🎨 AI Asset Genereren
          </button>
          <button
            onClick={() => { setAiPreselectedTemplate('tenue_generate'); setAiInitialParams({ kit_type: 'home' }); setShowAiModal(true); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              fontSize: 12,
              background: 'transparent',
              color: 'var(--vscode-foreground, #ccc)',
              border: '1px solid var(--vscode-widget-border, #444)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            👕 Tenue
          </button>
          <button
            onClick={() => { setAiPreselectedTemplate('keeper_tenue'); setAiInitialParams({}); setShowAiModal(true); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              fontSize: 12,
              background: 'transparent',
              color: 'var(--vscode-foreground, #ccc)',
              border: '1px solid var(--vscode-widget-border, #444)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            🧤 Keeper
          </button>
          <button
            onClick={() => { setAiPreselectedTemplate('tracksuit_generate'); setAiInitialParams({}); setShowAiModal(true); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              fontSize: 12,
              background: 'transparent',
              color: 'var(--vscode-foreground, #ccc)',
              border: '1px solid var(--vscode-widget-border, #444)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            🏃 Training
          </button>
        </div>

        {/* History Modal */}
        {showHistoryModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, padding: 20, width: 500, maxHeight: '80vh', overflow: 'auto' }}>
                    <div className="flex-between mb-16">
                        <h3 style={{ margin: 0, fontSize: 16 }}>Versiegeschiedenis</h3>
                        <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}>✕</button>
                    </div>
                    {loadingHistory ? (
                        <div className="p-20 text-center" style={{ color: '#888' }}>Geschiedenis laden...</div>
                    ) : historyList.length === 0 ? (
                        <div className="p-20 text-center" style={{ color: '#888' }}>Geen eerdere versies gevonden.</div>
                    ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                           {historyList.map(item => (
                               <div key={item.id} style={{ display: 'flex', gap: 12, padding: 10, background: '#252526', borderRadius: 6, alignItems: 'center' }}>
                                   <div style={{ width: 60, height: 80, background: `url(${item.url}) center/contain no-repeat`, backgroundSize: 'cover', borderRadius: 4, flexShrink: 0 }} />
                                   <div className="flex-1">
                                       <div className="fs-12 fw-600">{new Date(item.created_at).toLocaleString()}</div>
                                       <div style={{ fontSize: 11, color: '#888' }}>{item.original_name}</div>
                                   </div>
                                   <button
                                     onClick={() => handleRestore(item.id)}
                                     style={{ padding: '6px 12px', background: '#094771', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                                   >
                                     Herstellen
                                   </button>
                               </div>
                           ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Spinner animation for postprocess overlay */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* AI Generation Generation Modal */}
        <AssetGenerationModal
          isOpen={showAiModal}
          onClose={() => { setShowAiModal(false); setAiPreviousResultUrl(null); setAiLabel(undefined); }}
          context="club"
          preSelectedTemplate={aiPreselectedTemplate}
          projectId={projectId || ''}
          organisationId={organisationId}
          inputAssets={aiCustomInputs}
          previousResultUrl={aiPreviousResultUrl}
          initialParams={aiInitialParams}
          label={aiLabel}
          onAssetSaved={refresh}
        />

        {/* Assets Top Row: Logo & Sponsor */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24, marginBottom: 24 }}>
          {/* Logo */}
          <div style={{ background: '#252526', padding: 16, borderRadius: 8, border: '1px solid #333' }}>
             <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Logo</h3>
             <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Upload het clublogo → AI standaardiseert het.</p>
             <AssetGrid>
                <AssetCard label="Logo (upload)" assetType="logo_upload" asset={getAsset('logo_upload')} onUpload={handleUpload} onDelete={handleDelete} aspectRatio="1 / 1" />
                <AssetCard label="Logo (bewerkt)" assetType="logo" asset={getAsset('logo')} onUpload={handleUpload} onDelete={handleDelete} onReplace={handleReplaceAi} onPostProcess={handlePostProcess} isProcessing={postProcessingAsset === 'logo' || uploadProcessingAsset === 'logo'} aspectRatio="1 / 1" />
             </AssetGrid>
          </div>

          {/* Sponsor */}
          <div style={{ background: '#252526', padding: 16, borderRadius: 8, border: '1px solid #333' }}>
             <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Sponsor</h3>
             <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Upload het sponsor logo. Wordt gestandaardiseerd door AI.</p>
             <AssetGrid>
                <AssetCard label="Sponsor (upload)" assetType="sponsor_logo_upload" asset={getAsset('sponsor_logo_upload')} onUpload={handleUpload} onDelete={handleDelete} aspectRatio="1 / 1" />
                <AssetCard label="Sponsor (bewerkt)" assetType="sponsor_logo" asset={getAsset('sponsor_logo')} onUpload={handleUpload} onDelete={handleDelete} onReplace={handleReplaceAi} onPostProcess={handlePostProcess} isProcessing={postProcessingAsset === 'sponsor_logo' || uploadProcessingAsset === 'sponsor_logo'} aspectRatio="1 / 1" />
             </AssetGrid>
          </div>
        </div>

        {/* Kits Grid */}
        <h3 className="fs-14 fw-600 mb-12">Tenues</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {KIT_ROLES.map((role) => {
          const uploadType = `kit_${role.id}_upload`;
          const processedType = `kit_${role.id}`;

          return (
            <div key={role.id} style={{ background: '#252526', padding: 12, borderRadius: 8, border: '1px solid #333' }}>
                <div className="flex-row gap-8 mb-8">
                    <span style={{ fontSize: 18 }}>{role.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{role.label}</span>
                </div>
              {/* Legacy era selection moved into the AI modal (template parameters) */}
              <AssetGrid>
                <AssetCard
                  label={`${role.label} (upload)`}
                  assetType={uploadType}
                  asset={getAsset(uploadType)}
                  onUpload={handleUpload}
                  onDelete={handleDelete}
                />
                <AssetCard
                  label={`${role.label} (bewerkt)`}
                  assetType={processedType}
                  asset={getAsset(processedType)}
                  onUpload={handleUpload}
                  onDelete={handleDelete}
                  onReplace={handleReplaceAi}
                  onPostProcess={handlePostProcess}
                  isProcessing={postProcessingAsset === processedType || uploadProcessingAsset === processedType}
                  onShowHistory={handleShowHistory}
                />
              </AssetGrid>
            </div>
          );
        })}
        </div>

        {/* Location */}
        <Section title="📍 Locatie" description="Upload een voetbalveld foto → AI zet het om naar portrait formaat voor lineup.">
          <AssetGrid>
            <AssetCard
              label="Veld foto (upload)"
              assetType="location_photo"
              asset={getAsset('location_photo')}
              onUpload={handleUpload}
              onDelete={handleDelete}
              aspectRatio="16 / 9"
            />
            <AssetCard
              label="Achtergrond (bewerkt)"
              assetType="stadium_background"
              asset={getAsset('stadium_background')}
              onUpload={handleUpload}
              onDelete={handleDelete}
              onReplace={handleReplaceAi}
              onPostProcess={handlePostProcess}
              isProcessing={postProcessingAsset === 'stadium_background'}
              aspectRatio="9 / 16"
            />
          </AssetGrid>
        </Section>

        {/* Club Backgrounds — multiple custom backgrounds */}
        <Section title="🖼️ Achtergronden" description="Upload eigen achtergronden voor video's. Na upload opent de AI-modal om de achtergrond te optimaliseren voor portrait formaat (1080×1920) zodat spelers er realistisch op geplaatst kunnen worden.">
          {(() => {
            const bgUploads = getAssets('club_background_upload');
            const bgProcessed = getAssets('club_background');
            const bgFileRef = React.createRef<HTMLInputElement>();

            // Group by label: match uploads with their AI-processed counterparts.
            // 1) Try exact label match first
            // 2) Then pair remaining unmatched uploads with unmatched processed (by creation order)
            const matchedProcessedIds = new Set<string>();
            const matchedUploadIds = new Set<string>();
            const bgPairs: { label: string; upload?: any; processed?: any }[] = [];

            // Pass 1: exact label match
            for (const upload of bgUploads) {
              const uploadLabel = upload.label || upload.file_details?.name || 'Achtergrond';
              const match = bgProcessed.find(bg => bg.label && bg.label === uploadLabel);
              if (match) {
                matchedProcessedIds.add(match.id);
                matchedUploadIds.add(upload.id);
                bgPairs.push({ label: uploadLabel, upload, processed: match });
              }
            }

            // Pass 2: pair remaining unmatched uploads with unmatched processed (by order)
            const unmatchedUploads = bgUploads.filter(u => !matchedUploadIds.has(u.id));
            const unmatchedProcessed = bgProcessed.filter(p => !matchedProcessedIds.has(p.id));

            for (let i = 0; i < unmatchedUploads.length; i++) {
              const upload = unmatchedUploads[i];
              const uploadLabel = upload.label || upload.file_details?.name || 'Achtergrond';
              const proc = unmatchedProcessed[i] || undefined; // may be undefined if more uploads than processed
              if (proc) matchedProcessedIds.add(proc.id);
              bgPairs.push({ label: uploadLabel, upload, processed: proc });
            }

            // Any remaining orphaned processed assets (more processed than uploads)
            for (const proc of unmatchedProcessed) {
              if (!matchedProcessedIds.has(proc.id)) {
                bgPairs.push({
                  label: proc.label || proc.file_details?.name || 'Achtergrond',
                  upload: undefined,
                  processed: proc,
                });
              }
            }

            return (
              <>
                {/* Upload Button */}
                <div className="mb-16">
                  <input
                    ref={bgFileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      for (const file of files) {
                        await handleUpload(file, 'club_background_upload');
                      }
                      if (bgFileRef.current) bgFileRef.current.value = '';
                    }}
                  />
                  <button
                    onClick={() => bgFileRef.current?.click()}
                    disabled={uploading === 'club_background_upload'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 20px',
                      fontSize: 13,
                      fontWeight: 600,
                      background: uploading === 'club_background_upload' ? '#555' : 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: uploading === 'club_background_upload' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {uploading === 'club_background_upload' ? '⏳ Uploaden...' : '📤 Achtergrond Uploaden'}
                  </button>
                </div>

                {/* Background pairs: upload + AI processed */}
                {bgPairs.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {bgPairs.map((pair) => (
                      <div key={pair.label} style={{ background: '#252526', padding: 12, borderRadius: 8, border: '1px solid #333' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 18 }}>🖼️</span>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{pair.label}</span>
                        </div>
                        <AssetGrid>
                          <AssetCard
                            label="Upload (bron)"
                            assetType="club_background_upload"
                            asset={pair.upload}
                            onUpload={handleUpload}
                            onDelete={() => pair.upload && handleDeleteById(pair.upload.id)}
                            aspectRatio="9 / 16"
                          />
                          <AssetCard
                            label="Bewerkt (AI)"
                            assetType="club_background"
                            asset={pair.processed}
                            onDelete={() => pair.processed && handleDeleteById(pair.processed.id)}
                            onReplace={() => {
                              // Open AI modal with this specific upload as source
                              const sourceUrl = pair.upload?.url ? getAssetUrl(pair.upload.url) : null;
                              const prevUrl = pair.processed?.url ? getAssetUrl(pair.processed.url) : null;
                              setAiPreviousResultUrl(prevUrl);
                              setAiPreselectedTemplate('background_standardize');
                              setAiInitialParams({});
                              setAiLabel(pair.label);
                              setAiCustomInputs({
                                ...baseAiInputAssets,
                                ...(sourceUrl ? { source: sourceUrl } : {}),
                              });
                              setShowAiModal(true);
                            }}
                            isProcessing={postProcessingAsset === 'club_background'}
                            aspectRatio="9 / 16"
                          />
                        </AssetGrid>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 13, background: '#252526', borderRadius: 8, border: '1px dashed #444' }}>
                    Nog geen achtergronden geüpload. Klik op "Achtergrond Uploaden" om te beginnen.
                  </div>
                )}
              </>
            );
          })()}
        </Section>

        {!profile && (
          <div
            style={{
              padding: 16,
              background: 'var(--vscode-inputValidation-warningBackground, #5a4000)',
              border: '1px solid var(--vscode-inputValidation-warningBorder, #856d00)',
              borderRadius: 8,
              marginTop: 16,
              fontSize: 12,
            }}
          >
            ⚠️ Nog geen brand profiel aangemaakt voor deze club. Assets worden opgeslagen zodra er een brand profiel is.
          </div>
        )}
      </div>
    );
  }

  // ── TEAM level ── (mirrors club layout, with inheritance fallbacks)
  if (level === 'team') {
    return (
      <div className="p-16">
        {/* AI Generation Buttons */}
        <div className="flex-row gap-8 mb-20 flex-wrap">
          <button
            onClick={() => { setAiPreselectedTemplate(undefined); setAiInitialParams({}); setAiCustomInputs(baseAiInputAssets); setShowAiModal(true); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            🎨 AI Asset Genereren
          </button>
          <button
            onClick={() => { setAiPreselectedTemplate('tenue_generate'); setAiInitialParams({ kit_type: 'home' }); setAiCustomInputs(baseAiInputAssets); setShowAiModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 12, background: 'transparent', color: 'var(--vscode-foreground, #ccc)', border: '1px solid var(--vscode-widget-border, #444)', borderRadius: 8, cursor: 'pointer' }}
          >
            👕 Tenue
          </button>
          <button
            onClick={() => { setAiPreselectedTemplate('keeper_tenue'); setAiInitialParams({}); setAiCustomInputs(baseAiInputAssets); setShowAiModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 12, background: 'transparent', color: 'var(--vscode-foreground, #ccc)', border: '1px solid var(--vscode-widget-border, #444)', borderRadius: 8, cursor: 'pointer' }}
          >
            🧤 Keeper
          </button>
          <button
            onClick={() => { setAiPreselectedTemplate('tracksuit_generate'); setAiInitialParams({}); setAiCustomInputs(baseAiInputAssets); setShowAiModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 12, background: 'transparent', color: 'var(--vscode-foreground, #ccc)', border: '1px solid var(--vscode-widget-border, #444)', borderRadius: 8, cursor: 'pointer' }}
          >
            🏃 Training
          </button>
        </div>

        {/* History Modal */}
        {showHistoryModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, padding: 20, width: 500, maxHeight: '80vh', overflow: 'auto' }}>
                    <div className="flex-between mb-16">
                        <h3 style={{ margin: 0, fontSize: 16 }}>Versiegeschiedenis</h3>
                        <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}>✕</button>
                    </div>
                    {loadingHistory ? (
                        <div className="p-20 text-center" style={{ color: '#888' }}>Geschiedenis laden...</div>
                    ) : historyList.length === 0 ? (
                        <div className="p-20 text-center" style={{ color: '#888' }}>Geen eerdere versies gevonden.</div>
                    ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                           {historyList.map(item => (
                               <div key={item.id} style={{ display: 'flex', gap: 12, padding: 10, background: '#252526', borderRadius: 6, alignItems: 'center' }}>
                                   <div style={{ width: 60, height: 80, background: `url(${item.url}) center/contain no-repeat`, backgroundSize: 'cover', borderRadius: 4, flexShrink: 0 }} />
                                   <div className="flex-1">
                                       <div className="fs-12 fw-600">{new Date(item.created_at).toLocaleString()}</div>
                                       <div style={{ fontSize: 11, color: '#888' }}>{item.original_name}</div>
                                   </div>
                                   <button
                                     onClick={() => handleRestore(item.id)}
                                     style={{ padding: '6px 12px', background: '#094771', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                                   >
                                     Herstellen
                                   </button>
                               </div>
                           ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Spinner animation for postprocess overlay */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* AI Generation Modal */}
        <AssetGenerationModal
          isOpen={showAiModal}
          onClose={() => { setShowAiModal(false); setAiPreviousResultUrl(null); setAiLabel(undefined); }}
          context="club"
          preSelectedTemplate={aiPreselectedTemplate}
          projectId={projectId || ''}
          organisationId={organisationId}
          inputAssets={aiCustomInputs}
          previousResultUrl={aiPreviousResultUrl}
          initialParams={aiInitialParams}
          label={aiLabel}
          onAssetSaved={refresh}
        />

        {/* Assets Top Row: Logo & Sponsor */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24, marginBottom: 24 }}>
          {/* Logo */}
          <div style={{ background: '#252526', padding: 16, borderRadius: 8, border: '1px solid #333' }}>
             <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Logo</h3>
             <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Upload het teamlogo → AI standaardiseert het. Zonder eigen logo wordt het clublogo geërfd.</p>
             <AssetGrid>
                <AssetCard label="Logo (upload)" assetType="logo_upload" asset={getAsset('logo_upload')} onUpload={handleUpload} onDelete={handleDelete} aspectRatio="1 / 1" />
                {(() => { const e = getEffectiveAsset('logo'); return (
                  <AssetCard label="Logo (bewerkt)" assetType="logo" asset={e.asset} inherited={e.inherited} inheritedFrom="Club" onUpload={handleUpload} onDelete={handleDelete} onReplace={handleReplaceAi} onPostProcess={handlePostProcess} isProcessing={postProcessingAsset === 'logo' || uploadProcessingAsset === 'logo'} aspectRatio="1 / 1" />
                ); })()}
             </AssetGrid>
          </div>

          {/* Sponsor */}
          <div style={{ background: '#252526', padding: 16, borderRadius: 8, border: '1px solid #333' }}>
             <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Sponsor</h3>
             <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Upload het sponsor logo → AI standaardiseert. Zonder eigen sponsor wordt de clubsponsor geërfd.</p>
             <AssetGrid>
                <AssetCard label="Sponsor (upload)" assetType="sponsor_logo_upload" asset={getAsset('sponsor_logo_upload')} onUpload={handleUpload} onDelete={handleDelete} aspectRatio="1 / 1" />
                {(() => { const e = getEffectiveAsset('sponsor_logo'); return (
                  <AssetCard label="Sponsor (bewerkt)" assetType="sponsor_logo" asset={e.asset} inherited={e.inherited} inheritedFrom="Club" onUpload={handleUpload} onDelete={handleDelete} onReplace={handleReplaceAi} onPostProcess={handlePostProcess} isProcessing={postProcessingAsset === 'sponsor_logo' || uploadProcessingAsset === 'sponsor_logo'} aspectRatio="1 / 1" />
                ); })()}
             </AssetGrid>
          </div>
        </div>

        {/* Kits Grid — same layout as club */}
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Tenues</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {KIT_ROLES.map((role) => {
          const uploadType = `kit_${role.id}_upload`;
          const processedType = `kit_${role.id}`;
          const eff = getEffectiveAsset(processedType);

          return (
            <div key={role.id} style={{ background: '#252526', padding: 12, borderRadius: 8, border: '1px solid #333' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{role.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{role.label}</span>
                    {eff.inherited && <span style={{ fontSize: 10, background: '#0e639c', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>Club</span>}
                </div>
              <AssetGrid>
                <AssetCard
                  label={`${role.label} (upload)`}
                  assetType={uploadType}
                  asset={getAsset(uploadType)}
                  onUpload={handleUpload}
                  onDelete={handleDelete}
                />
                <AssetCard
                  label={`${role.label} (bewerkt)`}
                  assetType={processedType}
                  asset={eff.asset}
                  inherited={eff.inherited}
                  inheritedFrom="Club"
                  onUpload={handleUpload}
                  onDelete={handleDelete}
                  onReplace={handleReplaceAi}
                  onPostProcess={handlePostProcess}
                  isProcessing={postProcessingAsset === processedType || uploadProcessingAsset === processedType}
                  onShowHistory={handleShowHistory}
                />
              </AssetGrid>
            </div>
          );
        })}
        </div>

        {/* Location */}
        <Section title="📍 Locatie" description="Upload een voetbalveld foto → AI zet het om naar portrait formaat. Zonder eigen foto wordt de club-locatie geërfd.">
          <AssetGrid>
            <AssetCard
              label="Veld foto (upload)"
              assetType="location_photo"
              asset={getAsset('location_photo')}
              onUpload={handleUpload}
              onDelete={handleDelete}
              aspectRatio="16 / 9"
            />
            {(() => { const e = getEffectiveAsset('stadium_background'); return (
              <AssetCard
                label="Achtergrond (bewerkt)"
                assetType="stadium_background"
                asset={e.asset}
                inherited={e.inherited}
                inheritedFrom="Club"
                onUpload={handleUpload}
                onDelete={handleDelete}
                onReplace={handleReplaceAi}
                onPostProcess={handlePostProcess}
                isProcessing={postProcessingAsset === 'stadium_background'}
                aspectRatio="9 / 16"
              />
            ); })()}
          </AssetGrid>
        </Section>

        {!profile && (
          <div
            style={{
              padding: 16,
              background: 'var(--vscode-inputValidation-warningBackground, #5a4000)',
              border: '1px solid var(--vscode-inputValidation-warningBorder, #856d00)',
              borderRadius: 8,
              marginTop: 16,
              fontSize: 12,
            }}
          >
            ⚠️ Nog geen brand profiel voor dit team. Upload of genereer een asset — het profiel wordt automatisch aangemaakt.
          </div>
        )}
      </div>
    );
  }

  // ── SEASON level ──
  if (level === 'season') {
    return (
      <div className="p-16">
        <Section title="Seizoen Assets" description="Visuele assets voor dit seizoen. Tenue en sponsor kunnen per seizoen wijzigen.">
          {/* Logo - always inherited */}
          <div className="mb-16">
            <div className="fs-12 fw-600" style={{ marginBottom: 6 }}>Logo</div>
            <AssetGrid>
              {(() => { const e = getEffectiveAsset('logo'); return (
                <AssetCard label="Logo" assetType="logo" asset={e.asset} inherited={e.inherited} inheritedFrom="Club" readOnly aspectRatio="1 / 1" />
              ); })()}
            </AssetGrid>
          </div>

          {/* Sponsor - can override */}
          <div className="mb-16">
            <div className="fs-12 fw-600" style={{ marginBottom: 6 }}>Sponsor</div>
            <AssetGrid>
              {(() => { const e = getEffectiveAsset('sponsor_logo'); return (
                <AssetCard
                  label={e.inherited ? 'Sponsor (van team/club)' : 'Sponsor'}
                  assetType="sponsor_logo"
                  asset={e.asset}
                  inherited={e.inherited}
                  inheritedFrom="Team"
                  readOnly={readOnly}
                  aspectRatio="1 / 1"
                />
              ); })()}
              {!readOnly && (
                <AssetCard
                  label="Sponsor uploaden (override)"
                  assetType="sponsor_logo_upload"
                  asset={getAsset('sponsor_logo_upload')}
                  onUpload={handleUpload}
                  onDelete={handleDelete}
                  aspectRatio="1 / 1"
                />
              )}
            </AssetGrid>
          </div>

          {/* Kits - combined with this season's sponsor */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Tenues (dit seizoen)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
              {KIT_ROLES.map((role) => {
                const uploadType = `kit_${role.id}_upload`;
                const processedType = `kit_${role.id}`;
                const combinedType = `kit_${role.id}_combined`;

                // Effective asset for display (inherited or local combined)
                const eff = getEffectiveAsset(combinedType);

                // Check for local override
                const localUpload = getAsset(uploadType);
                const localProcessed = getAsset(processedType);
                const isOverridden = !!localUpload || !!localProcessed;

                return (
                  <div key={role.id} style={{ background: '#252526', padding: 12, borderRadius: 8, border: '1px solid #333' }}>
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>{role.icon}</span>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{role.label}</span>
                            {isOverridden && <span style={{ fontSize: 10, background: '#eab308', color: '#000', padding: '2px 6px', borderRadius: 4 }}>Aangepast</span>}
                         </div>
                         {/* If overridden, allow clearing the override specific to this role (both upload and processed) */}
                         {!readOnly && isOverridden && (
                            <button
                                onClick={() => { if(window.confirm('Aangepast tenue verwijderen en weer erven van club?')) { handleDelete(uploadType); handleDelete(processedType); } }}
                                style={{ color: '#ef4444', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Herstel
                            </button>
                         )}
                     </div>

                    <AssetGrid>
                      {/* 1. Visual Result (Inherited or Final) */}
                      {/* If not overridden, we show the inherited result. */}
                      {!isOverridden && (
                          <AssetCard
                            label="Resultaat (Geërfd)"
                            assetType={combinedType}
                            asset={eff.asset}
                            inherited={true}
                            inheritedFrom="Club"
                            readOnly
                          />
                      )}

                      {/* 2. Controls to Override */}
                      {!readOnly && (
                          <>
                              <AssetCard
                                label={isOverridden ? "Upload (Bron)" : "Upload (Override)"}
                                assetType={uploadType}
                                asset={localUpload}
                                onUpload={handleUpload}
                                onDelete={handleDelete}
                              />
                              {isOverridden && (
                                  <AssetCard
                                    label="Bewerkt (AI)"
                                    assetType={processedType}
                                    asset={localProcessed}
                                    onUpload={handleUpload}
                                    onDelete={handleDelete}
                                    onReplace={handleReplaceAi}
                                    onPostProcess={handlePostProcess}
                                    isProcessing={postProcessingAsset === processedType || uploadProcessingAsset === processedType}
                                  />
                              )}
                          </>
                      )}

                      {/* 3. AI Helper Button (if not overridden) */}
                      {!readOnly && !isOverridden && (
                           <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                                <button
                                    onClick={() => handleReplaceAi(processedType)}
                                    style={{
                                        padding: '8px 12px',
                                        fontSize: 12,
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        fontWeight: 500
                                    }}
                                >
                                    ✨ Genereer met AI
                                </button>
                                <span style={{ fontSize: 10, color: '#888', textAlign: 'center', lineHeight: 1.4 }}>
                                    Genereert een nieuw tenue voor dit seizoen.<br/>(Gebruikt seizoens- of clubsponsor)
                                </span>
                           </div>
                      )}
                    </AssetGrid>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>
      </div>
    );
  }

  // ── MATCH level ──
  if (level === 'match') {
    return (
      <div className="p-16">
        <Section title="Wedstrijd Assets" description="Visuele assets voor deze wedstrijd (read-only, geërfd van het seizoen).">
          <AssetGrid>
            {(() => { const e = getEffectiveAsset('logo'); return (
              <AssetCard label="Logo" assetType="logo" asset={e.asset} inherited readOnly aspectRatio="1 / 1" />
            ); })()}
            {(() => { const e = getEffectiveAsset('kit_home_combined'); return (
              <AssetCard label="🏠 Thuistenue" assetType="kit_home_combined" asset={e.asset} inherited readOnly />
            ); })()}
            {(() => { const e = getEffectiveAsset('kit_away_combined'); return (
              <AssetCard label="✈️ Uittenue" assetType="kit_away_combined" asset={e.asset} inherited readOnly />
            ); })()}
            {(() => { const e = getEffectiveAsset('kit_goalkeeper_combined'); return (
              <AssetCard label="🧤 Keeper" assetType="kit_goalkeeper_combined" asset={e.asset} inherited readOnly />
            ); })()}
          </AssetGrid>
        </Section>
      </div>
    );
  }

  // ── MEMBER level ──
  if (level === 'member') {
    return (
      <div className="p-16">
        <Section title="Speler Assets" description="Tenue en logo geërfd van het team/seizoen.">
          <AssetGrid>
            {(() => { const e = getEffectiveAsset('logo'); return (
              <AssetCard label="Logo" assetType="logo" asset={e.asset} inherited inheritedFrom="Team" readOnly aspectRatio="1 / 1" />
            ); })()}
            {(() => { const e = getEffectiveAsset('kit_home_combined'); return (
              <AssetCard label="🏠 Tenue (compleet)" assetType="kit_home_combined" asset={e.asset} inherited inheritedFrom="Seizoen" readOnly />
            ); })()}
            {(() => { const e = getEffectiveAsset('sponsor_logo'); return (
              <AssetCard label="Sponsor" assetType="sponsor_logo" asset={e.asset} inherited inheritedFrom="Team" readOnly aspectRatio="1 / 1" />
            ); })()}
          </AssetGrid>
        </Section>
      </div>
    );
  }

  return null;
}

export default AssetsTab;
