/**
 * BatchGenerationModal — Batch AI Asset Generation for multiple members
 *
 * Allows selecting a template, configuring per-member parameters,
 * and running generation sequentially for all selected members.
 *
 * Flow:
 * 1. Choose template (fullbody, closeup, intro, celebration)
 * 2. Set default params (sleeves, pose, kit_type, etc.)
 * 3. Optionally override params per member
 * 4. Start batch → processes one-by-one with progress tracking
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Badge, Button } from '@django-core/design-system';
import {
  getTemplatesForContext,
  type AssetTemplate,
  type TemplateParameter,
} from '../../constants/assetTemplates';
import { getAssetUrl, KIT_ROLES } from '../../hooks/useBrandProfile';
import { getApiBaseUrl } from '../../utils/apiBase';

// ============================================================================
// Constants
// ============================================================================

const PROCESS_ASSET_TYPES = [
  { value: 'fullbody' as const, label: 'Fullbody', icon: '🧍' },
  { value: 'closeup' as const, label: 'Close-up', icon: '👤' },
  { value: 'intro' as const, label: 'Short Intro', icon: '🎬' },
  { value: 'celebration' as const, label: 'Celebration', icon: '🎉' },
];

// ============================================================================
// Types
// ============================================================================

export interface BatchMember {
  id: string; // membership ID
  name: string;
  profilePhotoUrl: string | null;
  /** Per-kit-type fullbody URLs (e.g. { home: "s3://...", away: "..." }) */
  fullbodyUrls: Record<string, string>;
  /** Per-kit-type closeup URLs */
  closeupUrls: Record<string, string>;
  metadata?: any;
}

interface MemberParams {
  [paramKey: string]: string;
}

type BatchStatus = 'idle' | 'running' | 'done';

interface MemberJobStatus {
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  error?: string;
  resultUrl?: string;
  progressFrames?: number;
  totalFrames?: number;
}

interface BatchGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: BatchMember[];
  projectId: string;
  organisationId: string;
  /** Brand profile assets (logo, sponsor URLs) */
  brandAssets: {
    logo?: string | null;
    sponsor?: string | null;
    kits: Record<string, string | null>; // { home: kitUrl, away: kitUrl, ... }
  };
  /** Callback when batch completes (to refresh data) */
  onBatchComplete?: () => void;
}

function getCsrfToken(): string {
  return (
    document.cookie
      .split('; ')
      .find((r) => r.startsWith('csrftoken='))
      ?.split('=')[1] || ''
  );
}

// ============================================================================
// Styles
// ============================================================================

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9000,
  background: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
};

const modalStyle: React.CSSProperties = {
  background: 'var(--app-surface, #1a1a2e)',
  borderRadius: '12px',
  width: '100%',
  maxWidth: '900px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  border: '1px solid var(--app-border, #333)',
};

const headerStyle: React.CSSProperties = {
  padding: '20px 24px',
  borderBottom: '1px solid var(--app-border, #333)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const bodyStyle: React.CSSProperties = {
  padding: '24px',
  overflowY: 'auto',
  flex: 1,
};

const footerStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderTop: '1px solid var(--app-border, #333)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
};

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid var(--app-border, #555)',
  background: 'var(--app-surface-2, #252540)',
  color: 'var(--app-text, #e0e0e0)',
  fontSize: '13px',
  minWidth: '100px',
};

const memberRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--app-border, #333)',
  marginBottom: '8px',
};

const avatarStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  objectFit: 'cover',
  background: 'var(--app-muted, #333)',
  flexShrink: 0,
};

// ============================================================================
// Component
// ============================================================================

export const BatchGenerationModal: React.FC<BatchGenerationModalProps> = ({
  isOpen,
  onClose,
  members,
  projectId,
  organisationId,
  brandAssets,
  onBatchComplete,
}) => {
  const apiBase = getApiBaseUrl();

  // Step: 'configure' → 'running' → 'done'
  const [step, setStep] = useState<'configure' | 'running' | 'done'>('configure');

  // Template selection
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('fullbody_in_tenue');

  // Default params (applied to all members unless overridden)
  const [defaultParams, setDefaultParams] = useState<MemberParams>({});

  // Per-member param overrides: { membershipId: { pose: 'arms_crossed', ... } }
  const [memberOverrides, setMemberOverrides] = useState<Record<string, MemberParams>>({});

  // Expanded member rows (to show per-member settings)
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  // Batch progress
  const [jobStatuses, setJobStatuses] = useState<Record<string, MemberJobStatus>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const abortRef = useRef(false);
  // Mode selection: 'generate' (AI generation + optional processing) or 'processOnly' (skip generation, process existing)
  const [batchMode, setBatchMode] = useState<'generate' | 'processOnly'>('generate');
  // If true, trigger backend processing (POST /api/v1/video/jobs/process-asset/) after
  // the generated asset is saved to membership metadata.
  const [processAfterGeneration, setProcessAfterGeneration] = useState<boolean>(false);
  // Asset type selection for processOnly mode
  const [processAssetType, setProcessAssetType] = useState<'fullbody' | 'closeup' | 'intro' | 'celebration'>('fullbody');

  // Available templates for member context
  const memberTemplates = useMemo(() => getTemplatesForContext('member'), []);

  const selectedTemplate = useMemo(
    () => memberTemplates.find((t) => t.id === selectedTemplateId) || memberTemplates[0],
    [memberTemplates, selectedTemplateId]
  );

  // Initialize default params when template changes
  useEffect(() => {
    if (!selectedTemplate) return;
    const defaults: MemberParams = {};
    for (const [key, param] of Object.entries(selectedTemplate.parameters)) {
      defaults[key] = param.default;
    }
    setDefaultParams(defaults);
    setMemberOverrides({});
    setExpandedMembers(new Set());
  }, [selectedTemplate]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('configure');
      setJobStatuses({});
      setCurrentIndex(0);
      abortRef.current = false;
    }
  }, [isOpen]);

  // Get effective params for a member
  const getEffectiveParams = useCallback(
    (memberId: string): MemberParams => {
      const overrides = memberOverrides[memberId] || {};
      return { ...defaultParams, ...overrides };
    },
    [defaultParams, memberOverrides]
  );

  // Toggle member row expansion
  const toggleMemberExpanded = (memberId: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  // Update a member's override param
  const setMemberParam = (memberId: string, key: string, value: string) => {
    setMemberOverrides((prev) => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || {}),
        [key]: value,
      },
    }));
  };

  // Should a parameter be visible? (visibleIf logic)
  const isParamVisible = (param: TemplateParameter, currentParams: MemberParams): boolean => {
    if (!param.visibleIf) return true;
    const depValue = currentParams[param.visibleIf.param];
    if (param.visibleIf.includes && !param.visibleIf.includes.includes(depValue)) return false;
    if (param.visibleIf.excludes && param.visibleIf.excludes.includes(depValue)) return false;
    return true;
  };

  // Determine input assets for a member based on template and kit_type
  const getInputAssetsForMember = useCallback(
    (member: BatchMember, params: MemberParams): Record<string, string | null> => {
      const kitType = params.kit_type || 'home';
      const kitUrl = brandAssets.kits[kitType] || brandAssets.kits['home'] || null;

      // For intro/celebration templates AND closeup, use the fullbody in tenue as person input.
      // Closeup needs the fullbody because its prompt says "DRESS this person in the kit"
      // — the fullbody already has the correct kit, so the closeup crops from that.
      const needsFullbodyAsInput = selectedTemplate?.outputType === 'video'
        || selectedTemplate?.category === 'closeup';

      let personUrl: string | null;
      if (needsFullbodyAsInput) {
        personUrl = member.fullbodyUrls[kitType] || member.fullbodyUrls['home'] || member.profilePhotoUrl;
      } else if (kitType === 'legacy') {
        // Legacy kit type: use the member's legacy photo (historical photo) as person input
        // Check new format (media.legacy_photo.url) and legacy format (old.profile_photo_url)
        const tr = member.metadata?.teamreel_assets;
        const legacyUrl = tr?.media?.legacy_photo?.url || tr?.old?.profile_photo_url;
        console.log(`🔍 Batch legacy photo for ${member.name}: legacyUrl=${legacyUrl}, profilePhotoUrl=${member.profilePhotoUrl}`);
        personUrl = legacyUrl || member.profilePhotoUrl;
      } else {
        personUrl = member.profilePhotoUrl;
      }

      return {
        logo: brandAssets.logo || null,
        sponsor: brandAssets.sponsor || null,
        reference: kitUrl,
        person: personUrl ? getAssetUrl(personUrl) : null,
      };
    },
    [brandAssets, selectedTemplate]
  );

  // Get existing asset URL for a member (used in processOnly mode)
  const getExistingAssetUrl = useCallback(
    (member: BatchMember, assetType: string, kitType: string): string | null => {
      const tr = member.metadata?.teamreel_assets || {};
      const extractUrl = (val: any): string | null => {
        if (!val) return null;
        if (typeof val === 'string') return val;
        if (typeof val === 'object') return val.raw || val.processed || null;
        return null;
      };

      if (assetType === 'fullbody') {
        return member.fullbodyUrls[kitType] || null;
      }
      if (assetType === 'closeup') {
        return member.closeupUrls[kitType] || null;
      }
      // intro / celebration → videos.{assetType}.{kitType} or {kitType}_{variant}
      const videos = tr?.videos || {};
      const typeVideos = videos[assetType] || {};
      // Check plain kitType first, then any variant key starting with kitType
      if (typeVideos[kitType]) return extractUrl(typeVideos[kitType]);
      const variantKey = Object.keys(typeVideos).find((k) => k.startsWith(kitType));
      if (variantKey) return extractUrl(typeVideos[variantKey]);
      // Fallback: any bare style key (old format like "arms_crossed" without kit prefix)
      const bareKey = Object.keys(typeVideos).find((k) =>
        k && !k.startsWith('home') && !k.startsWith('away') && !k.startsWith('third') && !k.startsWith('goalkeeper')
      );
      return bareKey ? extractUrl(typeVideos[bareKey]) : null;
    },
    []
  );

  // ---- Batch execution ----
  const startBatch = useCallback(async () => {
    setStep('running');
    abortRef.current = false;

    // Initialize all as pending
    const initial: Record<string, MemberJobStatus> = {};
    members.forEach((m) => {
      initial[m.id] = { status: 'pending' };
    });
    setJobStatuses(initial);

    for (let i = 0; i < members.length; i++) {
      if (abortRef.current) break;

      const member = members[i];
      setCurrentIndex(i);
      setJobStatuses((prev) => ({
        ...prev,
        [member.id]: { status: 'running' },
      }));

      const params = getEffectiveParams(member.id);
      const inputAssets = getInputAssetsForMember(member, params);
      const kitType = params.kit_type || 'home';
      const category = batchMode === 'processOnly' ? processAssetType : selectedTemplate.category;

      // ── PROCESS ONLY MODE: Skip generation, process existing asset ──
      if (batchMode === 'processOnly') {
        const isVideoType = processAssetType === 'intro' || processAssetType === 'celebration';

        try {
          // For video types (intro/celebration): use process-all-variants endpoint
          // This processes ALL unprocessed variants for this asset type
          if (isVideoType) {
            const procRes = await fetch(`${apiBase}/api/v1/video/jobs/process-all-variants/`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
              },
              body: JSON.stringify({
                membership_id: member.id,
                asset_type: processAssetType,
              }),
            });

            const procJson = await procRes.json().catch(() => ({}));

            if (!procRes.ok) {
              throw new Error(procJson?.error || `Process failed (${procRes.status})`);
            }

            // Check if there was nothing to process
            if (procJson.status === 'nothing_to_process') {
              const skippedReasons = (procJson.skipped || []).map((s: any) => s.reason).join(', ');
              setJobStatuses((prev) => ({
                ...prev,
                [member.id]: {
                  status: 'skipped',
                  error: skippedReasons.includes('already_processed')
                    ? 'Alle varianten al verwerkt'
                    : skippedReasons.includes('already_processing')
                    ? 'Varianten worden al verwerkt'
                    : skippedReasons.includes('no_raw_url')
                    ? 'Geen ruwe video gevonden'
                    : 'Geen varianten gevonden'
                },
              }));
              continue;
            }

            const totalQueued = procJson.total_queued || 0;
            setJobStatuses((prev) => ({
              ...prev,
              [member.id]: { status: 'running', error: `${totalQueued} variant(en) bezig…` }
            }));

            // Poll until ALL queued variants are processed
            // RVM video processing can take 15-30 min per video
            const POLL_INTERVAL = 5000;
            const MAX_POLLS = 360; // ~30 min total
            let allDone = false;

            for (let p = 0; p < MAX_POLLS; p++) {
              if (abortRef.current) break;
              await new Promise((r) => setTimeout(r, POLL_INTERVAL));
              if (abortRef.current) break;

              const mRes = await fetch(
                `${apiBase}/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(member.id)}/`,
                { credentials: 'include' }
              );
              if (!mRes.ok) continue;

              const mJson = await mRes.json().catch(() => null);
              const mData = mJson?.data || mJson;
              const mMeta = mData?.metadata || {};
              const tr = (mMeta && (mMeta.teamreel_assets || mMeta.teamreelAssets)) || {};
              const videoCategory = (tr.videos || {})[processAssetType] || {};

              // Count how many are still processing
              let stillProcessing = 0;
              let processed = 0;
              let failed = 0;

              for (const [key, val] of Object.entries(videoCategory)) {
                if (!val || typeof val !== 'object') continue;
                const state = (val as any).processing_state || 'raw';
                if (state === 'processing' || state === 'cancelling') stillProcessing++;
                else if (state === 'processed') processed++;
                else if (state === 'failed') failed++;
              }

              setJobStatuses((prev) => ({
                ...prev,
                [member.id]: {
                  status: 'running',
                  error: `${processed} voltooid, ${stillProcessing} bezig${failed > 0 ? `, ${failed} mislukt` : ''}`
                },
              }));

              // All done when nothing is processing and we had queued items
              if (stillProcessing === 0 && (processed > 0 || failed > 0)) {
                allDone = true;
                setJobStatuses((prev) => ({
                  ...prev,
                  [member.id]: {
                    status: failed > 0 ? 'error' : 'success',
                    error: `${processed} voltooid${failed > 0 ? `, ${failed} mislukt` : ''}`,
                  },
                }));
                break;
              }
            }

            if (!allDone && !abortRef.current) {
              throw new Error('Processing timeout');
            }
          } else {
            // For image types (fullbody/closeup): use single-variant endpoint
            const existingRawUrl = getExistingAssetUrl(member, processAssetType, kitType);
            if (!existingRawUrl) {
              const typeLabel = PROCESS_ASSET_TYPES.find(t => t.value === processAssetType)?.label || processAssetType;
              setJobStatuses((prev) => ({
                ...prev,
                [member.id]: { status: 'skipped', error: `Geen bestaande ${kitType} ${typeLabel}` },
              }));
              continue;
            }

            const procRes = await fetch(`${apiBase}/api/v1/video/jobs/process-asset/`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
              },
              body: JSON.stringify({
                membership_id: member.id,
                asset_type: processAssetType,
                kit_type: kitType,
              }),
            });

            if (!procRes.ok) {
              const errJson = await procRes.json().catch(() => ({}));
              throw new Error(errJson?.error || `Process failed (${procRes.status})`);
            }

            setJobStatuses((prev) => ({ ...prev, [member.id]: { status: 'running', error: 'Bewerking bezig…' } }));

            // Poll for completion
            const POLL_INTERVAL = 3000;
            const MAX_POLLS = 80; // images ~4min
            let processed = false;

            for (let p = 0; p < MAX_POLLS; p++) {
              if (abortRef.current) break;
              await new Promise((r) => setTimeout(r, POLL_INTERVAL));
              if (abortRef.current) break;

              const mRes = await fetch(
                `${apiBase}/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(member.id)}/`,
                { credentials: 'include' }
              );
              if (!mRes.ok) continue;

              const mJson = await mRes.json().catch(() => null);
              const mData = mJson?.data || mJson;
              const mMeta = mData?.metadata || {};
              const tr = (mMeta && (mMeta.teamreel_assets || mMeta.teamreelAssets)) || {};

              const checkVal = ((tr.images || {})[processAssetType] || {})[kitType];

              if (checkVal && typeof checkVal === 'object') {
                const state = checkVal.processing_state || checkVal.state || null;
                if (state === 'processed') {
                  setJobStatuses((prev) => ({
                    ...prev,
                    [member.id]: { status: 'success', resultUrl: checkVal.processed || '' },
                  }));
                  processed = true;
                  break;
                }
                if (state === 'failed') {
                  throw new Error(checkVal.error || 'Processing failed');
                }
              }
            }

            if (!processed && !abortRef.current) {
              throw new Error('Processing timeout');
            }
          }
        } catch (err) {
          console.error(`Batch processing failed for ${member.name}:`, err);
          setJobStatuses((prev) => ({
            ...prev,
            [member.id]: {
              status: 'error',
              error: err instanceof Error ? err.message : 'Onbekende fout',
            },
          }));
        }
        continue;
      }

      // ── GENERATE MODE: AI generation + optional processing ──

      // For video types (intro/celebration): Check if member already has an existing
      // raw video variant that can be processed, to avoid re-generating unnecessarily.
      // If found, process the existing one instead of generating a new one.
      const isVideoCategory = selectedTemplate?.category === 'intro' || selectedTemplate?.category === 'celebration';
      if (isVideoCategory) {
        const tr = member.metadata?.teamreel_assets || {};
        const videoCategory = (tr.videos || {})[selectedTemplate.category] || {};

        // Look for any variant with a raw URL that is not yet processed
        let existingVariantToProcess: { key: string; rawUrl: string } | null = null;
        for (const [key, val] of Object.entries(videoCategory)) {
          if (!val || typeof val !== 'object') continue;
          const v = val as any;
          const state = v.processing_state || 'raw';
          // If there's a raw URL and it's not already processed or being processed
          if (v.raw && state !== 'processed' && state !== 'processing') {
            existingVariantToProcess = { key, rawUrl: v.raw };
            break; // Use the first unprocessed variant found
          }
        }

        if (existingVariantToProcess) {
          console.log(`🔄 Batch: Found existing ${selectedTemplate.category} for ${member.name}: ${existingVariantToProcess.key}`);
          setJobStatuses((prev) => ({
            ...prev,
            [member.id]: { status: 'running', error: `Bestaande ${existingVariantToProcess!.key} verwerken…` },
          }));

          try {
            // Use process-all-variants to process the existing variant
            const procRes = await fetch(`${apiBase}/api/v1/video/jobs/process-all-variants/`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
              },
              body: JSON.stringify({
                membership_id: member.id,
                asset_type: selectedTemplate.category,
              }),
            });

            const procJson = await procRes.json().catch(() => ({}));

            if (!procRes.ok) {
              throw new Error(procJson?.error || `Process failed (${procRes.status})`);
            }

            if (procJson.status === 'nothing_to_process') {
              setJobStatuses((prev) => ({
                ...prev,
                [member.id]: { status: 'success', error: 'Al verwerkt' },
              }));
            } else {
              // Poll for completion (same as processOnly mode)
              const totalQueued = procJson.total_queued || 0;
              setJobStatuses((prev) => ({
                ...prev,
                [member.id]: { status: 'running', error: `${totalQueued} variant(en) bezig…` }
              }));

              const POLL_INTERVAL = 5000;
              const MAX_POLLS = 360;
              let allDone = false;

              for (let p = 0; p < MAX_POLLS; p++) {
                if (abortRef.current) break;
                await new Promise((r) => setTimeout(r, POLL_INTERVAL));
                if (abortRef.current) break;

                const mRes = await fetch(
                  `${apiBase}/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(member.id)}/`,
                  { credentials: 'include' }
                );
                if (!mRes.ok) continue;

                const mJson = await mRes.json().catch(() => null);
                const mData = mJson?.data || mJson;
                const mMeta = mData?.metadata || {};
                const trPoll = (mMeta && (mMeta.teamreel_assets || mMeta.teamreelAssets)) || {};
                const videoCategoryPoll = (trPoll.videos || {})[selectedTemplate.category] || {};

                let stillProcessing = 0;
                let processed = 0;
                let failed = 0;

                for (const [, pollVal] of Object.entries(videoCategoryPoll)) {
                  if (!pollVal || typeof pollVal !== 'object') continue;
                  const pollState = (pollVal as any).processing_state || 'raw';
                  if (pollState === 'processing' || pollState === 'cancelling') stillProcessing++;
                  else if (pollState === 'processed') processed++;
                  else if (pollState === 'failed') failed++;
                }

                setJobStatuses((prev) => ({
                  ...prev,
                  [member.id]: {
                    status: 'running',
                    error: `${processed} voltooid, ${stillProcessing} bezig${failed > 0 ? `, ${failed} mislukt` : ''}`
                  },
                }));

                if (stillProcessing === 0 && (processed > 0 || failed > 0)) {
                  allDone = true;
                  setJobStatuses((prev) => ({
                    ...prev,
                    [member.id]: {
                      status: failed > 0 ? 'error' : 'success',
                      error: `${processed} voltooid${failed > 0 ? `, ${failed} mislukt` : ''}`,
                    },
                  }));
                  break;
                }
              }

              if (!allDone && !abortRef.current) {
                throw new Error('Processing timeout');
              }
            }
          } catch (err) {
            console.error(`Batch processing existing variant failed for ${member.name}:`, err);
            setJobStatuses((prev) => ({
              ...prev,
              [member.id]: {
                status: 'error',
                error: err instanceof Error ? err.message : 'Onbekende fout',
              },
            }));
          }
          continue;
        }
      }

      // Check if required inputs are available
      if (!inputAssets.person) {
        const needsFullbody = selectedTemplate?.category === 'closeup' || selectedTemplate?.outputType === 'video';
        setJobStatuses((prev) => ({
          ...prev,
          [member.id]: {
            status: 'skipped',
            error: needsFullbody ? 'Geen fullbody in tenue gevonden' : 'Geen profielfoto',
          },
        }));
        continue;
      }

      try {
        // Build input URLs (filter nulls) and map keys to backend format
        // Frontend uses: person, reference
        // Backend expects: person_photo, reference_photo
        const inputImageUrls: Record<string, string> = {};
        const isValidUrl = (url: string): boolean => {
          try { new URL(url); return true; } catch { return false; }
        };
        for (const [key, val] of Object.entries(inputAssets)) {
          if (!val) continue;
          // Ensure URL is valid (encode spaces/special chars in S3 paths)
          let safeVal = val;
          if (!isValidUrl(safeVal)) {
            safeVal = encodeURI(safeVal);
          }
          if (!isValidUrl(safeVal)) {
            console.warn(`⚠️ Batch: skipping invalid URL for ${key}:`, val);
            continue;
          }
          if (key === 'person') {
            inputImageUrls['person_photo'] = safeVal;
          } else if (key === 'reference') {
            inputImageUrls['reference_photo'] = safeVal;
          } else {
            inputImageUrls[key] = safeVal;
          }
        }

        const res = await fetch(`${apiBase}/api/v1/generative/assets/generate/`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          body: JSON.stringify({
            template_id: selectedTemplate.id,
            params,
            variant_count: 1, // Batch always generates 1 variant per member
            input_images: {},
            input_image_urls: inputImageUrls,
            organisation_id: organisationId,
            project_id: projectId,
            membership_id: member.id,
            asset_type: selectedTemplate.outputAssetType,
            // Route image generations through approval queue (same as member detail page)
            ...(selectedTemplate.outputType !== 'video' ? { save_to_brand: false, save_to_media_library: false } : {}),
          }),
        });

        // ── Async path: all generations now return 202 + task_id ─────
        let responseData: Record<string, unknown>;
        const isImageTemplate = selectedTemplate?.outputType !== 'video';
        // Images with save_to_brand=false go through approval queue — no need to poll/save
        const routedToApproval = isImageTemplate;

        if (res.status === 202) {
          const asyncJson = await res.json();
          // API envelope: { status: 'success', data: { task_id, ... } }
          const asyncData = asyncJson.data || asyncJson;
          const taskId = asyncData.task_id;
          if (!taskId) throw new Error('Backend returned 202 but no task_id');

          if (routedToApproval) {
            // Image routed to approval queue — mark as queued, don't poll
            console.log(`📋 Batch: image task ${taskId} for ${member.name} → approval queue`);
            setJobStatuses((prev) => ({
              ...prev,
              [member.id]: { status: 'success', error: '→ Approvals wachtrij' },
            }));
            continue; // Skip polling and auto-save, approval handles propagation
          }

          console.log(`🎬 Batch: async video task ${taskId} for ${member.name}`);
          setJobStatuses((prev) => ({
            ...prev,
            [member.id]: { status: 'running', error: 'Video wordt gegenereerd…' },
          }));

          // Poll for completion
          const POLL_INTERVAL = 5_000;
          const MAX_POLLS = 150; // ~12.5 min
          let pollResult: Record<string, unknown> | null = null;

          for (let p = 0; p < MAX_POLLS; p++) {
            if (abortRef.current) break;
            await new Promise((r) => setTimeout(r, POLL_INTERVAL));
            if (abortRef.current) break;

            const statusRes = await fetch(
              `${apiBase}/api/v1/generative/assets/generate/${taskId}/status/`,
              { credentials: 'include' }
            );

            if (!statusRes.ok) {
              if (statusRes.status === 404) throw new Error('Taak verlopen');
              throw new Error(`Status check failed: HTTP ${statusRes.status}`);
            }

            const statusJson = await statusRes.json();
            // API envelope: { status: 'success', data: { status, data, ... } }
            const statusData = statusJson.data || statusJson;

            if (statusData.status === 'completed') {
              pollResult = statusData.data || {};
              break;
            }
            if (statusData.status === 'failed') {
              throw new Error(statusData.error || 'Video generatie mislukt');
            }
          }

          if (!pollResult) throw new Error('Video generatie timeout');
          responseData = pollResult;
        } else if (res.ok) {
          // ── Sync path: image generation ────────────────────────────
          const json = await res.json();
          responseData = json.data || json;
        } else {
          const errJson = await res.json().catch(() => ({}));
          // Handle API envelope format: { status: "error", error: { code, message, details } }
          const errField = (errJson as Record<string, unknown>)?.error;
          const errMessage =
            typeof errField === 'string' ? errField :
            typeof errField === 'object' && errField ? (errField as Record<string, string>)?.message || JSON.stringify(errField) :
            (errJson as Record<string, string>)?.detail || `HTTP ${res.status}`;
          throw new Error(errMessage);
        }

        const variants = (responseData.variants || []) as Record<string, unknown>[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const variant = variants[0] as any;

        if (!variant || variant.error) {
          throw new Error(variant?.error || 'No variant returned');
        }

        // Auto-save the variant
        const storagePath = variant.storage_path || variant.storage_info?.storage_path;
        const resultUrl = variant.presigned_url || variant.video_url || storagePath;

        if (storagePath || variant.image_base64 || variant.video_url) {
          // Save to brand profile
          const isVideo = selectedTemplate?.outputType === 'video' ||
            variant.mime_type?.startsWith('video/') ||
            !!variant.video_url;

          const saveRes = await fetch(`${apiBase}/api/v1/generative/assets/save/`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify({
              storage_path: storagePath,
              presigned_url: variant.presigned_url,
              video_url: variant.video_url,
              image_base64: variant.image_base64,
              filename: variant.filename,
              mime_type: variant.mime_type || (isVideo ? 'video/mp4' : 'image/png'),
              file_size_bytes: variant.storage_info?.file_size_bytes || 0,
              organisation_id: organisationId,
              project_id: projectId,
              asset_type: selectedTemplate.outputAssetType,
            }),
          });

          const saveJson = saveRes.ok ? await saveRes.json() : null;
          const saveData = saveJson?.data?.data || saveJson?.data || saveJson;
          const savedPath = saveData?.storage_path || storagePath;

          // Update membership metadata with the generated asset
          await updateMembershipMetadata(member, params, savedPath || resultUrl || '');
        }

        setJobStatuses((prev) => ({
          ...prev,
          [member.id]: { status: 'success', resultUrl: resultUrl || '' },
        }));
      } catch (err) {
        console.error(`Batch generation failed for ${member.name}:`, err);
        setJobStatuses((prev) => ({
          ...prev,
          [member.id]: {
            status: 'error',
            error: err instanceof Error ? err.message : 'Onbekende fout',
          },
        }));
      }
    }

    setStep('done');
  }, [members, getEffectiveParams, getInputAssetsForMember, selectedTemplate, organisationId, projectId, apiBase, batchMode, processAssetType, processAfterGeneration]);

  // Update membership metadata after successful generation
  const updateMembershipMetadata = useCallback(
    async (member: BatchMember, params: MemberParams, savedUrl: string) => {
      if (!savedUrl) return;

      const kitType = params.kit_type || 'home';
      const styleVariant = params.style_variant;
      const templateId = selectedTemplate.id;
      const category = selectedTemplate.category; // fullbody, closeup, intro, celebration

      // Determine storage key path in metadata
      let metaPath: string;
      let metaKey: string;
      let mediaSlotId: string;

      if (category === 'fullbody') {
        metaPath = 'images.fullbody';
        metaKey = kitType;
        mediaSlotId = 'kit';
      } else if (category === 'closeup') {
        metaPath = 'images.closeup';
        metaKey = kitType;
        mediaSlotId = 'closeup';
      } else if (category === 'intro') {
        metaPath = 'videos.intro';
        metaKey = styleVariant ? `${kitType}_${styleVariant}` : kitType;
        mediaSlotId = 'intro';
      } else if (category === 'celebration') {
        metaPath = 'videos.celebration';
        metaKey = styleVariant ? `${kitType}_${styleVariant}` : kitType;
        mediaSlotId = 'celebration';
      } else {
        return; // Unknown category
      }

      try {
        // Read current metadata
        const existingMeta = member.metadata || {};
        const tr = existingMeta.teamreel_assets || {};
        const media = tr.media || {};

        // Build updated metadata
        const updatedTr = { ...tr };

        // Update media slot URL
        updatedTr.media = {
          ...media,
          [mediaSlotId]: { ...(media[mediaSlotId] || {}), url: savedUrl },
        };

        // Update per-variant storage (images or videos)
        // Store as object with {raw, processed, processing_state} for consistency
        // Images need further processing (bg removal), videos from MiniMax are ready
        if (category === 'fullbody' || category === 'closeup') {
          const images = updatedTr.images || {};
          const subcat = images[category] || {};
          // Images are stored as raw - need backend processing for lineup-ready format
          updatedTr.images = {
            ...images,
            [category]: {
              ...subcat,
              [metaKey]: { raw: savedUrl, processed: null, processing_state: 'raw' },
            },
          };
        } else {
          const videos = updatedTr.videos || {};
          const subcat = videos[category] || {};
          // Videos from MiniMax still have background — need processing (bg removal)
          updatedTr.videos = {
            ...videos,
            [category]: {
              ...subcat,
              [metaKey]: { raw: savedUrl, processed: null, processing_state: 'raw' },
            },
          };
        }

        const updatedMeta = {
          ...existingMeta,
          teamreel_assets: updatedTr,
        };

        // PATCH membership metadata
        const projectIdForApi = projectId;
        const res = await fetch(
          `${apiBase}/api/v1/projects/${encodeURIComponent(projectIdForApi)}/members/${encodeURIComponent(member.id)}/`,
          {
            method: 'PATCH',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify({ metadata: updatedMeta }),
          }
        );

        if (!res.ok) {
          console.error(`Failed to update metadata for ${member.name}:`, await res.text());
        }
        // If requested, trigger backend processing for this newly-saved asset
        if (processAfterGeneration) {
          // Fire-and-poll: request processing then poll membership until processed/failed
          void (async () => {
            try {
              // Trigger processing
              const procRes = await fetch(`${apiBase}/api/v1/video/jobs/process-asset/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify({
                  membership_id: member.id,
                  asset_type: category,
                  kit_type: kitType,
                  variant_id: styleVariant || null,
                }),
              });

              if (!procRes.ok) {
                const errJson = await procRes.json().catch(() => null);
                setJobStatuses((prev) => ({
                  ...prev,
                  [member.id]: { status: 'error', error: errJson?.error || `Process request failed (${procRes.status})` },
                }));
                return;
              }

              setJobStatuses((prev) => ({ ...prev, [member.id]: { status: 'running' } }));

              // Poll for membership metadata update
              const POLL_INTERVAL = 3000;
              const MAX_POLLS = 80; // ~4 minutes
              for (let p = 0; p < MAX_POLLS; p++) {
                await new Promise((r) => setTimeout(r, POLL_INTERVAL));
                // Fetch membership record
                const mRes = await fetch(
                  `${apiBase}/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(member.id)}/`,
                  { credentials: 'include' }
                );
                if (!mRes.ok) continue;
                const mJson = await mRes.json().catch(() => null);
                const mData = mJson?.data || mJson;
                const mMeta = mData?.metadata || mData?.metadata || {};
                const tr = (mMeta && (mMeta.teamreel_assets || mMeta.teamreelAssets)) || {};

                let checkVal: any = null;
                if (category === 'fullbody' || category === 'closeup') {
                  checkVal = ((tr.images || {})[category] || {})[metaKey];
                } else {
                  checkVal = ((tr.videos || {})[category] || {})[metaKey];
                }

                if (checkVal && typeof checkVal === 'object') {
                  const state = checkVal.processing_state || checkVal.state || null;
                  if (state === 'processed') {
                    setJobStatuses((prev) => ({ ...prev, [member.id]: { status: 'success', resultUrl: checkVal.processed || checkVal.processed_url || '' } }));
                    break;
                  }
                  if (state === 'failed') {
                    setJobStatuses((prev) => ({ ...prev, [member.id]: { status: 'error', error: checkVal.error || 'Processing failed' } }));
                    break;
                  }
                  // Update progress if available
                  if (state === 'processing' && (checkVal.progress_frames || checkVal.total_frames)) {
                    setJobStatuses((prev) => ({
                      ...prev,
                      [member.id]: {
                        status: 'running',
                        progressFrames: checkVal.progress_frames,
                        totalFrames: checkVal.total_frames,
                      }
                    }));
                  }
                }
                // continue polling until timeout
              }
            } catch (err) {
              console.error('Error triggering/polling processing for', member.id, err);
              setJobStatuses((prev) => ({ ...prev, [member.id]: { status: 'error', error: String(err) } }));
            }
          })();
        }
      } catch (err) {
        console.error(`Error updating metadata for ${member.name}:`, err);
      }
    },
    [selectedTemplate, projectId, apiBase]
  );

  const cancelBatch = () => {
    abortRef.current = true;
  };

  // Stats
  const completedCount = Object.values(jobStatuses).filter(
    (s) => s.status === 'success' || s.status === 'error' || s.status === 'skipped'
  ).length;
  const successCount = Object.values(jobStatuses).filter((s) => s.status === 'success').length;
  const errorCount = Object.values(jobStatuses).filter((s) => s.status === 'error').length;
  const skippedCount = Object.values(jobStatuses).filter((s) => s.status === 'skipped').length;

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>{batchMode === 'processOnly' ? '⚙️' : '🚀'}</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {batchMode === 'processOnly' ? 'Batch Bewerking' : 'Batch AI Generatie'}
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--app-muted-text)' }}>
                {members.length} {members.length === 1 ? 'member' : 'members'} geselecteerd
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={step === 'running'}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--app-text)',
              fontSize: '20px',
              cursor: step === 'running' ? 'not-allowed' : 'pointer',
              opacity: step === 'running' ? 0.4 : 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          {step === 'configure' && (
            <>
              {/* Mode selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                  Modus
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setBatchMode('generate')}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: `2px solid ${batchMode === 'generate' ? '#3b82f6' : 'var(--app-border, #444)'}`,
                      background: batchMode === 'generate' ? 'rgba(59,130,246,0.15)' : 'var(--app-surface-2, #252540)',
                      color: 'var(--app-text)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      justifyContent: 'center',
                    }}
                  >
                    <span>🎨</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600 }}>Genereer + Bewerk</div>
                      <div style={{ fontSize: '11px', opacity: 0.7 }}>AI generatie → optioneel bewerken</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setBatchMode('processOnly')}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: `2px solid ${batchMode === 'processOnly' ? '#3b82f6' : 'var(--app-border, #444)'}`,
                      background: batchMode === 'processOnly' ? 'rgba(59,130,246,0.15)' : 'var(--app-surface-2, #252540)',
                      color: 'var(--app-text)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      justifyContent: 'center',
                    }}
                  >
                    <span>⚙️</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600 }}>Alleen Bewerken</div>
                      <div style={{ fontSize: '11px', opacity: 0.7 }}>Bestaande assets bewerken</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Asset type selector for processOnly mode */}
              {batchMode === 'processOnly' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Asset Type
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PROCESS_ASSET_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setProcessAssetType(t.value)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: `2px solid ${processAssetType === t.value ? '#3b82f6' : 'var(--app-border, #444)'}`,
                        background: processAssetType === t.value ? 'rgba(59,130,246,0.15)' : 'var(--app-surface-2, #252540)',
                        color: 'var(--app-text)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* Kit type selector for processOnly mode (images only) */}
                {(processAssetType === 'fullbody' || processAssetType === 'closeup') && (
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--app-muted-text)', marginBottom: '3px' }}>
                    Tenue Type
                  </label>
                  <select
                    value={defaultParams.kit_type || 'home'}
                    onChange={(e) => setDefaultParams((prev) => ({ ...prev, kit_type: e.target.value }))}
                    style={selectStyle}
                  >
                    {KIT_ROLES.map((kr) => (
                      <option key={kr.id} value={kr.id}>{kr.label}</option>
                    ))}
                  </select>
                </div>
                )}

                {/* Info text for intro/celebration - all variants are processed */}
                {(processAssetType === 'intro' || processAssetType === 'celebration') && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: 'rgba(59,130,246,0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(59,130,246,0.3)',
                    fontSize: '13px',
                    color: 'var(--app-text)',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>💡 Alle varianten worden verwerkt</div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                      Alle combinaties van tenue + stijl die nog niet bewerkt zijn worden automatisch verwerkt.
                      Bijvoorbeeld: home_arms_crossed, goalkeeper_thumbs_up, etc.
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Template selector */}
              {batchMode === 'generate' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Template
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {memberTemplates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: `2px solid ${selectedTemplateId === t.id ? '#3b82f6' : 'var(--app-border, #444)'}`,
                        background: selectedTemplateId === t.id ? 'rgba(59,130,246,0.15)' : 'var(--app-surface-2, #252540)',
                        color: 'var(--app-text)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{t.icon}</span>
                      <span>{t.name}</span>
                      {t.outputType === 'video' && (
                        <Badge variant="info" style={{ fontSize: '10px' }}>Video</Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* Default params */}
              {batchMode === 'generate' && selectedTemplate && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Standaard Instellingen (voor alle members)
                  </label>
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'var(--app-surface-2, #252540)',
                    border: '1px solid var(--app-border, #333)',
                  }}>
                    {Object.entries(selectedTemplate.parameters).map(([key, param]) => {
                      if (!isParamVisible(param, defaultParams)) return null;
                      return (
                        <div key={key} style={{ minWidth: '120px' }}>
                          <label style={{ display: 'block', fontSize: '11px', color: 'var(--app-muted-text)', marginBottom: '3px' }}>
                            {param.label}
                          </label>
                          <select
                            value={defaultParams[key] || param.default}
                            onChange={(e) => setDefaultParams((prev) => ({ ...prev, [key]: e.target.value }))}
                            style={selectStyle}
                          >
                            {param.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Option: Process generated asset after save (only in generate mode) */}
              {batchMode === 'generate' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={processAfterGeneration}
                    onChange={(e) => setProcessAfterGeneration(e.target.checked)}
                  />
                  <span style={{ fontSize: '13px' }}>Bewerk asset na generatie (achtergrond verwijderen / formaat aanpassen)</span>
                </label>
              </div>
              )}

              {/* Member list with optional per-member overrides */}
              {/* Info box for video templates: existing variants are auto-detected */}
              {batchMode === 'generate' && selectedTemplate && (selectedTemplate.category === 'intro' || selectedTemplate.category === 'celebration') && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  fontSize: '13px',
                  color: 'var(--app-text)',
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>🔄 Slimme video verwerking</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>
                    Members met een bestaande onverwerkte video worden automatisch verwerkt in plaats van opnieuw gegenereerd.
                    Alleen members zonder video krijgen een nieuwe gegenereerd.
                  </div>
                </div>
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>
                    Members ({members.length})
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--app-muted-text)' }}>
                    Klik op een member om instellingen aan te passen
                  </span>
                </div>
                {members.map((member) => {
                  const isExpanded = expandedMembers.has(member.id);
                  const effectiveParams = getEffectiveParams(member.id);
                  const kitType = effectiveParams.kit_type || 'home';
                  const hasOverrides = Object.keys(memberOverrides[member.id] || {}).length > 0;
                  const inputAssets = getInputAssetsForMember(member, effectiveParams);
                  const missingPerson = batchMode === 'generate' && !inputAssets.person;
                  const missingExisting = batchMode === 'processOnly' && !getExistingAssetUrl(member, processAssetType, kitType);

                  // Check for existing unprocessed video variant (in generate mode with video template)
                  let existingVideoVariant: string | null = null;
                  if (batchMode === 'generate' && selectedTemplate && (selectedTemplate.category === 'intro' || selectedTemplate.category === 'celebration')) {
                    const tr = member.metadata?.teamreel_assets || {};
                    const videoCategory = (tr.videos || {})[selectedTemplate.category] || {};
                    for (const [key, val] of Object.entries(videoCategory)) {
                      if (!val || typeof val !== 'object') continue;
                      const v = val as any;
                      const state = v.processing_state || 'raw';
                      if (v.raw && state !== 'processed' && state !== 'processing' && state !== 'cancelling') {
                        existingVideoVariant = key;
                        break;
                      }
                    }
                  }

                  return (
                    <div key={member.id} style={{ marginBottom: '4px' }}>
                      <div
                        onClick={() => toggleMemberExpanded(member.id)}
                        style={{
                          ...memberRowStyle,
                          cursor: 'pointer',
                          opacity: (missingPerson || missingExisting) ? 0.5 : 1,
                          borderColor: hasOverrides ? '#3b82f6' : 'var(--app-border, #333)',
                        }}
                      >
                        {member.profilePhotoUrl ? (
                          <img src={getAssetUrl(member.profilePhotoUrl) || ''} alt="" style={avatarStyle} />
                        ) : (
                          <div style={{ ...avatarStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                            👤
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 500 }}>{member.name}</div>
                          {missingPerson && (
                            <div style={{ fontSize: '11px', color: '#ef4444' }}>⚠️ Geen input foto beschikbaar</div>
                          )}
                          {missingExisting && (
                            <div style={{ fontSize: '11px', color: '#ef4444' }}>⚠️ Geen bestaande {kitType} {PROCESS_ASSET_TYPES.find(t => t.value === processAssetType)?.label || processAssetType}</div>
                          )}
                          {existingVideoVariant && (
                            <div style={{ fontSize: '11px', color: '#22c55e' }}>✅ Bestaande {existingVideoVariant.replace(/_/g, ' ')} wordt verwerkt</div>
                          )}
                          {hasOverrides && (
                            <div style={{ fontSize: '11px', color: '#3b82f6' }}>Aangepaste instellingen</div>
                          )}
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--app-muted-text)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                          ▶
                        </span>
                      </div>

                      {isExpanded && selectedTemplate && (
                        <div style={{
                          marginLeft: '52px',
                          marginBottom: '8px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: 'var(--app-surface-2, #252540)',
                          border: '1px solid var(--app-border, #333)',
                        }}>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            {Object.entries(selectedTemplate.parameters).map(([key, param]) => {
                              if (!isParamVisible(param, effectiveParams)) return null;
                              const hasOverride = memberOverrides[member.id]?.[key] !== undefined;
                              return (
                                <div key={key} style={{ minWidth: '110px' }}>
                                  <label style={{
                                    display: 'block',
                                    fontSize: '11px',
                                    color: hasOverride ? '#3b82f6' : 'var(--app-muted-text)',
                                    marginBottom: '3px',
                                    fontWeight: hasOverride ? 600 : 400,
                                  }}>
                                    {param.label}
                                  </label>
                                  <select
                                    value={effectiveParams[key] || param.default}
                                    onChange={(e) => setMemberParam(member.id, key, e.target.value)}
                                    style={{
                                      ...selectStyle,
                                      borderColor: hasOverride ? '#3b82f6' : 'var(--app-border, #555)',
                                    }}
                                  >
                                    {param.options.map((opt) => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })}
                            {hasOverrides && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMemberOverrides((prev) => {
                                    const next = { ...prev };
                                    delete next[member.id];
                                    return next;
                                  });
                                }}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--app-border)',
                                  background: 'transparent',
                                  color: 'var(--app-muted-text)',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  alignSelf: 'flex-end',
                                  marginBottom: '2px',
                                }}
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {(step === 'running' || step === 'done') && (
            <>
              {/* Background processing notice for video types */}
              {step === 'running' && (batchMode === 'processOnly' ? (processAssetType === 'intro' || processAssetType === 'celebration') : (selectedTemplate?.category === 'intro' || selectedTemplate?.category === 'celebration')) && (
                <div style={{
                  padding: '12px',
                  marginBottom: '16px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#60a5fa',
                }}>
                  💡 Video processing draait op de server. Je kunt dit tabblad sluiten - de verwerking gaat door. Refresh de pagina later om de resultaten te zien.
                </div>
              )}

              {/* Progress overview */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                  <Badge variant="info">{completedCount}/{members.length} verwerkt</Badge>
                  {successCount > 0 && <Badge variant="success">{successCount} gelukt</Badge>}
                  {errorCount > 0 && <Badge variant="error">{errorCount} mislukt</Badge>}
                  {skippedCount > 0 && <Badge variant="warning">{skippedCount} overgeslagen</Badge>}
                </div>

                {/* Progress bar */}
                <div style={{
                  height: '4px',
                  borderRadius: '2px',
                  background: 'var(--app-border, #333)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${members.length > 0 ? (completedCount / members.length) * 100 : 0}%`,
                    background: errorCount > 0 ? '#f59e0b' : '#22c55e',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>

              {/* Member status list */}
              {members.map((member) => {
                const job = jobStatuses[member.id];
                const statusIcon =
                  job?.status === 'running' ? '⏳' :
                  job?.status === 'success' ? '✅' :
                  job?.status === 'error' ? '❌' :
                  job?.status === 'skipped' ? '⏭️' :
                  '⬜';
                const statusColor =
                  job?.status === 'success' ? '#22c55e' :
                  job?.status === 'error' ? '#ef4444' :
                  job?.status === 'skipped' ? '#f59e0b' :
                  'var(--app-muted-text)';

                return (
                  <div key={member.id} style={memberRowStyle}>
                    {member.profilePhotoUrl ? (
                      <img src={getAssetUrl(member.profilePhotoUrl) || ''} alt="" style={avatarStyle} />
                    ) : (
                      <div style={{ ...avatarStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                        👤
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{member.name}</div>
                      {job?.error && (
                        <div style={{ fontSize: '11px', color: '#ef4444' }}>{job.error}</div>
                      )}
                      {job?.status === 'running' && (
                        <div style={{ fontSize: '11px', color: '#60a5fa' }}>
                          {job.totalFrames && job.progressFrames
                            ? `Frame ${job.progressFrames}/${job.totalFrames} (${Math.round((job.progressFrames / job.totalFrames) * 100)}%)`
                            : 'Bezig met verwerken...'}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '16px' }}>{statusIcon}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          {step === 'configure' && (
            <>
              <div style={{ fontSize: '12px', color: 'var(--app-muted-text)' }}>
                {batchMode === 'generate' ? (
                  <>💎 {selectedTemplate ? selectedTemplate.creditsCost * members.length : 0} credits totaal ({selectedTemplate?.creditsCost || 0} per member)</>
                ) : (
                  <>⚙️ Bewerking: gratis (geen AI generatie)</>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" onClick={onClose}>
                  Annuleren
                </Button>
                <Button
                  variant="primary"
                  onClick={startBatch}
                  disabled={members.length === 0}
                >
                  {batchMode === 'processOnly' ? '⚙️' : '🚀'} Start Batch ({members.length})
                </Button>
              </div>
            </>
          )}

          {step === 'running' && (
            <>
              <div style={{ fontSize: '13px', color: 'var(--app-muted-text)' }}>
                ⏳ {completedCount}/{members.length} verwerkt...
              </div>
              <Button variant="secondary" onClick={cancelBatch}>
                ⏹ Stop
              </Button>
            </>
          )}

          {step === 'done' && (
            <>
              <div style={{ fontSize: '13px' }}>
                {errorCount === 0 ? '✅ Batch voltooid!' : `⚠️ ${errorCount} van ${members.length} mislukt`}
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  onBatchComplete?.();
                  onClose();
                }}
              >
                Sluiten
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchGenerationModal;
