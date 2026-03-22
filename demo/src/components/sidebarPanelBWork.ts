/**
 * Sidebar — Panel B "work" section builder
 *
 * Pure function that maps the current route to entity-detail menu items
 * when the active sidebar section is "work" (dashboard, directory,
 * federation/club/team/season/competition/match detail pages).
 */
import { matchPath } from 'react-router-dom';
import { looksLikeUuid } from '../utils/periodPath';
import { getParam } from './sidebarPanelBWork.types';
import { routes } from '../routes';
import type { WorkSectionParams, PanelBResult } from './sidebarPanelBWork.types';
import {
    buildDashboardSection,
    buildDirectorySection,
    buildFederationSubpagesSection,
    buildFederationDetailSection,
    buildUserDetailSection,
} from './sidebarPanelBWorkNav';
import {
    buildTeamDetailSection,
    buildClubDetailSection,
    buildSeasonSection,
    buildSeasonProjectSection,
    buildCompetitionSection,
    buildMemberSection,
    buildMatchDetailSection,
    buildFallbackSection,
    buildUnifiedHubSection,
} from './sidebarPanelBWorkEntities';

/* Re-export for backward compatibility */
export type { PanelBResult, WorkSectionParams } from './sidebarPanelBWork.types';
export { makeTabUrl, makeOrgSectionUrl } from './sidebarPanelBWork.types';

/* ------------------------------------------------------------------ */
/*  Builder                                                            */
/* ------------------------------------------------------------------ */

export function buildWorkSectionPanelB(params: WorkSectionParams): PanelBResult | null {
    const {
        path, isPlayer, isSupporter, isOrgRoute, orgSlug,
        clubSlugOrId, teamSlugOrId, seasonSlugOrId,
        competitionSlugOrId, matchId, locationPathname,
    } = params;
    const supporter = isSupporter ?? false;

    /* ── Route matching ─────────────────────────────────────────── */

    const orgClubsMatch =
        matchPath({ path: '/organisations/:orgId/clubs', end: true }, path) ||
        matchPath({ path: '/:orgId/clubs', end: true }, path);
    const orgTeamsMatch =
        matchPath({ path: '/organisations/:orgId/teams', end: true }, path) ||
        matchPath({ path: '/:orgId/teams', end: true }, path);
    const orgSeasonsMatch =
        matchPath({ path: '/organisations/:orgId/seasons', end: true }, path) ||
        matchPath({ path: '/:orgId/seasons', end: true }, path);
    const orgCompetitionsMatch =
        matchPath({ path: '/organisations/:orgId/competitions', end: true }, path) ||
        matchPath({ path: '/:orgId/competitions', end: true }, path);
    const orgMatchesMatch =
        matchPath({ path: '/organisations/:orgId/matches', end: true }, path) ||
        matchPath({ path: '/:orgId/matches', end: true }, path);
    const orgUsersMatch =
        matchPath({ path: '/organisations/:orgId/users', end: true }, path) ||
        matchPath({ path: '/:orgId/users', end: true }, path);

    const userDetailMatch =
        matchPath({ path: '/users/:userId', end: true }, path) ||
        matchPath({ path: '/organisations/:orgId/users/:userId', end: true }, path);

    const teamDetailMatch =
        matchPath({ path: '/organisations/:orgId/:clubId/:projectId', end: true }, path) ||
        matchPath({ path: '/:orgId/:clubId/:projectId', end: true }, path);

    const clubDetailMatch =
        matchPath({ path: '/organisations/:orgId/:projectId', end: true }, path) ||
        matchPath({ path: '/:orgId/:projectId', end: true }, path);

    const seasonDetailTeamMatch =
        matchPath({ path: '/organisations/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId', end: true }, path) ||
        matchPath({ path: '/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId', end: true }, path);

    const seasonDetailProjectMatch =
        matchPath({ path: '/organisations/:orgId/projects/:projectId/seasons/:seasonId', end: true }, path) ||
        matchPath({ path: '/:orgId/projects/:projectId/seasons/:seasonId', end: true }, path);

    const seasonDetailVanityTeamMatch =
        matchPath({ path: '/organisations/:orgId/:clubId/:projectId/:seasonId', end: true }, path) ||
        matchPath({ path: '/:orgId/:clubId/:projectId/:seasonId', end: true }, path);

    const competitionDetailVanityTeamMatch =
        matchPath({ path: '/organisations/:orgId/:clubId/:projectId/:seasonId/:competitionId', end: true }, path) ||
        matchPath({ path: '/:orgId/:clubId/:projectId/:seasonId/:competitionId', end: true }, path);

    const memberDetailVanityMatch =
        matchPath({ path: '/organisations/:orgId/:clubId/:projectId/:seasonId/members/:memberId', end: true }, path) ||
        matchPath({ path: '/:orgId/:clubId/:projectId/:seasonId/members/:memberId', end: true }, path) ||
        matchPath({ path: '/organisations/:orgId/:clubId/:projectId/seasons/:seasonId/members/:memberId', end: true }, path) ||
        matchPath({ path: '/:orgId/:clubId/:projectId/seasons/:seasonId/members/:memberId', end: true }, path);

    const matchDetailVanityTeamMatch =
        matchPath({ path: '/organisations/:orgId/:clubId/:projectId/:seasonId/:competitionId/:matchId', end: true }, path) ||
        matchPath({ path: '/:orgId/:clubId/:projectId/:seasonId/:competitionId/:matchId', end: true }, path);

    const orgDetailMatch =
        matchPath({ path: '/organisations/:id', end: true }, path) ||
        matchPath({ path: '/organisations/:orgId', end: true }, path) ||
        matchPath({ path: '/:orgId', end: true }, path);

    /* ── Dashboard / Recents / Favorites ────────────────────────── */

    if (path === routes.dashboard() || path === '/recents' || path === '/favorites') {
        return buildDashboardSection();
    }

    /* ── Directory ──────────────────────────────────────────────── */

    if (path === '/directory') {
        return buildDirectorySection();
    }

    /* ── Federation subpages ────────────────────────────────────── */

    if (orgClubsMatch || orgTeamsMatch || orgSeasonsMatch || orgCompetitionsMatch || orgMatchesMatch || orgUsersMatch) {
        const orgId = String(
            orgClubsMatch?.params?.orgId || orgTeamsMatch?.params?.orgId ||
            orgSeasonsMatch?.params?.orgId || orgCompetitionsMatch?.params?.orgId ||
            orgMatchesMatch?.params?.orgId || orgUsersMatch?.params?.orgId || '',
        ).trim();
        return buildFederationSubpagesSection(orgId);
    }

    /* ── Federation detail ──────────────────────────────────────── */

    if (orgDetailMatch && !clubDetailMatch && !teamDetailMatch) {
        const orgId = String(getParam(orgDetailMatch, 'orgId') || getParam(orgDetailMatch, 'id') || '').trim();
        if (orgId) {
            const baseUrl = path.startsWith('/organisations/') ? `/organisations/${orgId}` : `/${orgId}`;
            return buildFederationDetailSection(baseUrl);
        }
    }

    /* ── User detail ────────────────────────────────────────────── */

    if (userDetailMatch?.params?.userId) {
        const baseUrl = `/users/${userDetailMatch.params.userId}`;
        return buildUserDetailSection(baseUrl);
    }

    /* ── Team detail ────────────────────────────────────────────── */

    if (teamDetailMatch?.params?.orgId && teamDetailMatch?.params?.clubId && teamDetailMatch?.params?.projectId) {
        const { orgId, clubId, projectId } = teamDetailMatch.params;
        const baseUrl = path.startsWith('/organisations/')
            ? `/organisations/${orgId}/${clubId}/${projectId}`
            : `/${orgId}/${clubId}/${projectId}`;
        return buildUnifiedHubSection(baseUrl, 'team-only', isPlayer, supporter);
    }

    /* ── Club detail ────────────────────────────────────────────── */

    if (clubDetailMatch?.params?.orgId && clubDetailMatch?.params?.projectId && !getParam(clubDetailMatch, 'clubId')) {
        const { orgId, projectId } = clubDetailMatch.params;
        const baseUrl = path.startsWith('/organisations/')
            ? `/organisations/${orgId}/${projectId}`
            : `/${orgId}/${projectId}`;
        return buildUnifiedHubSection(baseUrl, 'club', isPlayer, supporter);
    }

    /* ── Season detail (team, explicit routes) ──────────────────── */

    if (seasonDetailTeamMatch?.params?.orgId && seasonDetailTeamMatch?.params?.clubId && seasonDetailTeamMatch?.params?.projectId && seasonDetailTeamMatch?.params?.seasonId) {
        const { orgId, clubId, projectId, seasonId } = seasonDetailTeamMatch.params;
        const baseUrl = path.startsWith('/organisations/')
            ? `/organisations/${orgId}/projects/${clubId}/teams/${projectId}/seasons/${seasonId}`
            : `/${orgId}/projects/${clubId}/teams/${projectId}/seasons/${seasonId}`;
        return buildUnifiedHubSection(baseUrl, 'season', isPlayer, supporter);
    }

    /* ── Competition detail (vanity) ────────────────────────────── */

    if (
        competitionDetailVanityTeamMatch?.params?.orgId &&
        competitionDetailVanityTeamMatch?.params?.clubId &&
        competitionDetailVanityTeamMatch?.params?.projectId &&
        competitionDetailVanityTeamMatch?.params?.seasonId &&
        competitionDetailVanityTeamMatch?.params?.competitionId
    ) {
        const { orgId, clubId, projectId, seasonId, competitionId } = competitionDetailVanityTeamMatch.params;
        const baseUrl = path.startsWith('/organisations/')
            ? `/organisations/${orgId}/${clubId}/${projectId}/${seasonId}/${competitionId}`
            : `/${orgId}/${clubId}/${projectId}/${seasonId}/${competitionId}`;

        if (!isOrgRoute && looksLikeUuid(String(competitionId || '').trim())) {
            return buildMemberSection(baseUrl);
        }
        return buildCompetitionSection(baseUrl);
    }

    /* ── Season detail (vanity team) ────────────────────────────── */

    if (seasonDetailVanityTeamMatch?.params?.orgId && seasonDetailVanityTeamMatch?.params?.clubId && seasonDetailVanityTeamMatch?.params?.projectId && seasonDetailVanityTeamMatch?.params?.seasonId) {
        const { orgId, clubId, projectId, seasonId } = seasonDetailVanityTeamMatch.params;
        const baseUrl = path.startsWith('/organisations/')
            ? `/organisations/${orgId}/${clubId}/${projectId}/${seasonId}`
            : `/${orgId}/${clubId}/${projectId}/${seasonId}`;
        return buildUnifiedHubSection(baseUrl, 'season', isPlayer, supporter);
    }

    /* ── Member detail (vanity) ──────────────────────────────────── */

    if (
        memberDetailVanityMatch?.params?.orgId &&
        memberDetailVanityMatch?.params?.clubId &&
        memberDetailVanityMatch?.params?.projectId &&
        memberDetailVanityMatch?.params?.seasonId &&
        memberDetailVanityMatch?.params?.memberId
    ) {
        const { orgId, clubId, projectId, seasonId, memberId } = memberDetailVanityMatch.params;
        const baseUrl = path.startsWith('/organisations/')
            ? `/organisations/${orgId}/${clubId}/${projectId}/${seasonId}/members/${memberId}`
            : `/${orgId}/${clubId}/${projectId}/${seasonId}/members/${memberId}`;
        return buildMemberSection(baseUrl);
    }

    /* ── Match detail (vanity) ──────────────────────────────────── */

    if (
        matchDetailVanityTeamMatch?.params?.orgId &&
        matchDetailVanityTeamMatch?.params?.clubId &&
        matchDetailVanityTeamMatch?.params?.projectId &&
        matchDetailVanityTeamMatch?.params?.seasonId &&
        matchDetailVanityTeamMatch?.params?.competitionId &&
        matchDetailVanityTeamMatch?.params?.matchId
    ) {
        const { orgId, clubId, projectId, seasonId, competitionId, matchId: mId } = matchDetailVanityTeamMatch.params;
        const baseUrl = path.startsWith('/organisations/')
            ? `/organisations/${orgId}/${clubId}/${projectId}/${seasonId}/${competitionId}/${mId}`
            : `/${orgId}/${clubId}/${projectId}/${seasonId}/${competitionId}/${mId}`;
        return buildMatchDetailSection(baseUrl, isPlayer);
    }

    /* ── Season detail (project-scoped) ─────────────────────────── */

    if (seasonDetailProjectMatch?.params?.orgId && seasonDetailProjectMatch?.params?.projectId && seasonDetailProjectMatch?.params?.seasonId) {
        const { orgId, projectId, seasonId } = seasonDetailProjectMatch.params;
        const baseUrl = path.startsWith('/organisations/')
            ? `/organisations/${orgId}/projects/${projectId}/seasons/${seasonId}`
            : `/${orgId}/projects/${projectId}/seasons/${seasonId}`;
        return buildUnifiedHubSection(baseUrl, 'season', isPlayer, supporter);
    }

    /* ── Hierarchy context fallback ─────────────────────────────── */

    return buildFallbackSection({
        matchId,
        locationPathname,
        orgSlug,
        clubSlugOrId,
        teamSlugOrId,
        seasonSlugOrId,
        competitionSlugOrId,
        hasOrgDetailMatch: !!orgDetailMatch,
        orgIdFromOrgDetailMatch: String(getParam(orgDetailMatch, 'orgId') || getParam(orgDetailMatch, 'id') || '').trim(),
    });
}
