/**
 * Generation Dispatch — routes generation requests to the correct API
 * based on content subtype (flyer, video, generic AI).
 *
 * Extracted from useContentGeneration to keep modules focused.
 */
import type {
  ContentTemplate,
  GeneratedVariant,
  GeneratedOutput,
  StepType,
  ContentGenerationModalProps,
} from './types';
import {
  generateLineupFlyer,
  generateTeamPoster,
  generateMatchFlyer,
  generateMatchSummary,
  generateGenericAI,
} from './contentGenerationApi';
import {
  generateLineupVideo,
  generateGoalCelebration,
  generateMatchIntro,
} from './contentGenerationVideoApi';
import type { ToastItem } from '@/components/ui/Toast';
import { Clock } from 'lucide-react';

/* ================================================================== */
/*  Deps interface                                                     */
/* ================================================================== */

export interface GenerationDispatchDeps {
  // Modal props
  matchData: ContentGenerationModalProps['matchData'];
  season: ContentGenerationModalProps['season'];
  organisationId?: string | null;
  assetType?: string | null;
  onGenerated?: (message?: string) => void;

  // Generation state
  selectedType: { type: string; subtype: string; label: string } | null;
  selectedTemplate: ContentTemplate | null;

  // State setters
  setStep: (step: StepType) => void;
  setProgress: React.Dispatch<React.SetStateAction<number>>;
  setGenerationStartedAtMs: (ms: number | null) => void;
  setGenerationError: (e: string | null) => void;
  setGeneratedOutput: (o: GeneratedOutput | null) => void;
  setGeneratedVariants: React.Dispatch<React.SetStateAction<GeneratedVariant[]>>;
  setSelectedVariantIndex: (i: number) => void;
  setSaveSuccess: (s: boolean) => void;
  setSavedVariantIndices: (s: Set<number>) => void;

  // Content options
  lineupFormation: string;
  lineupCloseupStyle: string;
  lineupAnimationStyle: string;
  lineupIntroStyle: string;
  selectedBackgroundUrl: string | null;
  matchFlyerVariant: string;
  flyerPhotoLayout: string;
  flyerPhotoSlots: Array<{ member_id: string | null; style_variant: string }>;
  flyerMemberId: string | null;
  flyerActionStyle: string;
  goalScorerId: string | null;
  goalScoreHome: number;
  goalScoreAway: number;
  summaryScoreHome: number;
  summaryScoreAway: number;
  summaryGoalScorers: string;

  // Sub-hooks (sliced)
  squad: {
    selectedMembers: Record<string, string[]>;
    getMemberAssetUrl: (memberId: string, assetType: string, memberRole?: string) => string | null;
    getMemberNameById: (memberId: string) => string;
  };
  videoPoll: {
    resetVideo: () => void;
    abortActiveVideoJobPoll: () => void;
    setVideoJobId: React.Dispatch<React.SetStateAction<string | null>>;
  };

  // Navigation helpers (provided by orchestrator)
  pushToast: (t: Omit<ToastItem, 'id'>) => void;
  navigate: (path: string) => void;
}

/* ================================================================== */
/*  Hook                                                               */
/* ================================================================== */

export function useGenerationDispatch(deps: GenerationDispatchDeps) {
  const {
    matchData, season, organisationId, assetType, onGenerated,
    selectedType, selectedTemplate,
    setStep, setProgress, setGenerationStartedAtMs, setGenerationError,
    setGeneratedOutput, setGeneratedVariants, setSelectedVariantIndex,
    setSaveSuccess, setSavedVariantIndices,
    lineupFormation, lineupCloseupStyle, lineupAnimationStyle, lineupIntroStyle,
    selectedBackgroundUrl, matchFlyerVariant, flyerPhotoLayout, flyerPhotoSlots,
    flyerMemberId, flyerActionStyle, goalScorerId, goalScoreHome, goalScoreAway,
    summaryScoreHome, summaryScoreAway, summaryGoalScorers,
    squad, videoPoll,
    pushToast, navigate,
  } = deps;

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
        pushToast({
          message: labels[subtype],
          type: 'info',
          icon: Clock,
          actions: [{ label: 'Naar queue', onClick: () => navigate('/approvals') }],
        });
        window.dispatchEvent(new CustomEvent('teamreel:queue-update'));
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
      console.error(err);
      clearInterval(progressInterval);
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('[!] Generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Generation failed');
      setStep('error');
    }
  };

  return { handleGenerateInternal };
}
