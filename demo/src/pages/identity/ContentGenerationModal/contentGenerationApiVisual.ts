/**
 * Visual content generators — lineup flyer, team poster, match flyer, match summary.
 */
import type { GeneratedVariant } from './types';
import { resolveProjectId, postJson } from './contentGenerationApi';
import type {
  GenerateLineupFlyerParams,
  GenerateTeamPosterParams,
  GenerateMatchFlyerParams,
  GenerateMatchSummaryParams,
} from './contentGenerationApiTypes';

/** Filter out frontend-only guest IDs (guest-*) — backend expects UUIDs */
const stripGuestIds = (ids: string[]): string[] =>
  ids.filter((id) => !id.startsWith('guest-'));

/* ================================================================== */
/*  Lineup Flyer                                                       */
/* ================================================================== */

export const generateLineupFlyer = async (p: GenerateLineupFlyerParams): Promise<GeneratedVariant[]> => {
  const projectId = resolveProjectId(p.matchData, p.seasonProjectId);
  if (!p.matchData?.id) throw new Error('No match/activity data available for flyer generation');

  const formation = p.lineupFormation || p.matchData?.metadata?.formation || '4-3-3';
  const data = await postJson(
    '/video/jobs/lineup-flyer/',
    {
      activity_id: p.matchData.id,
      template_id: p.selectedTemplateId || null,
      formation,
      closeup_style: p.lineupCloseupStyle,
      selected_member_ids: {
        goalkeeper: stripGuestIds(p.selectedMembers.goalkeeper || []).slice(0, 1),
        player: stripGuestIds(p.selectedMembers.player || []).slice(0, 10),
      },
      ...(p.selectedBackgroundUrl ? { background_url: p.selectedBackgroundUrl } : {}),
    },
    { 'X-Project-ID': projectId },
  );

  const flyerUrl = (data.data?.flyer_url || data.flyer_url) as string | null;
  if (!flyerUrl) throw new Error('Flyer generated but no URL returned');

  return [{
    variant_index: 0,
    image_base64: null,
    presigned_url: flyerUrl,
    mime_type: 'image/png',
    filename: `lineup_flyer_${p.matchData.id}.png`,
    error: null,
    storage_info: null,
    metadata: { type: 'lineup_flyer', formation, activity_id: p.matchData.id },
  }];
};

/* ================================================================== */
/*  Team Poster                                                        */
/* ================================================================== */

export const generateTeamPoster = async (p: GenerateTeamPosterParams): Promise<GeneratedVariant[]> => {
  const projectId = resolveProjectId(p.matchData, p.seasonProjectId);
  if (!p.matchData?.id) throw new Error('No match/activity data available for poster generation');

  const formation = p.lineupFormation || p.matchData?.metadata?.formation || '4-3-3';
  const data = await postJson(
    '/video/jobs/team-poster/',
    {
      activity_id: p.matchData.id,
      template_id: p.selectedTemplateId || null,
      formation,
      selected_member_ids: {
        goalkeeper: stripGuestIds(p.selectedMembers.goalkeeper || []).slice(0, 1),
        player: stripGuestIds(p.selectedMembers.player || []).slice(0, 10),
      },
    },
    { 'X-Project-ID': projectId },
  );

  const posterUrl = (data.poster_url || data.data?.poster_url) as string | null;
  if (!posterUrl) throw new Error('Poster generated but no URL returned');

  return [{
    variant_index: 0,
    image_base64: null,
    presigned_url: posterUrl,
    mime_type: 'image/png',
    filename: `team_poster_${p.matchData.id}.png`,
    error: null,
    storage_info: null,
    metadata: { type: 'poster', formation, activity_id: p.matchData.id },
  }];
};

/* ================================================================== */
/*  Match Flyer                                                        */
/* ================================================================== */

export const generateMatchFlyer = async (p: GenerateMatchFlyerParams): Promise<GeneratedVariant[]> => {
  const projectId = resolveProjectId(p.matchData, p.seasonProjectId);
  if (!p.matchData?.id) throw new Error('No match/activity data available for flyer generation');

  const data = await postJson(
    '/video/jobs/match-flyer/',
    {
      activity_id: p.matchData.id,
      variant: p.matchFlyerVariant,
      ...(p.matchFlyerVariant === 'action' && p.flyerPhotoLayout !== 'single' ? {
        photo_slots: p.flyerPhotoSlots.filter(s => s.member_id).length > 0
          ? p.flyerPhotoSlots.map(s => ({ member_id: s.member_id, style_variant: s.style_variant }))
          : undefined,
      } : {}),
      ...(p.matchFlyerVariant === 'action' && p.flyerPhotoLayout === 'single' && p.flyerMemberId ? {
        member_id: p.flyerMemberId,
        style_variant: p.flyerActionStyle,
      } : {}),
      ...(p.matchFlyerVariant === 'action' && p.selectedBackgroundUrl ? {
        background_url: p.selectedBackgroundUrl,
      } : {}),
      ...(p.matchFlyerVariant === 'action' ? { photo_layout: p.flyerPhotoLayout } : {}),
    },
    { 'X-Project-ID': projectId },
  );

  const flyerUrl = (data.data?.flyer_url || data.flyer_url) as string | null;
  if (!flyerUrl) throw new Error('Flyer generated but no URL returned');

  return [{
    variant_index: 0,
    image_base64: null,
    presigned_url: flyerUrl,
    mime_type: 'image/png',
    filename: `match_flyer_${p.matchFlyerVariant}_${p.matchData.id}.png`,
    error: null,
    storage_info: null,
    metadata: { type: 'match_flyer', variant: p.matchFlyerVariant, activity_id: p.matchData.id },
  }];
};

/* ================================================================== */
/*  Match Summary                                                      */
/* ================================================================== */

export const generateMatchSummary = async (p: GenerateMatchSummaryParams): Promise<GeneratedVariant[]> => {
  if (!p.matchData?.id) throw new Error('No match data available');
  const projectId = resolveProjectId(p.matchData, p.seasonProjectId);

  const scorers = p.summaryGoalScorers
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const data = await postJson(
    '/video/jobs/match-flyer/',
    {
      activity_id: p.matchData.id,
      variant: 'summary',
      score_home: p.summaryScoreHome,
      score_away: p.summaryScoreAway,
      goal_scorers: scorers.length > 0 ? scorers : undefined,
      ...(p.selectedBackgroundUrl ? { background_url: p.selectedBackgroundUrl } : {}),
    },
    { 'X-Project-ID': projectId },
  );

  const flyerUrl = (data.data?.flyer_url || data.flyer_url) as string | null;
  if (!flyerUrl) throw new Error('Summary generated but no URL returned');

  return [{
    variant_index: 0,
    image_base64: null,
    presigned_url: flyerUrl,
    mime_type: 'image/png',
    filename: `match_summary_${p.matchData.id}.png`,
    error: null,
    storage_info: null,
    metadata: { type: 'match_summary', activity_id: p.matchData.id },
  }];
};
