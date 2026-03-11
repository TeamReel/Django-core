/** ContentGenerationModal — Orchestrator hook composing sub-modules. */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  ContentTemplate,
  GeneratedVariant,
  GeneratedOutput,
  ContentGenerationModalProps,
  StepType,
} from './types';
import { useSeasonSquadData } from './useSeasonSquadData';
import { useVideoJobPolling } from './useVideoJobPolling';
import { fetchContentTemplates } from './contentGenerationApi';
import { useContentOptions } from './useContentOptions';
import { useGenerationDispatch } from './useGenerationDispatch';
import { useSaveHandlers } from './useSaveHandlers';
import { useToast } from '@/components/ui/Toast';

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

  // Toast + navigation for post-generate flow
  const { pushToast } = useToast();
  const navigate = useNavigate();
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
  // ─── Generation dispatch (extracted) ────────────────────
  const { handleGenerateInternal } = useGenerationDispatch({
    matchData, season, organisationId, assetType, onGenerated,
    selectedType, selectedTemplate,
    setStep, setProgress, setGenerationStartedAtMs, setGenerationError,
    setGeneratedOutput, setGeneratedVariants, setSelectedVariantIndex,
    setSaveSuccess, setSavedVariantIndices,
    lineupFormation, lineupCloseupStyle, lineupAnimationStyle, lineupIntroStyle,
    selectedBackgroundUrl, matchFlyerVariant, flyerPhotoLayout, flyerPhotoSlots,
    flyerMemberId, flyerActionStyle, goalScorerId, goalScoreHome, goalScoreAway,
    summaryScoreHome, summaryScoreAway, summaryGoalScorers,
    squad, videoPoll, pushToast, navigate,
  });
  // ─── Save handlers (extracted) ──────────────────────────
  const { handleSaveVariantByIndex, handleSaveAsAsset, handleSaveAllAsAssets } = useSaveHandlers({
    matchData, organisationId, assetType, onGenerated, onClose,
    selectedType, selectedTemplate,
    generatedVariants, generatedOutput, selectedVariantIndex, savedVariantIndices,
    setGeneratedVariants, setSavingAsset, setSaveSuccess, setSavedVariantIndices,
    setGenerationError, pushToast, navigate,
  });
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
  const autoGenerateRef = useRef(false);
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

          const hasLineupData = savedLineup && (savedLineup.goalkeeper?.length || savedLineup.player?.length);
          const subtype = initialTemplate.template_subtype || '';

          // Types with lineup options (background, closeup, animation) → show options step
          const HAS_LINEUP_OPTIONS = new Set(['lineup', 'lineup_flyer']);
          // Types with no config at all → auto-generate directly
          const AUTO_GENERATE = new Set(['walkon', 'match_intro']);

          if (AUTO_GENERATE.has(subtype)) {
            autoGenerateRef.current = true;
            setStep('generating');
          } else if (HAS_LINEUP_OPTIONS.has(subtype) && hasLineupData) {
            // Show options step (background, popout/badge, animation)
            setStep('members');
          } else if (subtype === 'goal') {
            setStep('confirm');
          } else if (subtype === 'poster') {
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
      autoGenerateRef.current = false;
    }
  }, [isOpen, initialTemplate, contentTypeLabel]);
  // Auto-generate: when opening from MatchWizard with all data ready,
  // skip confirm and start generation immediately.
  useEffect(() => {
    if (autoGenerateRef.current && step === 'generating' && selectedTemplate) {
      autoGenerateRef.current = false;
      handleGenerateInternal();
    }
  }, [step]);
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
  // ─── Navigation handlers ────────────────────────────────
  const handleSelectType = (type: string, subtype: string, label: string) => {
    setSelectedType({ type, subtype, label });
    if (subtype === 'goal' || subtype === 'match_intro') { setStep('confirm'); return; }
    if (subtype === 'poster') {
      setSelectedTemplate({ id: 0, name: 'Elftalfoto', description: '', style_variant: '', template_type: 'pre_match', template_subtype: 'poster', is_active: true, input_requirements: { members: { goalkeeper: { count: 1, asset_types: ['in_tenue'] }, player: { count: 10, asset_types: ['in_tenue'] } } } } as ContentTemplate);
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
    // When opened from MatchWizard (initialTemplate set), back always
    // closes this modal and returns to the MatchWizard review step.
    // The modal's internal type/template steps are not part of the flow.
    if (initialTemplate) { onClose(); return; }

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

  return {
    step, setStep, selectedType, selectedTemplate, progress, generationError,
    generatedOutput, loading, error, templates,
    generatedVariants, selectedVariantIndex, setSelectedVariantIndex,
    savingAsset, saveSuccess, savedVariantIndices,
    seasonSquad: squad.seasonSquad, selectedMembers: squad.selectedMembers,
    setSelectedMembers: squad.setSelectedMembers,
    lineupFormation, setLineupFormation, lineupCloseupStyle, setLineupCloseupStyle,
    lineupAnimationStyle, setLineupAnimationStyle, lineupIntroStyle, setLineupIntroStyle,
    selectedBackgroundUrl, setSelectedBackgroundUrl, appBackgrounds,
    matchFlyerVariant, setMatchFlyerVariant, flyerMemberId, setFlyerMemberId,
    flyerActionStyle, setFlyerActionStyle, flyerPhotoLayout, setFlyerPhotoLayout,
    flyerPhotoSlots, setFlyerPhotoSlots,
    goalScoreHome, setGoalScoreHome, goalScoreAway, setGoalScoreAway,
    goalScorerId, setGoalScorerId,
    summaryScoreHome, setSummaryScoreHome, summaryScoreAway, setSummaryScoreAway,
    summaryGoalScorers, setSummaryGoalScorers,
    videoJobId: videoPoll.videoJobId, videoJobStatus: videoPoll.videoJobStatus,
    videoJobProgressRaw: videoPoll.videoJobProgressRaw, videoJobMeta: videoPoll.videoJobMeta,
    videoOutputUrl: videoPoll.videoOutputUrl, videoThumbnailUrl: videoPoll.videoThumbnailUrl,
    videoApprovalStatus: videoPoll.videoApprovalStatus, videoApprovalError: videoPoll.videoApprovalError,
    homeTeamName, awayTeamName, isLineupFlow,
    memberSelectionValid: squad.memberSelectionValid,
    handleBack, handleSelectType, handleSelectTemplate, handleGenerate,
    handleGenerateInternal, handleVideoApproval: videoPoll.handleVideoApproval,
    handleSaveAsAsset, handleSaveAllAsAssets, handleSaveVariantByIndex,
    fetchTemplates: doFetchTemplates,
  };
}
