/**
 * matchWizardGeneration — Generation dispatch logic for MatchWizard.
 *
 * Extracted from useMatchWizardData so the hook stays slim.
 * Contains pre-flight validation, progress simulation, and dispatch to the
 * appropriate flyer / video / generic-AI generator.
 */
import { Clock } from 'lucide-react';
import { logger } from '@/utils/logger';
import type { ContentTemplate, GeneratedVariant, GeneratedOutput } from '../pages/identity/ContentGenerationModal/types';
import {
  generateLineupFlyer,
  generateTeamPoster,
  generateMatchFlyer,
  generateMatchSummary,
  generateGenericAI,
  type GenerateGenericAIParams,
} from '../pages/identity/ContentGenerationModal/contentGenerationApi';
import {
  generateLineupVideo,
  generateGoalCelebration,
  generateMatchIntro,
} from '../pages/identity/ContentGenerationModal/contentGenerationVideoApi';
import type { WizardStep } from './matchWizardTypes';

// ── Param / callback shapes ───────────────────────────────

export interface GenerationParams {
  subtype: string;
  pendingContent: { subtype: string; label: string; key: string; templateType: string } | null;
  lineupFormation: string;
  lineupSlots: { goalkeeper: string[]; player: string[] };
  projectId: string | undefined;
  matchDataForApi: any;
  seasonSquad: any;
  options: any;
  selectedTemplate: ContentTemplate | null;
  selectedType: { type: string; subtype: string; label: string } | null;
  organisationId: string | null | undefined;
}

export interface GenerationCallbacks {
  setCurrentStep: (step: WizardStep) => void;
  setProgress: (p: number) => void;
  setGenerationError: (e: string | null) => void;
  setGeneratedOutput: (o: GeneratedOutput | null) => void;
  setGeneratedVariants: (v: GeneratedVariant[]) => void;
  setVideoJobId: (id: string) => void;
  abortActiveVideoJobPoll: () => void;
  resetVideo: () => void;
  pushToast: (opts: any) => void;
  navigate: (path: string) => void;
}

// ── Main entry point ──────────────────────────────────────

export async function executeGeneration(
  params: GenerationParams,
  callbacks: GenerationCallbacks,
): Promise<void> {
  const {
    subtype, lineupFormation, lineupSlots, projectId,
    matchDataForApi, seasonSquad, options, selectedTemplate,
    selectedType, organisationId,
  } = params;

  // ── Pre-flight validation for lineup types ──
  if (subtype === 'lineup' || subtype === 'lineup_flyer') {
    const expectedFieldPlayers = lineupFormation
      .split('-')
      .reduce((sum, n) => sum + parseInt(n, 10), 0);
    const filledGk = lineupSlots.goalkeeper.filter(Boolean).filter(id => !id.startsWith('guest-')).length;
    const filledPlayers = lineupSlots.player.filter(Boolean).filter(id => !id.startsWith('guest-')).length;

    if (filledGk < 1 || filledPlayers < expectedFieldPlayers) {
      const missing: string[] = [];
      if (filledGk < 1) missing.push('keeper');
      if (filledPlayers < expectedFieldPlayers)
        missing.push(`${expectedFieldPlayers - filledPlayers} veldspeler(s)`);
      callbacks.setGenerationError(
        `Opstelling niet compleet voor formatie ${lineupFormation}: ${missing.join(' en ')} ontbre(e)k(en). ` +
        `Vul alle posities met echte spelers (geen gast-spelers) en probeer opnieuw.`,
      );
      callbacks.setCurrentStep('error');
      return;
    }
  }

  // ── Simulated progress bar ──
  let p = 0;
  const progressInterval = setInterval(() => {
    p += Math.random() * 10;
    if (p > 85) p = 85;
    callbacks.setProgress(Math.min(p, 85));
  }, 500);

  try {
    const seasonProjectId = projectId;
    const matchData = matchDataForApi;

    // ── Flyer-type generators (return GeneratedVariant[]) ──
    const flyerGenerators: Record<string, () => Promise<GeneratedVariant[]>> = {
      lineup_flyer: () =>
        generateLineupFlyer({
          matchData, seasonProjectId, selectedMembers: seasonSquad.selectedMembers,
          lineupFormation, lineupCloseupStyle: options.lineupCloseupStyle,
          selectedTemplateId: selectedTemplate?.id,
          selectedBackgroundUrl: options.selectedBackgroundUrl,
        }),
      poster: () =>
        generateTeamPoster({
          matchData, seasonProjectId, selectedMembers: seasonSquad.selectedMembers,
          lineupFormation, selectedTemplateId: selectedTemplate?.id,
        }),
      flyer: () =>
        generateMatchFlyer({
          matchData, seasonProjectId,
          matchFlyerVariant: options.matchFlyerVariant,
          flyerPhotoLayout: options.flyerPhotoLayout,
          flyerPhotoSlots: options.flyerPhotoSlots,
          flyerMemberId: options.flyerMemberId,
          flyerActionStyle: options.flyerActionStyle,
          selectedBackgroundUrl: options.selectedBackgroundUrl,
        }),
      match_summary: () =>
        generateMatchSummary({
          matchData, seasonProjectId,
          summaryScoreHome: options.summaryScoreHome,
          summaryScoreAway: options.summaryScoreAway,
          summaryGoalScorers: options.summaryGoalScorers,
          selectedBackgroundUrl: options.selectedBackgroundUrl,
        }),
    };

    if (flyerGenerators[subtype]) {
      clearInterval(progressInterval);
      callbacks.setProgress(10);
      const variants = await flyerGenerators[subtype]();
      callbacks.setGeneratedVariants(variants);
      callbacks.setProgress(100);
      setTimeout(() => callbacks.setCurrentStep('success'), 300);
      return;
    }

    // ── Video generators (return jobId) ──
    const videoGenerators: Record<string, () => Promise<string>> = {
      lineup: () =>
        generateLineupVideo({
          matchData, seasonProjectId, selectedMembers: seasonSquad.selectedMembers,
          selectedType, selectedTemplate, lineupFormation,
          lineupCloseupStyle: options.lineupCloseupStyle,
          lineupAnimationStyle: options.lineupAnimationStyle,
          lineupIntroStyle: options.lineupIntroStyle,
          selectedBackgroundUrl: options.selectedBackgroundUrl,
          getMemberAssetUrl: seasonSquad.getMemberAssetUrl,
          getMemberNameById: seasonSquad.getMemberNameById,
        }),
      goal: () =>
        generateGoalCelebration({
          matchData, seasonProjectId,
          goalScorerId: options.goalScorerId,
          goalScoreHome: options.goalScoreHome,
          goalScoreAway: options.goalScoreAway,
          selectedBackgroundUrl: options.selectedBackgroundUrl,
        }),
      match_intro: () =>
        generateMatchIntro({ matchData, seasonProjectId }),
    };

    if (videoGenerators[subtype]) {
      clearInterval(progressInterval);
      callbacks.abortActiveVideoJobPoll();
      callbacks.setProgress(10);
      const jobId = await videoGenerators[subtype]();
      callbacks.setVideoJobId(jobId);
      callbacks.setProgress(100);
      callbacks.setCurrentStep('video_queued');
      const labels: Record<string, string> = {
        lineup: 'Lineup video staat in de wachtrij en wordt op de achtergrond verwerkt.',
        goal: 'Goal celebration staat in de wachtrij en wordt op de achtergrond verwerkt.',
        match_intro: 'Match intro staat in de wachtrij en wordt op de achtergrond verwerkt.',
      };
      callbacks.pushToast({
        message: labels[subtype] || 'Video staat in de wachtrij.',
        type: 'info',
        icon: Clock,
        actions: [{ label: 'Naar queue', onClick: () => callbacks.navigate('/approvals') }],
      });
      window.dispatchEvent(new CustomEvent('teamreel:queue-update'));
      return;
    }

    // ── Generic AI generation (catch-all) ──
    const result = await generateGenericAI({
      selectedType, selectedTemplate,
      matchData: matchData as GenerateGenericAIParams['matchData'],
      organisationId, assetType: null,
    });
    clearInterval(progressInterval);
    callbacks.setGeneratedVariants(result.variants);
    if (result.generatedOutput) callbacks.setGeneratedOutput(result.generatedOutput);
    callbacks.setProgress(100);
    setTimeout(() => callbacks.setCurrentStep('success'), 300);
  } catch (err) {
    logger.error('[!] Generation failed', err);
    clearInterval(progressInterval);
    if (err instanceof Error && err.name === 'AbortError') return;
    callbacks.setGenerationError(err instanceof Error ? err.message : 'Generation failed');
    callbacks.setCurrentStep('error');
  }
}
