/**
 * Sidebar — Panel B "work" section builder
 *
 * Pure function that maps the current route to entity-detail menu items
 * when the active sidebar section is "work" (dashboard, directory,
 * federation/club/team/season/competition/match detail pages).
 */
import { matchPath } from 'react-router-dom';
import {
    LayoutDashboard, Globe, Shield, Shirt, CalendarDays, Trophy, Timer,
    Users, Sparkles, Settings, Activity, Flag, Palette,
    LineChart, BookOpen, Scroll, LucideIcon, Folder,
    Star, Film, Fingerprint, Scissors,
    ClipboardCheck, Video, Footprints, Camera, UsersRound, Zap,
} from 'lucide-react';
import { looksLikeUuid } from '../utils/periodPath';

/* ------------------------------------------------------------------ */
/*  Shared types                                                       */
/* ------------------------------------------------------------------ */

export interface PanelBResult {
    title: string;
    items: { label: string; path: string; icon?: LucideIcon }[];
    isActive: boolean;
}

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

export const makeTabUrl = (baseUrl: string, tab: string): string => {
    const t = String(tab || '').trim().toLowerCase();
    if (!t || t === 'overview') return baseUrl;
    return `${baseUrl}?tab=${encodeURIComponent(t)}`;
};

export const makeOrgSectionUrl = (orgIdOrSlug: string, section: string): string => {
    const orgKey = String(orgIdOrSlug || '').trim();
    if (!orgKey) return '/federations';
    const s = String(section || '').trim().toLowerCase();
    if (!s || s === 'overview') return `/${encodeURIComponent(orgKey)}`;
    return `/${encodeURIComponent(orgKey)}/${encodeURIComponent(s)}`;
};

/* ------------------------------------------------------------------ */
/*  Work section params                                                */
/* ------------------------------------------------------------------ */

export interface WorkSectionParams {
    path: string;
    isPlayer: boolean;
    isOrgRoute: boolean;
    orgSlug: string;
    clubSlugOrId: string | null;
    teamSlugOrId: string | null;
    seasonSlugOrId: string | null;
    competitionSlugOrId: string | null;
    matchId: string | null;
    locationPathname: string;
}

/* ------------------------------------------------------------------ */
/*  Builder                                                            */
/* ------------------------------------------------------------------ */

export function buildWorkSectionPanelB(params: WorkSectionParams): PanelBResult | null {
    const {
        path, isPlayer, isOrgRoute, orgSlug,
        clubSlugOrId, teamSlugOrId, seasonSlugOrId,
        competitionSlugOrId, matchId, locationPathname,
    } = params;

    let title = '';
    let items: { label: string; path: string; icon?: LucideIcon }[] = [];

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

    if (path === '/dashboard' || path === '/recents' || path === '/favorites') {
        title = 'Overview';
        items = [
            { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { label: 'Recents', path: '/recents', icon: Timer },
            { label: 'Manage Favorites', path: '/favorites', icon: Star },
        ];
        return items.length ? { title, items, isActive: true } : null;
    }

    /* ── Directory ──────────────────────────────────────────────── */

    if (path === '/directory') {
        title = 'Directory';
        items = [
            { label: 'Federations', path: '/directory?tab=federations', icon: Globe },
            { label: 'Clubs', path: '/directory?tab=clubs', icon: Shield },
            { label: 'Teams', path: '/directory?tab=teams', icon: Shirt },
            { label: 'Seasons', path: '/directory?tab=seasons', icon: CalendarDays },
            { label: 'Competitions', path: '/directory?tab=competitions', icon: Trophy },
            { label: 'Matches', path: '/directory?tab=matches', icon: Timer },
            { label: 'Users', path: '/directory?tab=users', icon: Users },
            { label: 'Content', path: '/directory?tab=content', icon: Sparkles },
            { label: 'All Content', path: '/directory?tab=all-content', icon: Film },
        ];
        return { title, items, isActive: true };
    }

    /* ── Federation subpages ────────────────────────────────────── */

    if (orgClubsMatch || orgTeamsMatch || orgSeasonsMatch || orgCompetitionsMatch || orgMatchesMatch || orgUsersMatch) {
        const orgId = String(
            (orgClubsMatch?.params as any)?.orgId || (orgTeamsMatch?.params as any)?.orgId ||
            (orgSeasonsMatch?.params as any)?.orgId || (orgCompetitionsMatch?.params as any)?.orgId ||
            (orgMatchesMatch?.params as any)?.orgId || (orgUsersMatch?.params as any)?.orgId || '',
        ).trim();
        title = 'Federation';
        items = [
            { label: 'Overview', path: makeOrgSectionUrl(orgId, 'overview'), icon: LayoutDashboard },
            { label: 'Hierarchy', path: makeOrgSectionUrl(orgId, 'hierarchy'), icon: Globe },
            { label: 'Clubs', path: makeOrgSectionUrl(orgId, 'clubs'), icon: Shield },
            { label: 'Teams', path: makeOrgSectionUrl(orgId, 'teams'), icon: Shirt },
            { label: 'Seasons', path: makeOrgSectionUrl(orgId, 'seasons'), icon: CalendarDays },
            { label: 'Competitions', path: makeOrgSectionUrl(orgId, 'competitions'), icon: Trophy },
            { label: 'Matches', path: makeOrgSectionUrl(orgId, 'matches'), icon: Timer },
            { label: 'Members', path: makeOrgSectionUrl(orgId, 'users'), icon: Users },
            { label: 'Workflow', path: makeOrgSectionUrl(orgId, 'workflow'), icon: ClipboardCheck },
            { label: 'Identity', path: makeOrgSectionUrl(orgId, 'identity'), icon: Palette },
            { label: 'Settings', path: makeOrgSectionUrl(orgId, 'settings'), icon: Settings },
        ];
        return { title, items, isActive: true };
    }

    /* ── Federation detail ──────────────────────────────────────── */

    if (orgDetailMatch && !clubDetailMatch && !teamDetailMatch) {
        const orgId = String((orgDetailMatch?.params as any)?.orgId || (orgDetailMatch?.params as any)?.id || '').trim();
        if (orgId) {
            const baseUrl = path.startsWith('/organisations/') ? `/organisations/${orgId}` : `/${orgId}`;
            title = 'Federation';
            items = [
                { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
                { label: 'Hierarchy', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
                { label: 'Clubs', path: makeTabUrl(baseUrl, 'clubs'), icon: Shield },
                { label: 'Teams', path: makeTabUrl(baseUrl, 'teams'), icon: Shirt },
                { label: 'Seasons', path: makeTabUrl(baseUrl, 'seasons'), icon: CalendarDays },
                { label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy },
                { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
                { label: 'Members', path: makeTabUrl(baseUrl, 'users'), icon: Users },
                { label: 'Workflow', path: makeTabUrl(baseUrl, 'workflow'), icon: ClipboardCheck },
                { label: 'Identity', path: makeTabUrl(baseUrl, 'identity'), icon: Palette },
                { label: 'Audit', path: makeTabUrl(baseUrl, 'audit'), icon: Scroll },
                { label: 'Governance', path: makeTabUrl(baseUrl, 'governance'), icon: BookOpen },
                { label: 'Operations', path: makeTabUrl(baseUrl, 'operations'), icon: Settings },
                { label: 'Settings', path: makeTabUrl(baseUrl, 'settings'), icon: Settings },
            ];
            return { title, items, isActive: true };
        }
    }

    /* ── User detail ────────────────────────────────────────────── */

    if (userDetailMatch?.params?.userId) {
        const { userId } = userDetailMatch.params as any;
        const baseUrl = `/users/${userId}`;
        title = 'User';
        items = [
            { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
            { label: 'Workflow', path: makeTabUrl(baseUrl, 'workflow'), icon: ClipboardCheck },
            { label: 'Identity', path: makeTabUrl(baseUrl, 'identity'), icon: Fingerprint },
            { label: 'Hierarchy', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
            { label: 'Federations', path: makeTabUrl(baseUrl, 'federations'), icon: Globe },
            { label: 'Clubs', path: makeTabUrl(baseUrl, 'clubs'), icon: Shield },
            { label: 'Teams', path: makeTabUrl(baseUrl, 'teams'), icon: Shirt },
            { label: 'Seasons', path: makeTabUrl(baseUrl, 'seasons'), icon: CalendarDays },
            { label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy },
            { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
            { label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll },
            { label: 'Balance', path: makeTabUrl(baseUrl, 'balance'), icon: LineChart },
        ];
        return { title, items, isActive: true };
    }

    /* ── Team detail ────────────────────────────────────────────── */

    if (teamDetailMatch?.params?.orgId && teamDetailMatch?.params?.clubId && teamDetailMatch?.params?.projectId) {
        const { orgId, clubId, projectId } = teamDetailMatch.params as any;
        const baseUrl = path.startsWith('/organisations/')
            ? `/organisations/${orgId}/${clubId}/${projectId}`
            : `/${orgId}/${clubId}/${projectId}`;
        title = 'Team';
        items = [
            ...(!isPlayer ? [{ label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard }] : []),
            { label: 'Hierarchy', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
            ...(!isPlayer ? [{ label: 'Seasons', path: makeTabUrl(baseUrl, 'seasons'), icon: CalendarDays }] : []),
            ...(!isPlayer ? [{ label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy }] : []),
            { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
            ...(!isPlayer ? [{ label: 'Members', path: makeTabUrl(baseUrl, 'members'), icon: Users }] : []),
            ...(!isPlayer ? [{ label: 'Media', path: makeTabUrl(baseUrl, 'media'), icon: Star }] : []),
            ...(!isPlayer ? [{ label: 'Balance', path: makeTabUrl(baseUrl, 'balance'), icon: LineChart }] : []),
            ...(!isPlayer ? [{ label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll }] : []),
            ...(!isPlayer ? [{ label: 'Assets', path: makeTabUrl(baseUrl, 'assets'), icon: Folder }] : []),
            ...(!isPlayer ? [{ label: 'Kits', path: makeTabUrl(baseUrl, 'kits'), icon: Scissors }] : []),
        ];
        return { title, items, isActive: true };
    }

    /* ── Club detail ────────────────────────────────────────────── */

    if (clubDetailMatch?.params?.orgId && clubDetailMatch?.params?.projectId && !('clubId' in (clubDetailMatch.params as any))) {
        const { orgId, projectId } = clubDetailMatch.params as any;
        const baseUrl = path.startsWith('/organisations/')
            ? `/organisations/${orgId}/${projectId}`
            : `/${orgId}/${projectId}`;
        title = 'Club';
        items = [
            { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
            { label: 'Hierarchy', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
            { label: 'Teams', path: makeTabUrl(baseUrl, 'teams'), icon: Shirt },
            { label: 'Seasons', path: makeTabUrl(baseUrl, 'seasons'), icon: CalendarDays },
            { label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy },
            { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
            { label: 'Members', path: makeTabUrl(baseUrl, 'members'), icon: Users },
            { label: 'Media', path: makeTabUrl(baseUrl, 'media'), icon: Star },
            { label: 'Assets', path: makeTabUrl(baseUrl, 'assets'), icon: Folder },
            { label: 'Balance', path: makeTabUrl(baseUrl, 'balance'), icon: LineChart },
            { label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll },
            { label: 'Workflow', path: makeTabUrl(baseUrl, 'workflow'), icon: ClipboardCheck },
            { label: 'Identity', path: makeTabUrl(baseUrl, 'identity'), icon: Palette },
            { label: 'Kits', path: makeTabUrl(baseUrl, 'kits'), icon: Scissors },
            { label: 'Settings', path: makeTabUrl(baseUrl, 'settings'), icon: Settings },
        ];
        return { title, items, isActive: true };
    }

    /* ── Season detail (team, explicit routes) ──────────────────── */

    if (seasonDetailTeamMatch?.params?.orgId && seasonDetailTeamMatch?.params?.clubId && seasonDetailTeamMatch?.params?.projectId && seasonDetailTeamMatch?.params?.seasonId) {
        const { orgId, clubId, projectId, seasonId } = seasonDetailTeamMatch.params as any;
        const baseUrl = path.startsWith('/organisations/')
            ? `/organisations/${orgId}/projects/${clubId}/teams/${projectId}/seasons/${seasonId}`
            : `/${orgId}/projects/${clubId}/teams/${projectId}/seasons/${seasonId}`;
        title = 'Season';
        items = [
            ...(!isPlayer ? [{ label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard }] : []),
            { label: 'Hierarchy', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
            { label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy },
            { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
            ...(!isPlayer ? [{ label: 'Squad', path: makeTabUrl(baseUrl, 'squad'), icon: Users }] : []),
            ...(!isPlayer ? [{ label: 'Team', path: makeTabUrl(baseUrl, 'team'), icon: Shirt }] : []),
            ...(!isPlayer ? [{ label: 'Media', path: makeTabUrl(baseUrl, 'media'), icon: Star }] : []),
            ...(!isPlayer ? [{ label: 'Content', path: makeTabUrl(baseUrl, 'content'), icon: Sparkles }] : []),
            ...(!isPlayer ? [{ label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll }] : []),
            ...(!isPlayer ? [{ label: 'Assets', path: makeTabUrl(baseUrl, 'assets'), icon: Folder }] : []),
            ...(!isPlayer ? [{ label: 'Workflow', path: makeTabUrl(baseUrl, 'workflow'), icon: ClipboardCheck }] : []),
        ];
        return { title, items, isActive: true };
    }

    /* ── Competition detail (vanity) ────────────────────────────── */

    if (
        competitionDetailVanityTeamMatch?.params?.orgId &&
        competitionDetailVanityTeamMatch?.params?.clubId &&
        competitionDetailVanityTeamMatch?.params?.projectId &&
        competitionDetailVanityTeamMatch?.params?.seasonId &&
        competitionDetailVanityTeamMatch?.params?.competitionId
    ) {
        const { orgId, clubId, projectId, seasonId, competitionId } = competitionDetailVanityTeamMatch.params as any;
        const baseUrl = path.startsWith('/organisations/')
            ? `/organisations/${orgId}/${clubId}/${projectId}/${seasonId}/${competitionId}`
            : `/${orgId}/${clubId}/${projectId}/${seasonId}/${competitionId}`;

        if (!isOrgRoute && looksLikeUuid(String(competitionId || '').trim())) {
            title = 'Member';
            items = [
                { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
                { label: "Input Foto's", path: makeTabUrl(baseUrl, 'input'), icon: Camera },
                { label: 'Assets', path: makeTabUrl(baseUrl, 'assets'), icon: Folder },
                { label: 'Actiefoto', path: makeTabUrl(baseUrl, 'action_photo'), icon: Zap },
                { label: 'Short Intro', path: makeTabUrl(baseUrl, 'intro'), icon: Sparkles },
                { label: 'Celebration', path: makeTabUrl(baseUrl, 'celebration'), icon: Trophy },
                { label: 'Transformation', path: makeTabUrl(baseUrl, 'then_vs_now'), icon: Video },
                { label: 'Duo Portret', path: makeTabUrl(baseUrl, 'photo_composite'), icon: UsersRound },
                { label: 'Walking Composite', path: makeTabUrl(baseUrl, 'walking_composite'), icon: Footprints },
                { label: 'Identity', path: makeTabUrl(baseUrl, 'identity'), icon: Fingerprint },
            ];
            return { title, items, isActive: true };
        }

        title = 'Competition';
        items = [
            { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
            { label: 'Hierarchy', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
            { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
            { label: 'Content', path: makeTabUrl(baseUrl, 'content'), icon: Sparkles },
        ];
        return { title, items, isActive: true };
    }

    /* ── Season detail (vanity team) ────────────────────────────── */

    if (seasonDetailVanityTeamMatch?.params?.orgId && seasonDetailVanityTeamMatch?.params?.clubId && seasonDetailVanityTeamMatch?.params?.projectId && seasonDetailVanityTeamMatch?.params?.seasonId) {
        const { orgId, clubId, projectId, seasonId } = seasonDetailVanityTeamMatch.params as any;
        const baseUrl = path.startsWith('/organisations/')
            ? `/organisations/${orgId}/${clubId}/${projectId}/${seasonId}`
            : `/${orgId}/${clubId}/${projectId}/${seasonId}`;
        title = 'Season';
        items = [
            ...(!isPlayer ? [{ label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard }] : []),
            { label: 'Hierarchy', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
            { label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy },
            { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
            ...(!isPlayer ? [{ label: 'Squad', path: makeTabUrl(baseUrl, 'squad'), icon: Users }] : []),
            ...(!isPlayer ? [{ label: 'Team', path: makeTabUrl(baseUrl, 'team'), icon: Shirt }] : []),
            ...(!isPlayer ? [{ label: 'Media', path: makeTabUrl(baseUrl, 'media'), icon: Star }] : []),
            ...(!isPlayer ? [{ label: 'Content', path: makeTabUrl(baseUrl, 'content'), icon: Sparkles }] : []),
            ...(!isPlayer ? [{ label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll }] : []),
            ...(!isPlayer ? [{ label: 'Assets', path: makeTabUrl(baseUrl, 'assets'), icon: Folder }] : []),
            ...(!isPlayer ? [{ label: 'Workflow', path: makeTabUrl(baseUrl, 'workflow'), icon: ClipboardCheck }] : []),
        ];
        return { title, items, isActive: true };
    }

    /* ── Member detail (vanity) ──────────────────────────────────── */

    if (
        memberDetailVanityMatch?.params?.orgId &&
        memberDetailVanityMatch?.params?.clubId &&
        memberDetailVanityMatch?.params?.projectId &&
        memberDetailVanityMatch?.params?.seasonId &&
        (memberDetailVanityMatch?.params as any)?.memberId
    ) {
        const { orgId, clubId, projectId, seasonId, memberId } = memberDetailVanityMatch.params as any;
        const baseUrl = path.startsWith('/organisations/')
            ? `/organisations/${orgId}/${clubId}/${projectId}/${seasonId}/members/${memberId}`
            : `/${orgId}/${clubId}/${projectId}/${seasonId}/members/${memberId}`;
        title = 'Member';
        items = [
            { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
            { label: "Input Foto's", path: makeTabUrl(baseUrl, 'input'), icon: Camera },
            { label: 'Assets', path: makeTabUrl(baseUrl, 'assets'), icon: Folder },
            { label: 'Actiefoto', path: makeTabUrl(baseUrl, 'action_photo'), icon: Zap },
            { label: 'Short Intro', path: makeTabUrl(baseUrl, 'intro'), icon: Sparkles },
            { label: 'Celebration', path: makeTabUrl(baseUrl, 'celebration'), icon: Trophy },
            { label: 'Transformation', path: makeTabUrl(baseUrl, 'then_vs_now'), icon: Video },
            { label: 'Duo Portret', path: makeTabUrl(baseUrl, 'photo_composite'), icon: UsersRound },
            { label: 'Walking Composite', path: makeTabUrl(baseUrl, 'walking_composite'), icon: Footprints },
            { label: 'Identity', path: makeTabUrl(baseUrl, 'identity'), icon: Fingerprint },
        ];
        return { title, items, isActive: true };
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
        const { orgId, clubId, projectId, seasonId, competitionId, matchId: mId } = matchDetailVanityTeamMatch.params as any;
        const baseUrl = path.startsWith('/organisations/')
            ? `/organisations/${orgId}/${clubId}/${projectId}/${seasonId}/${competitionId}/${mId}`
            : `/${orgId}/${clubId}/${projectId}/${seasonId}/${competitionId}/${mId}`;
        title = 'Match';
        items = [
            { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
            ...(!isPlayer ? [{ label: 'Content', path: makeTabUrl(baseUrl, 'content'), icon: Sparkles }] : []),
            { label: 'Lineup', path: makeTabUrl(baseUrl, 'lineup'), icon: Users },
            ...(!isPlayer ? [{ label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll }] : []),
        ];
        return { title, items, isActive: true };
    }

    /* ── Season detail (project-scoped) ─────────────────────────── */

    if (seasonDetailProjectMatch?.params?.orgId && seasonDetailProjectMatch?.params?.projectId && seasonDetailProjectMatch?.params?.seasonId) {
        const { orgId, projectId, seasonId } = seasonDetailProjectMatch.params as any;
        const baseUrl = path.startsWith('/organisations/')
            ? `/organisations/${orgId}/projects/${projectId}/seasons/${seasonId}`
            : `/${orgId}/projects/${projectId}/seasons/${seasonId}`;
        title = 'Season';
        items = [
            ...(!isPlayer ? [{ label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard }] : []),
            { label: 'Hierarchy', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
            { label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy },
            { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
            ...(!isPlayer ? [{ label: 'Squad', path: makeTabUrl(baseUrl, 'squad'), icon: Users }] : []),
            ...(!isPlayer ? [{ label: 'Team', path: makeTabUrl(baseUrl, 'team'), icon: Shirt }] : []),
            ...(!isPlayer ? [{ label: 'Media', path: makeTabUrl(baseUrl, 'media'), icon: Star }] : []),
            ...(!isPlayer ? [{ label: 'Content', path: makeTabUrl(baseUrl, 'content'), icon: Sparkles }] : []),
            ...(!isPlayer ? [{ label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll }] : []),
            ...(!isPlayer ? [{ label: 'Assets', path: makeTabUrl(baseUrl, 'assets'), icon: Folder }] : []),
            ...(!isPlayer ? [{ label: 'Kits', path: makeTabUrl(baseUrl, 'kits'), icon: Scissors }] : []),
            ...(!isPlayer ? [{ label: 'Workflow', path: makeTabUrl(baseUrl, 'workflow'), icon: ClipboardCheck }] : []),
            ...(!isPlayer ? [{ label: 'Identity', path: makeTabUrl(baseUrl, 'identity'), icon: Palette }] : []),
        ];
        return { title, items, isActive: true };
    }

    /* ── Hierarchy context fallback ─────────────────────────────── */

    if (matchId) {
        title = 'Match Actions';
        items.push({ label: 'Overview', path: locationPathname, icon: LayoutDashboard });
    } else if (!orgDetailMatch && competitionSlugOrId && seasonSlugOrId && teamSlugOrId && clubSlugOrId && orgSlug) {
        title = 'Competition Actions';
        const baseUrl = `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}/competitions/${competitionSlugOrId}`;
        items.push({ label: 'Overview', path: baseUrl, icon: LayoutDashboard });
        items.push({ label: 'Matches', path: `${baseUrl}/matches`, icon: Timer });
    } else if (!orgDetailMatch && competitionSlugOrId && seasonSlugOrId && !teamSlugOrId && orgSlug) {
        title = 'Competition Actions';
    } else if (!orgDetailMatch && seasonSlugOrId && teamSlugOrId && clubSlugOrId && orgSlug) {
        title = 'Season Actions';
        const baseUrl = `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}`;
        items.push({ label: 'Overview', path: baseUrl, icon: LayoutDashboard });
        items.push({ label: 'Squad', path: `${baseUrl}/squad`, icon: Users });
    } else if (!orgDetailMatch && teamSlugOrId && clubSlugOrId && orgSlug) {
        title = 'Team Actions';
        const baseUrl = `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}`;
        items.push({ label: 'Overview', path: baseUrl, icon: LayoutDashboard });
        items.push({ label: 'Seasons', path: `${baseUrl}/seasons`, icon: CalendarDays });
    } else if (!orgDetailMatch && clubSlugOrId && orgSlug) {
        title = 'Club Actions';
        const baseUrl = `/organisations/${orgSlug}/projects/${clubSlugOrId}`;
        items.push({ label: 'Overview', path: baseUrl, icon: LayoutDashboard });
        items.push({ label: 'Teams', path: `${baseUrl}/teams`, icon: Shirt });
        items.push({ label: 'Seasons', path: `${baseUrl}/seasons`, icon: CalendarDays });
    } else if ((orgSlug && locationPathname.startsWith(`/organisations/${orgSlug}`)) || (orgDetailMatch?.params as any)?.orgId || (orgDetailMatch?.params as any)?.id) {
        const orgId = String(orgSlug || (orgDetailMatch?.params as any)?.orgId || (orgDetailMatch?.params as any)?.id || '').trim();
        title = 'Federation Actions';
        items.push({ label: 'Overview', path: makeOrgSectionUrl(orgId, 'overview'), icon: LayoutDashboard });
        items.push({ label: 'Clubs', path: makeOrgSectionUrl(orgId, 'clubs'), icon: Shield });
        items.push({ label: 'Teams', path: makeOrgSectionUrl(orgId, 'teams'), icon: Shirt });
        items.push({ label: 'Seasons', path: makeOrgSectionUrl(orgId, 'seasons'), icon: CalendarDays });
        items.push({ label: 'Competitions', path: makeOrgSectionUrl(orgId, 'competitions'), icon: Trophy });
        items.push({ label: 'Matches', path: makeOrgSectionUrl(orgId, 'matches'), icon: Timer });
        items.push({ label: 'Members', path: makeOrgSectionUrl(orgId, 'users'), icon: Users });
    } else {
        title = 'Directory';
        items = [
            { label: 'Federations', path: '/federations', icon: Globe },
            { label: 'Clubs', path: '/clubs', icon: Shield },
            { label: 'Teams', path: '/teams', icon: Shirt },
            { label: 'Seasons', path: '/seasons', icon: CalendarDays },
            { label: 'Competitions', path: '/competitions', icon: Trophy },
            { label: 'Matches', path: '/matches', icon: Timer },
            { label: 'Members', path: '/users', icon: Users },
        ];
    }

    if (items.length === 0) return null;
    return { title, items, isActive: true };
}
