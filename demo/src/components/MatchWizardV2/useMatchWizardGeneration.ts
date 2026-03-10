/**
 * useMatchWizardGeneration — Generation state & handlers
 *
 * Owns generation-related state, delegates dispatch to contentDispatchers,
 * and provides save-to-asset handlers.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle } from 'lucide-react';

import { logger } from '@/utils/logger';
import type { GeneratedVariant, GeneratedOutput } from '@/pages/identity/ContentGenerationModal/types';
import { useContentOptions } from '@/pages/identity/ContentGenerationModal/useContentOptions';
import { useSeasonSquadData } from '@/pages/identity/ContentGenerationModal/useSeasonSquadData';
import { useVideoJobPolling } from '@/pages/identity/ContentGenerationModal/useVideoJobPolling';
import { saveGeneratedVariant } from '@/pages/identity/ContentGenerationModal/contentGenerationApi';
import { useToast } from '@/components/ui/Toast';
import { useMatchWizard } from './MatchWizardContext';
import { validateLineup, dispatchContentGeneration } from './contentDispatchers';

const VIDEO_QUEUE_LABELS: Record<string, string> = {
  lineup: 'Lineup video staat in de wachtrij en wordt op de achtergrond verwerkt.',
  goal: 'Goal celebration staat in de wachtrij en wordt op de achtergrond verwerkt.',
  match_intro: 'Match intro staat in de wachtrij en wordt op de achtergrond verwerkt.',
};

// ─── Hook ─────────────────────────────────────────────────

export function useMatchWizardGeneration(isOpen: boolean) {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const mw = useMatchWizard();

  // ── Generation state ──────────────────────────────────
  const [progress, setProgress] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedOutput, setGeneratedOutput] = useState<GeneratedOutput | null>(null);
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [savingAsset, setSavingAsset] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedVariantIndices, setSavedVariantIndices] = useState<Set<number>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Derived match data ──────────────────────────────────
  const matchDataForApi = useMemo(() => {
    if (!mw.selectedMatch) return null;
    return {
      id: String(mw.selectedMatch.id),
      title: mw.selectedMatch.title,
      project: mw.selectedMatch.project,
      opponent_project: mw.selectedMatch.opponent_project ?? undefined,
      participations: mw.selectedMatch.participations,
      start_time: mw.selectedMatch.start_time,
      location: mw.selectedMatch.location,
      metadata: {
        ...(mw.selectedMatch.metadata || {}),
        formation: mw.lineupFormation,
        lineup: {
          formation: mw.lineupFormation,
          goalkeeper: mw.lineupSlots.goalkeeper,
          player: mw.lineupSlots.player,
        },
      },
    };
  }, [mw.selectedMatch, mw.lineupFormation, mw.lineupSlots]);

  const projectId = mw.selectedMatch?.project?.id || undefined;
  const organisationId = mw.selectedMatch?.project?.organisation_id
    || mw.selectedMatch?.organisation?.id || null;

  const selectedType = useMemo(() => {
    if (!mw.pendingContent) return null;
    return {
      type: mw.pendingContent.templateType,
      subtype: mw.pendingContent.subtype,
      label: mw.pendingContent.label,
    };
  }, [mw.pendingContent]);

  const isLineupFlow = mw.pendingContent
    ? ['lineup', 'lineup_flyer', 'poster'].includes(mw.pendingContent.subtype)
    : false;

  // ── Sub-hooks ───────────────────────────────────────────
  const options = useContentOptions({ isOpen, matchData: matchDataForApi });
  useEffect(() => { options.setLineupFormation(mw.lineupFormation); }, [mw.lineupFormation]);

  const seasonSquad = useSeasonSquadData({
    isOpen: isOpen && !!mw.selectedMatch,
    projectId: projectId ? String(projectId) : null,
    seasonId: null,
    selectedTemplate: mw.selectedTemplate,
  });

  const lineupSlotsRef = useRef(mw.lineupSlots);
  lineupSlotsRef.current = mw.lineupSlots;

  const videoPoll = useVideoJobPolling({
    isOpen,
    step: 'generating',
    onGenerated: undefined,
  });

  // ── Reset on close ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setGenerationError(null);
      setGeneratedOutput(null);
      setGeneratedVariants([]);
      setSelectedVariantIndex(0);
      setSavingAsset(false);
      setSaveSuccess(false);
      setSavedVariantIndices(new Set());
      setSaveError(null);
      videoPoll.resetVideo();
    }
  }, [isOpen]);

  // ── Generation dispatch ─────────────────────────────────

  const handleGenerate = async (): Promise<string | undefined> => {
    setGenerationError(null);
    setGeneratedOutput(null);
    setGeneratedVariants([]);
    setSelectedVariantIndex(0);
    setSaveSuccess(false);
    setSavedVariantIndices(new Set());
    videoPoll.resetVideo();

    const subtype = mw.pendingContent?.subtype || '';

    // Pre-flight lineup validation
    const validationError = validateLineup(mw.lineupFormation, mw.lineupSlots, subtype);
    if (validationError) { setGenerationError(validationError); return; }

    // Sync lineup to selectedMembers before generation
    seasonSquad.setSelectedMembers({
      goalkeeper: lineupSlotsRef.current.goalkeeper.filter(Boolean),
      player: lineupSlotsRef.current.player.filter(Boolean),
      coach: [],
      assistant: [],
    });

    let p = 0;
    const progressInterval = setInterval(() => {
      p += Math.random() * 10;
      if (p > 85) p = 85;
      setProgress(Math.min(p, 85));
    }, 500);

    try {
      if (['lineup', 'goal', 'match_intro'].includes(subtype)) {
        videoPoll.abortActiveVideoJobPoll();
      }
      setProgress(10);

      const result = await dispatchContentGeneration({
        subtype,
        matchData: matchDataForApi,
        seasonProjectId: projectId,
        organisationId,
        selectedType,
        selectedTemplate: mw.selectedTemplate,
        lineupFormation: mw.lineupFormation,
        selectedMembers: seasonSquad.selectedMembers,
        options,
        getMemberAssetUrl: seasonSquad.getMemberAssetUrl,
        getMemberNameById: seasonSquad.getMemberNameById,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (result.type === 'success') {
        setGeneratedVariants(result.variants);
        if (result.generatedOutput) setGeneratedOutput(result.generatedOutput);
        return 'success';
      }
      if (result.type === 'video_queued') {
        videoPoll.setVideoJobId(result.jobId);
        pushToast({
          message: VIDEO_QUEUE_LABELS[result.subtype] || 'Video staat in de wachtrij.',
          type: 'info',
          icon: Clock,
          actions: [{ label: 'Naar queue', onClick: () => navigate('/approvals') }],
        });
        window.dispatchEvent(new CustomEvent('teamreel:queue-update'));
        return 'video_queued';
      }
    } catch (err) {
      logger.error('[!] Generation failed', err);
      clearInterval(progressInterval);
      if ((err as { name?: string })?.name === 'AbortError') return 'abort';
      setGenerationError(err instanceof Error ? err.message : 'Generation failed');
      return 'error';
    }
  };

  // ── Save handlers ───────────────────────────────────────

  const handleSaveVariantByIndex = async (variantIdx: number, opts?: { skipAutoClose?: boolean }) => {
    const variant = generatedVariants[variantIdx];
    if (!variant) return;

    setSavingAsset(true);
    try {
      const result = await saveGeneratedVariant({
        variant, variantIdx, totalVariants: generatedVariants.length,
        selectedType, selectedTemplate: mw.selectedTemplate, assetType: null,
        matchData: matchDataForApi, organisationId,
      });

      setSavedVariantIndices(prev => new Set([...prev, variantIdx]));

      if (result.brand_asset_id || result.media_item_id) {
        const nextStorageInfo: NonNullable<GeneratedVariant['storage_info']> = variant.storage_info
          ? { ...variant.storage_info }
          : {
              storage_backend: 's3',
              storage_path: result.storage_path || variant.presigned_url || '',
              file_size_bytes: 0,
              mime_type: variant.mime_type || 'image/png',
            };
        if (result.storage_path) nextStorageInfo.storage_path = result.storage_path;
        if (result.file_asset_id) nextStorageInfo.file_asset_id = result.file_asset_id;
        if (result.brand_asset_id) nextStorageInfo.brand_asset_id = result.brand_asset_id;
        if (result.media_item_id) nextStorageInfo.media_item_id = result.media_item_id;

        const updated = [...generatedVariants];
        updated[variantIdx] = { ...variant, storage_info: nextStorageInfo };
        setGeneratedVariants(updated);
      }

      if (!opts?.skipAutoClose && generatedVariants.length <= 1) {
        setSaveSuccess(true);
        const previewUrl = variant.presigned_url || generatedOutput?.presigned_url;
        pushToast({
          message: `${mw.pendingContent?.label || 'Content'} opgeslagen!`,
          type: 'success',
          icon: CheckCircle,
          actions: [
            ...(previewUrl ? [{ label: 'Bekijk', onClick: () => window.open(previewUrl, '_blank') }] : []),
            { label: 'Naar queue', onClick: () => navigate('/approvals') },
          ],
        });
        window.dispatchEvent(new CustomEvent('teamreel:queue-update'));
      }
    } catch (err) {
      logger.error(`[!] Failed to save variant ${variantIdx + 1}`, err);
      setSaveError(err instanceof Error ? err.message : 'Opslaan mislukt');
    } finally {
      setSavingAsset(false);
    }
  };

  const handleSaveAsAsset = async () => {
    await handleSaveVariantByIndex(selectedVariantIndex);
  };

  const handleSaveAllAsAssets = async () => {
    setSavingAsset(true);
    setSaveSuccess(false);
    for (let i = 0; i < generatedVariants.length; i++) {
      if (savedVariantIndices.has(i)) continue;
      await handleSaveVariantByIndex(i, { skipAutoClose: true });
    }
    setSaveSuccess(true);
    setSavingAsset(false);
    const previewUrl = generatedVariants[0]?.presigned_url || generatedOutput?.presigned_url;
    pushToast({
      message: `${generatedVariants.length} varianten opgeslagen!`,
      type: 'success',
      icon: CheckCircle,
      actions: [
        ...(previewUrl ? [{ label: 'Bekijk', onClick: () => window.open(previewUrl, '_blank') }] : []),
        { label: 'Naar queue', onClick: () => navigate('/approvals') },
      ],
    });
    window.dispatchEvent(new CustomEvent('teamreel:queue-update'));
  };

  return {
    progress,
    generationError,
    generatedOutput,
    generatedVariants,
    selectedVariantIndex,
    setSelectedVariantIndex,
    savingAsset,
    saveSuccess,
    savedVariantIndices,
    saveError,
    matchDataForApi,
    selectedType,
    isLineupFlow,
    options,
    seasonSquad,
    videoPoll,
    handleGenerate,
    handleSaveAsAsset,
    handleSaveAllAsAssets,
    handleSaveVariantByIndex,
  };
}
