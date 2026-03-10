/**
 * contentDispatchers — Pure generation dispatch logic
 *
 * Contains the flyer / video / generic AI dispatch maps,
 * plus lineup validation. No React hooks — just async functions.
 */
import type { ContentTemplate, GeneratedVariant, GeneratedOutput } from '@/pages/identity/ContentGenerationModal/types';
import {
  generateLineupFlyer,
  generateTeamPoster,
  generateMatchFlyer,
  generateMatchSummary,
  generateGenericAI,
} from '@/pages/identity/ContentGenerationModal/contentGenerationApi';
import {
  generateLineupVideo,
  generateGoalCelebration,
  generateMatchIntro,
} from '@/pages/identity/ContentGenerationModal/contentGenerationVideoApi';

// ─── Types ────────────────────────────────────────────────

export type DispatchOutcome =
  | { type: 'success'; variants: GeneratedVariant[]; generatedOutput?: GeneratedOutput | null }
  | { type: 'video_queued'; jobId: string; subtype: string }
  | { type: 'error'; message: string }
  | { type: 'abort' };

/** Match data shape compatible with all generation API functions */
export interface DispatchMatchData {
  id: string;
  title?: string;
  project: { id: string; name: string; slug?: string; organisation_id?: string };
  opponent_project?: { id: string; name: string; slug?: string };
  participations?: unknown[];
  start_time?: string;
  location?: string;
  metadata?: Record<string, unknown>;
}

export interface DispatchOptions {
  lineupCloseupStyle: 'popout' | 'badge';
  lineupAnimationStyle: 'slide_up' | 'appear' | 'slide_in' | 'zoom' | 'fade';
  lineupIntroStyle: 'per_line' | 'per_player';
  selectedBackgroundUrl: string | null;
  matchFlyerVariant: 'modern' | 'action' | 'stadium';
  flyerPhotoLayout: 'single' | 'triple' | 'hero_duo';
  flyerPhotoSlots: Array<{ member_id: string | null; style_variant: string }>;
  flyerMemberId: string | null;
  flyerActionStyle: string;
  summaryScoreHome: number;
  summaryScoreAway: number;
  summaryGoalScorers: string;
  goalScorerId: string | null;
  goalScoreHome: number;
  goalScoreAway: number;
}

export interface DispatchParams {
  subtype: string;
  matchData: DispatchMatchData | null;
  seasonProjectId?: string | number;
  organisationId?: string | null;
  selectedType?: { type: string; subtype: string; label: string } | null;
  selectedTemplate?: ContentTemplate | null;
  lineupFormation: string;
  selectedMembers: Record<string, string[]>;
  options: DispatchOptions;
  getMemberAssetUrl: (id: string, assetType: string, role?: string) => string | null;
  getMemberNameById: (id: string) => string;
}

// ─── Validation ───────────────────────────────────────────

export function validateLineup(
  lineupFormation: string,
  lineupSlots: { goalkeeper: string[]; player: string[] },
  subtype: string,
): string | null {
  if (subtype !== 'lineup' && subtype !== 'lineup_flyer') return null;

  const expectedFieldPlayers = lineupFormation.split('-').reduce((s, n) => s + parseInt(n, 10), 0);
  const filledGk = lineupSlots.goalkeeper.filter(Boolean).filter(id => !id.startsWith('guest-')).length;
  const filledPlayers = lineupSlots.player.filter(Boolean).filter(id => !id.startsWith('guest-')).length;

  if (filledGk >= 1 && filledPlayers >= expectedFieldPlayers) return null;

  const missing: string[] = [];
  if (filledGk < 1) missing.push('keeper');
  if (filledPlayers < expectedFieldPlayers) missing.push(`${expectedFieldPlayers - filledPlayers} veldspeler(s)`);

  return (
    `Opstelling niet compleet voor formatie ${lineupFormation}: ${missing.join(' en ')} ontbre(e)k(en). ` +
    `Vul alle posities met echte spelers (geen gast-spelers) en probeer opnieuw.`
  );
}

// ─── Dispatch ─────────────────────────────────────────────

export async function dispatchContentGeneration(p: DispatchParams): Promise<DispatchOutcome> {
  const { subtype, matchData, seasonProjectId, options: o } = p;

  // ── Flyer generators (return GeneratedVariant[]) ──
  const flyerGenerators: Record<string, () => Promise<GeneratedVariant[]>> = {
    lineup_flyer: () => generateLineupFlyer({
      matchData, seasonProjectId, selectedMembers: p.selectedMembers,
      lineupFormation: p.lineupFormation,
      lineupCloseupStyle: o.lineupCloseupStyle,
      selectedTemplateId: p.selectedTemplate?.id,
      selectedBackgroundUrl: o.selectedBackgroundUrl,
    }),
    poster: () => generateTeamPoster({
      matchData, seasonProjectId, selectedMembers: p.selectedMembers,
      lineupFormation: p.lineupFormation,
      selectedTemplateId: p.selectedTemplate?.id,
    }),
    flyer: () => generateMatchFlyer({
      matchData, seasonProjectId,
      matchFlyerVariant: o.matchFlyerVariant,
      flyerPhotoLayout: o.flyerPhotoLayout,
      flyerPhotoSlots: o.flyerPhotoSlots,
      flyerMemberId: o.flyerMemberId,
      flyerActionStyle: o.flyerActionStyle,
      selectedBackgroundUrl: o.selectedBackgroundUrl,
    }),
    match_summary: () => generateMatchSummary({
      matchData, seasonProjectId,
      summaryScoreHome: o.summaryScoreHome,
      summaryScoreAway: o.summaryScoreAway,
      summaryGoalScorers: o.summaryGoalScorers,
      selectedBackgroundUrl: o.selectedBackgroundUrl,
    }),
  };

  if (flyerGenerators[subtype]) {
    const variants = await flyerGenerators[subtype]();
    return { type: 'success', variants };
  }

  // ── Video generators (return jobId) ──
  const videoGenerators: Record<string, () => Promise<string>> = {
    lineup: () => generateLineupVideo({
      matchData, seasonProjectId, selectedMembers: p.selectedMembers,
      selectedType: p.selectedType, selectedTemplate: p.selectedTemplate,
      lineupFormation: p.lineupFormation,
      lineupCloseupStyle: o.lineupCloseupStyle,
      lineupAnimationStyle: o.lineupAnimationStyle,
      lineupIntroStyle: o.lineupIntroStyle,
      selectedBackgroundUrl: o.selectedBackgroundUrl,
      getMemberAssetUrl: p.getMemberAssetUrl,
      getMemberNameById: p.getMemberNameById,
    }),
    goal: () => generateGoalCelebration({
      matchData, seasonProjectId,
      goalScorerId: o.goalScorerId,
      goalScoreHome: o.goalScoreHome,
      goalScoreAway: o.goalScoreAway,
      selectedBackgroundUrl: o.selectedBackgroundUrl,
    }),
    match_intro: () => generateMatchIntro({ matchData, seasonProjectId }),
  };

  if (videoGenerators[subtype]) {
    const jobId = await videoGenerators[subtype]();
    return { type: 'video_queued', jobId, subtype };
  }

  // ── Generic AI (catch-all) ──
  const result = await generateGenericAI({
    selectedType: p.selectedType, selectedTemplate: p.selectedTemplate,
    matchData, organisationId: p.organisationId, assetType: null,
  });
  return {
    type: 'success',
    variants: result.variants,
    generatedOutput: result.generatedOutput,
  };
}
