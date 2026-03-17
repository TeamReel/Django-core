/**
 * Sidebar Panel B "work" section — entity detail builders.
 *
 * Team, club, season, competition, member, match detail panels
 * and the hierarchy context fallback.
 */
import {
    LayoutDashboard, Globe, Shield, Shirt, CalendarDays, Trophy, Timer,
    Users, Sparkles, Settings, Palette, Star,
    LineChart, Scroll, Folder, Scissors,
    ClipboardCheck, Video, Footprints, Camera, UsersRound, Zap, Fingerprint,
} from 'lucide-react';
import type { PanelBResult } from './sidebarPanelBWork.types';
import { makeTabUrl, makeOrgSectionUrl } from './sidebarPanelBWork.types';

/* ── Team detail ────────────────────────────────────────────────── */

export function buildTeamDetailSection(baseUrl: string, isPlayer: boolean): PanelBResult {
    return {
        title: 'Team',
        items: [
            { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
            { label: 'Selectie', path: makeTabUrl(baseUrl, 'members'), icon: Users },
            ...(!isPlayer ? [{ label: 'Beheer', path: makeTabUrl(baseUrl, 'beheer'), icon: Settings }] : []),
        ],
        isActive: true,
    };
}

/* ── Club detail ────────────────────────────────────────────────── */

export function buildClubDetailSection(baseUrl: string): PanelBResult {
    return {
        title: 'Club',
        items: [
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
        ],
        isActive: true,
    };
}

/* ── Season detail (standard — team & vanity team routes) ───────── */

export function buildSeasonSection(baseUrl: string, isPlayer: boolean): PanelBResult {
    return {
        title: 'Season',
        items: [
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
        ],
        isActive: true,
    };
}

/* ── Season detail (project-scoped — includes Kits & Identity) ──── */

export function buildSeasonProjectSection(baseUrl: string, isPlayer: boolean): PanelBResult {
    return {
        title: 'Season',
        items: [
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
        ],
        isActive: true,
    };
}

/* ── Competition detail ─────────────────────────────────────────── */

export function buildCompetitionSection(baseUrl: string): PanelBResult {
    return {
        title: 'Competition',
        items: [
            { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
            { label: 'Hierarchy', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
            { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
            { label: 'Content', path: makeTabUrl(baseUrl, 'content'), icon: Sparkles },
        ],
        isActive: true,
    };
}

/* ── Member detail ──────────────────────────────────────────────── */

export function buildMemberSection(baseUrl: string): PanelBResult {
    return {
        title: 'Member',
        items: [
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
        ],
        isActive: true,
    };
}

/* ── Match detail ───────────────────────────────────────────────── */

export function buildMatchDetailSection(baseUrl: string, isPlayer: boolean): PanelBResult {
    return {
        title: 'Match',
        items: [
            { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
            ...(!isPlayer ? [{ label: 'Content', path: makeTabUrl(baseUrl, 'content'), icon: Sparkles }] : []),
            { label: 'Lineup', path: makeTabUrl(baseUrl, 'lineup'), icon: Users },
            ...(!isPlayer ? [{ label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll }] : []),
        ],
        isActive: true,
    };
}

/* ── Hierarchy context fallback ─────────────────────────────────── */

export interface FallbackParams {
    matchId: string | null;
    locationPathname: string;
    orgSlug: string;
    clubSlugOrId: string | null;
    teamSlugOrId: string | null;
    seasonSlugOrId: string | null;
    competitionSlugOrId: string | null;
    hasOrgDetailMatch: boolean;
    orgIdFromOrgDetailMatch: string;
}

export function buildFallbackSection(params: FallbackParams): PanelBResult | null {
    const {
        matchId, locationPathname, orgSlug,
        clubSlugOrId, teamSlugOrId, seasonSlugOrId,
        competitionSlugOrId, hasOrgDetailMatch, orgIdFromOrgDetailMatch,
    } = params;

    let title = '';
    let items: PanelBResult['items'] = [];

    if (matchId) {
        title = 'Match Actions';
        items.push({ label: 'Overview', path: locationPathname, icon: LayoutDashboard });
    } else if (!hasOrgDetailMatch && competitionSlugOrId && seasonSlugOrId && teamSlugOrId && clubSlugOrId && orgSlug) {
        title = 'Competition Actions';
        const baseUrl = `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}/competitions/${competitionSlugOrId}`;
        items.push({ label: 'Overview', path: baseUrl, icon: LayoutDashboard });
        items.push({ label: 'Matches', path: `${baseUrl}/matches`, icon: Timer });
    } else if (!hasOrgDetailMatch && competitionSlugOrId && seasonSlugOrId && !teamSlugOrId && orgSlug) {
        title = 'Competition Actions';
    } else if (!hasOrgDetailMatch && seasonSlugOrId && teamSlugOrId && clubSlugOrId && orgSlug) {
        title = 'Season Actions';
        const baseUrl = `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}`;
        items.push({ label: 'Overview', path: baseUrl, icon: LayoutDashboard });
        items.push({ label: 'Squad', path: `${baseUrl}/squad`, icon: Users });
    } else if (!hasOrgDetailMatch && teamSlugOrId && clubSlugOrId && orgSlug) {
        title = 'Team Actions';
        const baseUrl = `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}`;
        items.push({ label: 'Overview', path: baseUrl, icon: LayoutDashboard });
        items.push({ label: 'Seasons', path: `${baseUrl}/seasons`, icon: CalendarDays });
    } else if (!hasOrgDetailMatch && clubSlugOrId && orgSlug) {
        title = 'Club Actions';
        const baseUrl = `/organisations/${orgSlug}/projects/${clubSlugOrId}`;
        items.push({ label: 'Overview', path: baseUrl, icon: LayoutDashboard });
        items.push({ label: 'Teams', path: `${baseUrl}/teams`, icon: Shirt });
        items.push({ label: 'Seasons', path: `${baseUrl}/seasons`, icon: CalendarDays });
    } else if ((orgSlug && locationPathname.startsWith(`/organisations/${orgSlug}`)) || orgIdFromOrgDetailMatch) {
        const orgId = String(orgSlug || orgIdFromOrgDetailMatch || '').trim();
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
