import { useMemo, useCallback } from 'react';
import {
  getUserId,
  normalizeAccessRole,
  getFunctionalRolesFromMembership,
  getMatchParticipantsCount,
} from './seasonDetailUtils';
import type { Period, SeasonProject, SeasonOrganisation } from '../../types/season';

// ─── Local structural types ──────────────────────────────────────────────────

/** Membership / roster entry in season context. */
interface SeasonMember {
  id?: string | number;
  user?: { id?: string | number; first_name?: string; last_name?: string; email?: string; name?: string };
  user_id?: string | number;
  role?: string;
  period_id?: string;
  period?: string | { id?: string } | null;
  functional_roles?: string[];
  functionalRoles?: string[];
  shirt_number?: string | number;
  position?: string;
  /** Deeply nested dynamic metadata — `any` kept for TeamReel asset traversal. */
  metadata?: Record<string, any>;
}

/** Match activity in season context. */
interface SeasonMatch {
  id?: string | number;
  title?: string;
  name?: string;
  period_id?: string;
  period?: string | { id?: string } | null;
  opponent_project?: { name?: string } | null;
  /** Dynamic metadata — `any` kept for deeply nested access. */
  metadata?: Record<string, any>;
}

/** Competition / period reference used in count helpers. */
interface CompetitionRef {
  id?: string | number;
  matches_count?: number;
  children_matches_count?: number;
  participants_count?: number;
  participations_count?: number;
  participantsCount?: number;
  participationsCount?: number;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseSeasonDerivedParams {
  org: SeasonOrganisation | null;
  project: SeasonProject | null;
  club: SeasonProject | null;
  season: Period | null;
  isPlayer: boolean;
  members: SeasonMember[];
  matches: SeasonMatch[];
  teamRoster: SeasonMember[];
  opponentClubNames: Record<string, string>;
  currentUserId: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSeasonDerived(params: UseSeasonDerivedParams) {
  const {
    org, project, club, season, isPlayer,
    members, matches, teamRoster, opponentClubNames, currentUserId,
  } = params;

  // ── Create-modal option lists ──

  const createModalOrganisations = useMemo(() => {
    if (!org) return [];
    return [{ id: String(org.id), name: String(org.name || ''), slug: org.slug }];
  }, [org]);

  const createModalClubs = useMemo(() => {
    const baseOrgId = String(org?.id || '').trim();
    const c = club || null;
    if (c) {
      return [{ id: String(c.id), name: String(c.name || ''), slug: c.slug, organisation: baseOrgId || undefined }];
    }
    return [];
  }, [club, org]);

  const createModalTeams = useMemo(() => {
    const team = project || null;
    if (!team) return [];
    const clubIdValue = String(club?.id || '').trim();
    return [{ id: String(team.id), name: String(team.name || ''), slug: team.slug, parent_id: clubIdValue || undefined }];
  }, [project, club]);

  // ── Membership helpers ──

  const mySeasonMembershipId = useMemo(() => {
    if (!currentUserId) return '';
    const mine = (members || []).find((m: SeasonMember) => {
      const u = m?.user || m;
      const id = u?.id ?? m?.user_id;
      return String(id || '').trim() === currentUserId;
    });
    return String(mine?.id || '').trim();
  }, [currentUserId, members]);

  // ── Match / competition count helpers ──

  const getMatchCountForCompetition = useCallback((competition: CompetitionRef): number => {
    const annotated = Number(
      competition?.matches_count ?? competition?.children_matches_count
    );
    if (!matches.length && Number.isFinite(annotated) && annotated >= 0) return annotated;

    const competitionId = String(competition?.id || '').trim();
    if (!competitionId) return 0;
    return matches.filter((m: SeasonMatch) => {
      const periodId = String(m.period_id || (typeof m.period === 'object' ? m.period?.id : m.period) || '');
      return periodId === competitionId;
    }).length;
  }, [matches]);

  const getCompetitionParticipantsCount = useCallback((competition: CompetitionRef): number => {
    const direct = Number(
      competition?.participants_count ??
        competition?.participations_count ??
        competition?.participantsCount ??
        competition?.participationsCount
    );
    if (Number.isFinite(direct) && direct >= 0) return direct;

    const competitionId = String(competition?.id || '').trim();
    if (!competitionId) return 0;

    // Best-effort aggregation from loaded matches.
    const related = matches.filter((m: SeasonMatch) => String(m.period_id || (typeof m.period === 'object' ? m.period?.id : m.period) || '') === competitionId);
    if (related.length === 0) return 0;
    return related.reduce((sum: number, m: SeasonMatch) => sum + getMatchParticipantsCount(m), 0);
  }, [matches]);

  const seasonMatchesCount = useMemo(() => {
    if (matches.length) return matches.length;
    const annotated = Number(season?.children_matches_count ?? season?.matches_count);
    if (Number.isFinite(annotated) && annotated >= 0) return annotated;
    return 0;
  }, [matches.length, season]);

  // ── Role helpers ──

  const getBestRoleForUser = useCallback((userId: string): 'viewer' | 'editor' | 'admin' => {
    const relevant = teamRoster.filter((m: SeasonMember) => getUserId(m) === String(userId));
    const base = relevant.find((m: SeasonMember) => !String(m?.period_id ?? m?.period ?? '').trim());
    const anyOne = relevant[0];
    return normalizeAccessRole(base?.role ?? anyOne?.role ?? 'viewer');
  }, [teamRoster]);

  const getFunctionalRolesForUser = useCallback((userId: string): string[] => {
    const relevant = teamRoster.filter((m: SeasonMember) => getUserId(m) === String(userId));
    const set = new Set<string>();
    for (const m of relevant) {
      for (const r of getFunctionalRolesFromMembership(m)) set.add(r);
    }
    return Array.from(set.values());
  }, [teamRoster]);

  // ── Members eligible for then_vs_now (for modal member picker) ──

  const thenVsNowEligibleMembers = useMemo(() => {
    return (members || []).map((m: SeasonMember) => {
      const videos = m?.metadata?.teamreel_assets?.videos || {};
      const thenVsNow = videos?.then_vs_now || {};

      // Collect all transformation variant keys with data
      const transformationKeys: string[] = [];
      for (const k of Object.keys(thenVsNow)) {
        if (!k.startsWith('transformation')) continue;
        const v = thenVsNow[k];
        if (v && (v.processed || v.raw)) transformationKeys.push(k);
      }
      const hasTransformation = transformationKeys.length > 0;

      // Duo Portret eligibility: needs a processed photo_composite video (RVM output)
      const compositeVideo = videos?.photo_composite?.default;
      const hasDuoPortret = !!(
        compositeVideo
        && typeof compositeVideo === 'object'
        && compositeVideo.processing_state === 'processed'
        && compositeVideo.processed
      );

      // Duo Portret Cover: needs a raw photo_composite video (AI-generated)
      const hasDuoPortretCover = !!(
        compositeVideo
        && typeof compositeVideo === 'object'
        && compositeVideo.raw
      );

      // Duo Portret Overlay: needs a processed (RVM) photo_composite video
      const hasDuoPortretOverlay = hasDuoPortret;

      // Sidebyside eligibility: raw AI video
      const sideData = thenVsNow?.sidebyside;
      const hasSidebysideCover = !!(
        sideData
        && typeof sideData === 'object'
        && (sideData.raw || (typeof sideData === 'string'))
      );

      // Sidebyside Overlay: needs processed (RVM) sidebyside video
      const hasSidebysideOverlay = !!(
        sideData
        && typeof sideData === 'object'
        && sideData.processing_state === 'processed'
        && sideData.processed
      );

      // Walking Composite eligibility: needs a processed walking_composite video
      const walkingVideo = videos?.walking_composite?.default;
      const hasWalkingComposite = !!(
        walkingVideo
        && typeof walkingVideo === 'object'
        && walkingVideo.processing_state === 'processed'
        && walkingVideo.processed
      );

      return {
        id: String(m.id || ''),
        userId: String(m.user?.id || m.user_id || ''),
        name: m.user ? `${m.user.first_name || ''} ${m.user.last_name || ''}`.trim() || m.user.email || 'Unknown' : 'Unknown',
        shirtNumber: m.metadata?.shirt_number || m.shirt_number || null,
        position: m.metadata?.position || m.position || null,
        hasDuoPortret,
        hasDuoPortretCover,
        hasDuoPortretOverlay,
        hasSidebysideCover,
        hasSidebysideOverlay,
        hasTransformation,
        hasWalkingComposite,
        transformationKeys,
      };
    }).filter((m) => m.id);
  }, [members]);

  // ── Match display title (showing club names instead of team names) ──

  const matchDisplayTitle = useCallback((m: SeasonMatch) => {
    // Prefer a clean title built from metadata club names
    const ctx = m.metadata?.teamreel?.match_context;
    const homeClubName = ctx?.home_club_name || '';
    const awayClubName = ctx?.away_club_name || '';
    const oppClubId = String(ctx?.opponent_club_id || '').trim();
    const resolvedAwayClub = oppClubId ? opponentClubNames[oppClubId] : '';
    const homeName = homeClubName || club?.name || project?.name || '';
    const awayName = resolvedAwayClub || awayClubName || m.opponent_project?.name || '';
    if (homeName && awayName) return `${homeName} vs ${awayName}`;

    // Fallback: string replacement on stored title
    let raw = m.title || m.name || '';
    if (project?.name && club?.name && project.name !== club.name) {
      raw = raw.replace(project.name, club.name);
    }
    const oppTeamName = m.opponent_project?.name || ctx?.away_team_name || '';
    const oppClubName = oppClubId ? opponentClubNames[oppClubId] : '';
    if (oppTeamName && oppClubName && oppTeamName !== oppClubName) {
      raw = raw.replace(oppTeamName, oppClubName);
    }
    return raw;
  }, [opponentClubNames, club, project]);

  return {
    createModalOrganisations,
    createModalClubs,
    createModalTeams,
    mySeasonMembershipId,
    getMatchCountForCompetition,
    getCompetitionParticipantsCount,
    seasonMatchesCount,
    getBestRoleForUser,
    getFunctionalRolesForUser,
    thenVsNowEligibleMembers,
    matchDisplayTitle,
  };
}
