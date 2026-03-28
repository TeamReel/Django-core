/**
 * ContentGenerationModal — Video generation API helpers
 *
 * Lineup video, goal celebration, and match intro generation.
 * Returns video job IDs for polling.
 */
import type { ContentTemplate } from './types';
import { resolveProjectId, postJson } from './contentGenerationApi';

/* ================================================================== */
/*  Lineup Video                                                       */
/* ================================================================== */

export interface GenerateLineupVideoParams {
  matchData: { id: string; project?: { id: string } } | null;
  seasonProjectId?: string | number;
  selectedMembers: Record<string, string[]>;
  selectedType?: { type: string; subtype: string } | null;
  selectedTemplate?: ContentTemplate | null;
  lineupFormation: string;
  lineupCloseupStyle: string;
  lineupAnimationStyle: string;
  lineupIntroStyle: string;
  selectedBackgroundUrl?: string | null;
  getMemberAssetUrl: (id: string, assetType: string, role?: string) => string | null;
  getMemberNameById: (id: string) => string;
}

/** Filter out frontend-only guest IDs (guest-*) — backend expects UUIDs */
const stripGuestIds = (ids: string[]): string[] =>
  ids.filter((id) => !id.startsWith('guest-'));

export const generateLineupVideo = async (p: GenerateLineupVideoParams): Promise<string> => {
  const projectId = resolveProjectId(p.matchData, p.seasonProjectId);

  let targetGKs = stripGuestIds(p.selectedMembers.goalkeeper);
  let targetPlayers = stripGuestIds(p.selectedMembers.player);
  let targetCoach = stripGuestIds(p.selectedMembers.coach);
  let targetAssistant = stripGuestIds(p.selectedMembers.assistant);

  let gkAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];
  let playerAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];
  let coachAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];
  let assistantAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];

  if (p.selectedTemplate?.input_requirements?.members) {
    const reqs = p.selectedTemplate.input_requirements.members;
    if (reqs.goalkeeper?.asset_types?.length) gkAssets = reqs.goalkeeper.asset_types;
    if (reqs.player?.asset_types?.length) playerAssets = reqs.player.asset_types;
    if (reqs.coach?.asset_types?.length) coachAssets = reqs.coach.asset_types;
    if (reqs.assistant?.asset_types?.length) assistantAssets = reqs.assistant.asset_types;

    if (p.selectedType?.subtype === 'lineup' || p.selectedType?.subtype === 'lineup_flyer') {
      gkAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];
      playerAssets = ['in_tenue', 'short_intro', 'in_tenue', 'close_up'];
      targetGKs = targetGKs.slice(0, 1);
      targetPlayers = targetPlayers.slice(0, 10);
      targetCoach = [];
      targetAssistant = [];
    }
  }

  // Build segments from member assets
  const segments: Array<{ type: string; url: string; duration?: number; label?: string; scale?: number }> = [];

  const addMemberSegments = (members: string[], assets: string[], role?: string) => {
    for (const memberId of members) {
      const memberName = p.getMemberNameById(memberId);
      for (const at of assets) {
        const url = p.getMemberAssetUrl(memberId, at, role);
        if (!url) {
          if (at === 'close_up') {
            const altUrl = p.getMemberAssetUrl(memberId, 'profile_photo', role);
            if (altUrl) {
              segments.push({ type: 'image', url: altUrl, duration: 2.0, label: memberName, scale: 0.6 });
            }
          }
          continue;
        }

        let isImage = ['profile_photo', 'in_tenue', 'legacy_photo', 'legacy', 'full_body'].includes(at);
        if (!isImage) {
          const lowerUrl = url.toLowerCase();
          if (lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.webp')) {
            isImage = true;
          }
        }

        const isCloseup = at === 'close_up';
        segments.push({
          type: isImage ? 'image' : 'video',
          url,
          duration: isImage ? (isCloseup ? 2.0 : 3.0) : undefined,
          label: memberName,
          ...(isCloseup ? { scale: 0.6 } : {}),
        });
      }
    }
  };

  let jobId: string;

  if (p.matchData?.id) {
    const data = await postJson(
      '/video/jobs/lineup-from-template/',
      {
        activity_id: p.matchData.id,
        template_id: p.selectedTemplate?.id || null,
        output_resolution: 'vertical_1080p',
        formation: p.lineupFormation || '4-3-3',
        closeup_style: p.lineupCloseupStyle || 'popout',
        animation_style: p.lineupAnimationStyle || 'slide_up',
        intro_style: p.lineupIntroStyle || 'per_line',
        selected_member_ids: {
          goalkeeper: targetGKs,
          player: targetPlayers,
          coach: targetCoach,
          assistant: targetAssistant,
        },
        ...(p.selectedBackgroundUrl ? { background_url: p.selectedBackgroundUrl } : {}),
      },
      { 'X-Project-ID': projectId },
    );
    jobId = (data.data?.id || data.id) as string;
  } else {
    addMemberSegments(targetGKs, gkAssets, 'goalkeeper');
    addMemberSegments(targetPlayers, playerAssets, 'player');
    addMemberSegments(targetCoach, coachAssets, 'coach');
    addMemberSegments(targetAssistant, assistantAssets, 'assistant');

    if (segments.length === 0) {
      throw new Error('No valid segments found. Make sure selected members have the required assets.');
    }

    const data = await postJson(
      '/video/jobs/',
      {
        job_type: 'lineup',
        config: {
          segments,
          output_resolution: 'auto',
          output_fps: 30,
          fade_duration: 0.5,
          match_id: null,
          activity_id: null,
        },
      },
      { 'X-Project-ID': projectId },
    );
    jobId = (data.data?.id || data.id) as string;
  }

  return jobId;
};

/* ================================================================== */
/*  Goal Celebration                                                   */
/* ================================================================== */

export interface GenerateGoalCelebrationParams {
  matchData: { id: string; project?: { id: string } } | null;
  seasonProjectId?: string | number;
  goalScorerId: string | null;
  goalScoreHome: number;
  goalScoreAway: number;
  selectedBackgroundUrl?: string | null;
}

export const generateGoalCelebration = async (p: GenerateGoalCelebrationParams): Promise<string> => {
  const projectId = resolveProjectId(p.matchData, p.seasonProjectId);
  if (!p.matchData?.id) throw new Error('No match/activity data available for goal celebration');
  if (!p.goalScorerId) throw new Error('No goal scorer selected');

  const data = await postJson(
    '/video/jobs/goal-celebration-from-template/',
    {
      activity_id: p.matchData.id,
      scorer_member_id: p.goalScorerId,
      score_home: p.goalScoreHome,
      score_away: p.goalScoreAway,
      output_resolution: 'vertical_1080p',
      ...(p.selectedBackgroundUrl ? { background_url: p.selectedBackgroundUrl } : {}),
    },
    { 'X-Project-ID': projectId },
  );

  return (data.data?.id || data.id) as string;
};

/* ================================================================== */
/*  Match Intro                                                        */
/* ================================================================== */

export interface GenerateMatchIntroParams {
  matchData: { id: string; project?: { id: string } } | null;
  seasonProjectId?: string | number;
}

export const generateMatchIntro = async (p: GenerateMatchIntroParams): Promise<string> => {
  const projectId = resolveProjectId(p.matchData, p.seasonProjectId);
  if (!p.matchData?.id) throw new Error('No match/activity data available for match intro');

  const data = await postJson(
    '/video/jobs/match-intro-from-template/',
    {
      activity_id: p.matchData.id,
      output_resolution: 'vertical_1080p',
    },
    { 'X-Project-ID': projectId },
  );

  return (data.data?.id || data.id) as string;
};
