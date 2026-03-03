/**
 * ContentGenerationModal — Orchestrator hook
 *
 * Composes useSeasonSquadData + useVideoJobPolling + api helpers.
 * Manages step navigation, option states, generation dispatch, and save logic.
 */
import { useState, useEffect, useRef } from 'react';
import type {
  ContentTemplate,
  GeneratedVariant,
  GeneratedOutput,
  ContentGenerationModalProps,
  StepType,
} from './types';
import { useSeasonSquadData } from './useSeasonSquadData';
import { useVideoJobPolling } from './useVideoJobPolling';
import {
  fetchContentTemplates,
  generateLineupFlyer,
  generateTeamPoster,
  generateMatchFlyer,
  generateMatchSummary,
  generateGenericAI,
  saveGeneratedVariant,
} from './contentGenerationApi';
import {
  generateLineupVideo,
  generateGoalCelebration,
  generateMatchIntro,
} from './contentGenerationVideoApi';
import { useContentOptions } from './useContentOptions';

export function useContentGeneration({
  isOpen,
  onClose,
  matchData,
  season,
  organisationSport,
  organisationId,
  template: initialTemplate,
  contentTypeLabel,
  assetType,
  onGenerated,
  homeTeamName: homeTeamNameProp,
  awayTeamName: awayTeamNameProp,
}: ContentGenerationModalProps) {
  // Resolve team names
  const homeTeamName = homeTeamNameProp || matchData?.project?.name || 'Thuis';
  const awayTeamName = awayTeamNameProp || matchData?.opponent_project?.name || 'Uit';
  const projectId = matchData?.project?.id || (season?.project_id ? String(season.project_id) : null);

  // ─── Step & template state ──────────────────────────────
  const [step, setStep] = useState<StepType>('type');
  const [selectedType, setSelectedType] = useState<{ type: string; subtype: string; label: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Generation state ───────────────────────────────────
  const [progress, setProgress] = useState(0);
  const [generationStartedAtMs, setGenerationStartedAtMs] = useState<number | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedOutput, setGeneratedOutput] = useState<GeneratedOutput | null>(null);
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const [savingAsset, setSavingAsset] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedVariantIndices, setSavedVariantIndices] = useState<Set<number>>(new Set());

  // ─── Option states (sub-hook) ───────────────────────────
  const {
    lineupFormation, setLineupFormation,
    lineupCloseupStyle, setLineupCloseupStyle,
    lineupAnimationStyle, setLineupAnimationStyle,
    lineupIntroStyle, setLineupIntroStyle,
    selectedBackgroundUrl, setSelectedBackgroundUrl,
    appBackgrounds,
    matchFlyerVariant, setMatchFlyerVariant,
    flyerMemberId, setFlyerMemberId,
    flyerActionStyle, setFlyerActionStyle,
    flyerPhotoLayout, setFlyerPhotoLayout,
    flyerPhotoSlots, setFlyerPhotoSlots,
    goalScoreHome, setGoalScoreHome,
    goalScoreAway, setGoalScoreAway,
    goalScorerId, setGoalScorerId,
    summaryScoreHome, setSummaryScoreHome,
    summaryScoreAway, setSummaryScoreAway,
    summaryGoalScorers, setSummaryGoalScorers,
  } = useContentOptions({ isOpen, matchData });

  // ─── Sub-hooks ──────────────────────────────────────────
  const squad = useSeasonSquadData({ isOpen, projectId, seasonId: season?.id, selectedTemplate });

  const videoPoll = useVideoJobPolling({ isOpen, step, onGenerated });

  // ─── Derived values ─────────────────────────────────────
  const isLineupFlow =
    selectedType?.subtype === 'lineup' ||
    selectedType?.subtype === 'lineup_flyer' ||
    selectedType?.subtype === 'poster' ||
    selectedTemplate?.template_subtype === 'lineup' ||
    selectedTemplate?.template_subtype === 'lineup_flyer' ||
    selectedTemplate?.template_subtype === 'poster' ||
    initialTemplate?.template_subtype === 'lineup' ||
    initialTemplate?.template_subtype === 'lineup_flyer' ||
    initialTemplate?.template_subtype === 'poster';

  // ─── Effects: reset on open/close ───────────────────────
  const hasInitializedRef = useRef(false);
  const lastOpenStateRef = useRef(false);

  useEffect(() => {
    const freshOpen = isOpen && !lastOpenStateRef.current;
    lastOpenStateRef.current = isOpen;

    if (isOpen) {
      // Always reset transient state
      setProgress(0);
      setGenerationStartedAtMs(null);
      setError(null);
      setGenerationError(null);
      setGeneratedOutput(null);
      setGeneratedVariants([]);
      setSelectedVariantIndex(0);
      setSavingAsset(false);
      setSaveSuccess(false);
      setSavedVariantIndices(new Set());
      videoPoll.resetVideo();

      if (freshOpen && !hasInitializedRef.current) {
        hasInitializedRef.current = true;

        // Pre-load saved lineup from match metadata
        const savedLineup = matchData?.metadata?.lineup;
        if (savedLineup && (savedLineup.goalkeeper?.length || savedLineup.player?.length)) {
          squad.setSelectedMembers({
            goalkeeper: savedLineup.goalkeeper || [],
            player: savedLineup.player || [],
            coach: [],
            assistant: [],
          });
          if (savedLineup.formation && savedLineup.formation !== lineupFormation) {
            setLineupFormation(savedLineup.formation);
          }
        } else {
          squad.setSelectedMembers({ goalkeeper: [], player: [], coach: [], assistant: [] });
        }
        setTemplates([]);

        if (initialTemplate) {
          setSelectedTemplate(initialTemplate);
          setSelectedType({
            type: initialTemplate.template_type,
            subtype: initialTemplate.template_subtype || '',
            label: contentTypeLabel || initialTemplate.name,
          });
          if (initialTemplate.template_subtype === 'goal' || initialTemplate.template_subtype === 'match_intro') {
            setStep('confirm');
          } else if (initialTemplate.template_subtype === 'poster') {
            setStep('members');
          } else {
            const needsMembers = initialTemplate.input_requirements?.members &&
              Object.entries(initialTemplate.input_requirements.members).some(([key, val]) =>
                key !== 'use_formation' && val && typeof val !== 'boolean' && val.count > 0,
              );
            setStep(needsMembers ? 'members' : 'confirm');
          }
        } else {
          setStep('type');
          setSelectedType(null);
          setSelectedTemplate(null);
        }
      }
    } else {
      hasInitializedRef.current = false;
    }
  }, [isOpen, initialTemplate, contentTypeLabel]);

  // ─── Fetch templates ────────────────────────────────────
  const doFetchTemplates = async (templateType: string, templateSubtype: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await fetchContentTemplates({ templateType, templateSubtype, organisationSport });
      setTemplates(results);
    } catch {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // ─── Generation dispatcher ──────────────────────────────
  const handleGenerateInternal = async () => {
    setStep('generating');
    setGenerationError(null);
    setGeneratedOutput(null);
    setGeneratedVariants([]);
    setSelectedVariantIndex(0);
    setSaveSuccess(false);
    setSavedVariantIndices(new Set());
    setGenerationStartedAtMs(Date.now());
    videoPoll.resetVideo();

    let p = 0;
    const progressInterval = setInterval(() => {
      p += Math.random() * 10;
      if (p > 85) p = 85;
      setProgress(Math.min(p, 85));
    }, 500);

    try {
      const subtype = selectedType?.subtype || selectedTemplate?.template_subtype || '';
      const seasonProjectId = season?.project_id;

      // ── Flyer-type generators (return GeneratedVariant[]) ──
      const flyerGenerators: Record<string, () => Promise<GeneratedVariant[]>> = {
        lineup_flyer: () => generateLineupFlyer({
          matchData, seasonProjectId, selectedMembers: squad.selectedMembers,
          lineupFormation, lineupCloseupStyle, selectedTemplateId: selectedTemplate?.id,
          selectedBackgroundUrl,
        }),
        poster: () => generateTeamPoster({
          matchData, seasonProjectId, selectedMembers: squad.selectedMembers,
          lineupFormation, selectedTemplateId: selectedTemplate?.id,
        }),
        flyer: () => generateMatchFlyer({
          matchData, seasonProjectId, matchFlyerVariant, flyerPhotoLayout,
          flyerPhotoSlots, flyerMemberId, flyerActionStyle, selectedBackgroundUrl,
        }),
        match_summary: () => generateMatchSummary({
          matchData, seasonProjectId, summaryScoreHome, summaryScoreAway,
          summaryGoalScorers, selectedBackgroundUrl,
        }),
      };

      if (flyerGenerators[subtype]) {
        clearInterval(progressInterval);
        setProgress(10);
        const variants = await flyerGenerators[subtype]();
        setGeneratedVariants(variants);
        setProgress(100);
        setTimeout(() => setStep('success'), 300);
        return;
      }

      // ── Video generators (return jobId) ──
      const videoGenerators: Record<string, () => Promise<string>> = {
        lineup: () => generateLineupVideo({
          matchData, seasonProjectId, selectedMembers: squad.selectedMembers,
          selectedType, selectedTemplate, lineupFormation, lineupCloseupStyle,
          lineupAnimationStyle, lineupIntroStyle, selectedBackgroundUrl,
          getMemberAssetUrl: squad.getMemberAssetUrl, getMemberNameById: squad.getMemberNameById,
        }),
        goal: () => generateGoalCelebration({
          matchData, seasonProjectId, goalScorerId, goalScoreHome, goalScoreAway,
          selectedBackgroundUrl,
        }),
        match_intro: () => generateMatchIntro({ matchData, seasonProjectId }),
      };

      if (videoGenerators[subtype]) {
        clearInterval(progressInterval);
        videoPoll.abortActiveVideoJobPoll();
        setProgress(10);
        const jobId = await videoGenerators[subtype]();
        videoPoll.setVideoJobId(jobId);
        setProgress(100);
        setStep('video_queued');
        const labels: Record<string, string> = {
          lineup: 'Lineup video staat in de wachtrij en wordt op de achtergrond verwerkt.',
          goal: 'Goal celebration staat in de wachtrij en wordt op de achtergrond verwerkt.',
          match_intro: 'Match intro staat in de wachtrij en wordt op de achtergrond verwerkt.',
        };
        onGenerated?.(labels[subtype]);
        return;
      }

      // ── Generic AI generation ──
      const result = await generateGenericAI({
        selectedType, selectedTemplate, matchData, organisationId, assetType,
      });

      clearInterval(progressInterval);
      setGeneratedVariants(result.variants);
      if (result.generatedOutput) setGeneratedOutput(result.generatedOutput);
      setProgress(100);
      setTimeout(() => setStep('success'), 300);
    } catch (err) {
      clearInterval(progressInterval);
      if ((err as any)?.name === 'AbortError') return;
      console.error('[!] Generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Generation failed');
      setStep('error');
    }
  };

  // ─── Save handlers ──────────────────────────────────────
  const handleSaveVariantByIndex = async (variantIdx: number, opts?: { skipAutoClose?: boolean }) => {
    const variant = generatedVariants[variantIdx];
    if (!variant) return;

    setSavingAsset(true);
    try {
      const result = await saveGeneratedVariant({
        variant, variantIdx, totalVariants: generatedVariants.length,
        selectedType, selectedTemplate, assetType, matchData, organisationId,
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
        if (result.media_item_id) (nextStorageInfo as Record<string, unknown>).media_item_id = result.media_item_id;

        const updatedVariants = [...generatedVariants];
        updatedVariants[variantIdx] = { ...variant, storage_info: nextStorageInfo };
        setGeneratedVariants(updatedVariants);
      }

      if (!opts?.skipAutoClose && generatedVariants.length <= 1) {
        setSaveSuccess(true);
        setTimeout(() => { onClose(); }, 1200);
      }
    } catch (err) {
      console.error(`[!] Failed to save variant ${variantIdx + 1}:`, err);
      setGenerationError(err instanceof Error ? err.message : 'Opslaan mislukt');
    } finally {
      setSavingAsset(false);
    }
  };

  const handleSaveAsAsset = async () => { await handleSaveVariantByIndex(selectedVariantIndex); };

  const handleSaveAllAsAssets = async () => {
    setSavingAsset(true);
    setSaveSuccess(false);
    for (let i = 0; i < generatedVariants.length; i++) {
      if (savedVariantIndices.has(i)) continue;
      await handleSaveVariantByIndex(i, { skipAutoClose: true });
    }
    setSaveSuccess(true);
    setSavingAsset(false);
    setTimeout(() => { onClose(); }, 1200);
  };

  // ─── Navigation handlers ────────────────────────────────
  const handleSelectType = (type: string, subtype: string, label: string) => {
    setSelectedType({ type, subtype, label });

    if (subtype === 'goal' || subtype === 'match_intro') { setStep('confirm'); return; }

    if (subtype === 'poster') {
      setSelectedTemplate({
        id: 0, name: 'Elftalfoto', description: '', style_variant: '',
        template_type: 'pre_match', template_subtype: 'poster', is_active: true,
        input_requirements: {
          members: {
            goalkeeper: { count: 1, asset_types: ['in_tenue'] },
            player: { count: 10, asset_types: ['in_tenue'] },
          },
        },
      } as ContentTemplate);
      setStep('members');
      return;
    }

    setStep('template');
    doFetchTemplates(type, subtype);
  };

  const handleSelectTemplate = (template: ContentTemplate) => {
    setSelectedTemplate(template);
    const needsMembers = template.input_requirements?.members &&
      Object.entries(template.input_requirements.members).some(([key, val]) =>
        key !== 'use_formation' && val && typeof val !== 'boolean' && val.count > 0,
      );
    setStep(needsMembers ? 'members' : 'confirm');
  };

  const handleGenerate = () => { if (selectedTemplate) handleGenerateInternal(); };

  const handleBack = () => {
    if (initialTemplate && step === 'members') { onClose(); return; }

    if (step === 'template') {
      setStep('type'); setSelectedType(null); setTemplates([]);
    } else if (step === 'members') {
      if (selectedType?.subtype === 'poster') {
        setStep('type'); setSelectedType(null); setSelectedTemplate(null);
      } else {
        setStep('template'); setSelectedTemplate(null);
      }
    } else if (step === 'lineup_squad') {
      setStep('members');
    } else if (step === 'confirm') {
      const needsMembers = selectedTemplate?.input_requirements?.members &&
        Object.entries(selectedTemplate.input_requirements.members).some(([key, val]) =>
          key !== 'use_formation' && val && typeof val !== 'boolean' && val.count > 0,
        );
      const isLineup = selectedType?.subtype === 'lineup' || selectedType?.subtype === 'lineup_flyer' || selectedType?.subtype === 'poster' || selectedTemplate?.template_subtype === 'lineup' || selectedTemplate?.template_subtype === 'lineup_flyer' || selectedTemplate?.template_subtype === 'poster';
      const isGoal = selectedType?.subtype === 'goal';
      if (isGoal) { setStep('type'); setSelectedType(null); }
      else if (isLineup && needsMembers) setStep('lineup_squad');
      else if (needsMembers) setStep('members');
      else { setStep('template'); setSelectedTemplate(null); }
    }
  };

  // ─── Return ─────────────────────────────────────────────
  return {
    // State
    step, setStep,
    selectedType,
    selectedTemplate,
    progress,
    generationError,
    generatedOutput,
    loading, error,
    templates,
    generatedVariants, selectedVariantIndex, setSelectedVariantIndex,
    savingAsset, saveSuccess, savedVariantIndices,
    seasonSquad: squad.seasonSquad,
    selectedMembers: squad.selectedMembers,
    setSelectedMembers: squad.setSelectedMembers,
    lineupFormation, setLineupFormation,
    lineupCloseupStyle, setLineupCloseupStyle,
    lineupAnimationStyle, setLineupAnimationStyle,
    lineupIntroStyle, setLineupIntroStyle,
    selectedBackgroundUrl, setSelectedBackgroundUrl,
    appBackgrounds,
    matchFlyerVariant, setMatchFlyerVariant,
    flyerMemberId, setFlyerMemberId,
    flyerActionStyle, setFlyerActionStyle,
    flyerPhotoLayout, setFlyerPhotoLayout,
    flyerPhotoSlots, setFlyerPhotoSlots,
    goalScoreHome, setGoalScoreHome,
    goalScoreAway, setGoalScoreAway,
    goalScorerId, setGoalScorerId,
    summaryScoreHome, setSummaryScoreHome,
    summaryScoreAway, setSummaryScoreAway,
    summaryGoalScorers, setSummaryGoalScorers,
    videoJobId: videoPoll.videoJobId,
    videoJobStatus: videoPoll.videoJobStatus,
    videoJobProgressRaw: videoPoll.videoJobProgressRaw,
    videoJobMeta: videoPoll.videoJobMeta,
    videoOutputUrl: videoPoll.videoOutputUrl,
    videoThumbnailUrl: videoPoll.videoThumbnailUrl,
    videoApprovalStatus: videoPoll.videoApprovalStatus,
    videoApprovalError: videoPoll.videoApprovalError,

    // Derived
    homeTeamName, awayTeamName,
    isLineupFlow,
    memberSelectionValid: squad.memberSelectionValid,

    // Handlers
    handleBack,
    handleSelectType,
    handleSelectTemplate,
    handleGenerate,
    handleGenerateInternal,
    handleVideoApproval: videoPoll.handleVideoApproval,
    handleSaveAsAsset,
    handleSaveAllAsAssets,
    handleSaveVariantByIndex,
    fetchTemplates: doFetchTemplates,
  };
}
