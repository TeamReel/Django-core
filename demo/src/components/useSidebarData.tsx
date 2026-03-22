/**
 * Sidebar — Orchestrator hook
 *
 * Composes sub-hooks (resolved context, recents) and pure builders
 * (panel B config) to provide everything the Sidebar component needs.
 */
import { useMemo } from 'react';
import { useLocation, type Location } from 'react-router-dom';
import {
    Globe, Shield, Shirt, CalendarDays, Trophy, Timer,
    Users,
} from 'lucide-react';
import { useAuth, type User } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useUserRole } from './PermissionGuards';
import { useAppSelection } from '../hooks/useAppSelection';
import { looksLikeUuid } from '../utils/periodPath';
import { useQueueCounts, type QueueCounts } from '../hooks/useQueueCounts';
import { NAV_CONFIG, type NavItem, type NavSection } from './sidebarData';
import { useResolvedAppContext } from './useResolvedAppContext';
import { useSidebarRecents } from './useSidebarRecents';
import { buildPanelBConfig } from './sidebarPanelBConfig';
import type { PanelBResult } from './sidebarPanelBWork';
import { routes } from '../routes';

/* ------------------------------------------------------------------ */
/*  Return type                                                        */
/* ------------------------------------------------------------------ */

export interface UseSidebarDataReturn {
    isSystemAdmin: boolean;
    isOrgAdmin: boolean;
    isLandAdmin: boolean;
    isPlayer: boolean;
    isStaff: boolean;
    user: User | null;
    location: Location;
    panelASections: NavSection[];
    panelBConfig: PanelBResult | null;
    queueCounts: QueueCounts;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useSidebarData(): UseSidebarDataReturn {
    const { isSystemAdmin, isOrgAdmin, isLandAdmin, isPlayer, isSupporter } = useUserRole();
    const { user } = useAuth();
    const { context, organisations } = useContextSwitcher();
    const location = useLocation();
    const isStaff = isSystemAdmin || isLandAdmin;
    const {
        orgSlug,
        clubSlugOrId, clubName,
        teamSlugOrId, teamName,
        seasonSlugOrId, seasonName,
        competitionSlugOrId, competitionName,
        matchId,
    } = useAppSelection();

    const queueCounts = useQueueCounts();

    /* ── Sub-hooks ─────────────────────────────────────────────── */

    const resolvedAppContext = useResolvedAppContext(
        user,
        orgSlug,
        context?.organisation?.slug,
        context?.organisation?.id,
        organisations?.length,
    );

    useSidebarRecents(resolvedAppContext);

    /* ── Panel B ───────────────────────────────────────────────── */

    const panelBConfig = useMemo(() => {
        return buildPanelBConfig({
            path: location.pathname,
            search: location.search || '',
            isPlayer,
            isSupporter,
            isOrgAdmin,
            isSystemAdmin,
            isStaff,
            orgSlug,
            clubSlugOrId,
            teamSlugOrId,
            seasonSlugOrId,
            competitionSlugOrId,
            matchId,
        });
    }, [location.pathname, location.search, orgSlug, clubSlugOrId, teamSlugOrId, seasonSlugOrId, competitionSlugOrId, matchId, teamName, seasonName, competitionName, isPlayer, isSupporter, isOrgAdmin, isSystemAdmin, isStaff, user?.email]);

    /* ── Visible sections (nav permission filter) ──────────────── */

    const visibleSections = useMemo(() => {
        return NAV_CONFIG.map(group => {
            const isGroupVisible =
                group.visibility === 'everyone' ||
                (group.visibility === 'superadmin' && isSystemAdmin) ||
                (group.visibility === 'org_admin' && (isOrgAdmin || isSystemAdmin)) ||
                (group.visibility === 'staff' && isStaff);

            if (!isGroupVisible) return null;

            const visibleItems = group.items.filter(item => {
                if (item.visibility === 'everyone') return true;
                if (item.visibility === 'superadmin') return isSystemAdmin;
                if (item.visibility === 'org_admin') return isOrgAdmin || isSystemAdmin;
                if (item.visibility === 'staff') return isStaff;
                return false;
            });

            return { ...group, items: visibleItems };
        }).filter((g): g is NavSection => g !== null);
    }, [isOrgAdmin, isStaff, isSystemAdmin]);

    /* ── Panel A: app detail items ─────────────────────────────── */

    const appDetailItems = useMemo<NavItem[]>(() => {
        const path = location.pathname;
        const segs = String(path || '').split('/').map(s => s.trim()).filter(Boolean);

        const reservedRoots = new Set([
            'dashboard', 'directory', 'content', 'studio', 'permissions',
            'settings', 'health', 'docs', 'constitution', 'search',
            'login', 'logout', 'organisations', 'projects', 'matches', 'users',
        ]);

        const routeOrg = segs[0] && !reservedRoots.has(segs[0]) ? segs[0] : '';
        const orgId = String(resolvedAppContext?.orgSlug || orgSlug || routeOrg || '').trim();

        const clubSlug = String(resolvedAppContext?.club?.slug || '').trim();
        const teamSlug = String(resolvedAppContext?.team?.slug || '').trim();
        const seasonKey = String(resolvedAppContext?.season?.key || '').trim();
        const competitionKey = String(resolvedAppContext?.competition?.key || '').trim();
        const matchKey = String(resolvedAppContext?.match?.key || '').trim();

        const inferredMembershipId = (() => {
            if (String(path || '').startsWith('/organisations/')) return '';
            if (segs.length < 5) return '';
            const candidate = String(segs[4] || '').trim();
            return looksLikeUuid(candidate) ? candidate : '';
        })();

        const membershipId = String(resolvedAppContext?.membership?.id || inferredMembershipId || '').trim();

        const withTab = (rawPath: string, tab: string): string => {
            const safePath = String(rawPath || '').trim();
            const t = String(tab || '').trim();
            if (!safePath || !t) return safePath;
            const [base, qs] = safePath.split('?');
            const params = new URLSearchParams(qs || '');
            params.set('tab', t);
            const next = params.toString();
            return next ? `${base}?${next}` : base;
        };

        const federationPath = orgId ? routes.orgDetail({ orgId }) : routes.dashboard();
        const directoryPath = routes.directory();
        const clubsIndexPath = orgId ? routes.orgClubs({ orgId }) : directoryPath;
        const teamsIndexPath = orgId ? routes.orgTeams({ orgId }) : directoryPath;
        const seasonsIndexPath = orgId ? routes.orgSeasons({ orgId }) : directoryPath;
        const competitionsIndexPath = orgId ? routes.orgCompetitions({ orgId }) : directoryPath;
        const matchesIndexPath = orgId ? routes.orgMatches({ orgId }) : directoryPath;

        const clubPath = orgId && clubSlug ? routes.club({ orgId, clubId: clubSlug }) : clubsIndexPath;
        const teamPath = orgId && clubSlug && teamSlug ? routes.team({ orgId, clubId: clubSlug, projectId: teamSlug }) : teamsIndexPath;

        const teamSeasonsPath = orgId && clubSlug && teamSlug
            ? routes.teamSeasons({ orgId, clubId: clubSlug, projectId: teamSlug })
            : seasonsIndexPath;

        const seasonPath = orgId && clubSlug && teamSlug && seasonKey
            ? routes.season({ orgId, clubId: clubSlug, projectId: teamSlug, seasonId: seasonKey })
            : teamSeasonsPath;

        const competitionDetailPath = orgId && clubSlug && teamSlug && seasonKey && competitionKey
            ? routes.competition({ orgId, clubId: clubSlug, projectId: teamSlug, seasonId: seasonKey, competitionId: competitionKey })
            : '';

        const competitionPath = competitionDetailPath
            ? competitionDetailPath
            : (orgId && clubSlug && teamSlug && seasonKey ? withTab(seasonPath, 'competitions') : competitionsIndexPath);

        const matchDetailPath = orgId && clubSlug && teamSlug && seasonKey && competitionKey && matchKey
            ? routes.match({ orgId, clubId: clubSlug, projectId: teamSlug, seasonId: seasonKey, competitionId: competitionKey, matchId: matchKey })
            : '';

        const matchPath = matchDetailPath
            ? matchDetailPath
            : (competitionDetailPath ? withTab(competitionDetailPath, 'matches') : (seasonKey ? withTab(seasonPath, 'matches') : matchesIndexPath));

        const memberDetailPath = orgId && clubSlug && teamSlug && seasonKey && membershipId
            ? routes.member({ orgId, clubId: clubSlug, projectId: teamSlug, seasonId: seasonKey, memberId: membershipId })
            : '';

        const memberPath = memberDetailPath
            ? memberDetailPath
            : (seasonKey ? withTab(seasonPath, 'squad') : routes.directory({ tab: 'users' }));

        const currentUserId = String(user?.id || '').trim();

        return [
            { label: 'Federation', path: federationPath, icon: Globe, visibility: 'staff' as const },
            { label: 'Club', path: clubPath, icon: Shield, visibility: 'org_admin' as const },
            { label: 'Team', path: teamPath, icon: Shirt, visibility: 'everyone' as const },
            { label: 'Season', path: seasonPath, icon: CalendarDays, visibility: 'everyone' as const },
            { label: 'Competition', path: competitionPath, icon: Trophy, visibility: 'everyone' as const },
            { label: 'Match', path: matchPath, icon: Timer, visibility: 'everyone' as const },
            { label: 'Member', path: memberPath, icon: Users, visibility: 'everyone' as const },
            ...(currentUserId ? [{ label: 'User', path: routes.userDetail({ userId: currentUserId }), icon: Users, visibility: 'superadmin' as const }] : []),
        ];
    }, [location.pathname, orgSlug, clubName, teamName, resolvedAppContext, user]);

    /* ── Panel A sections ──────────────────────────────────────── */

    const panelASections = useMemo(() => {
        return visibleSections
            .map((section) => {
                if (section.id !== 'app') return section;
                const filteredAppItems = appDetailItems.filter(item => {
                    if (item.visibility === 'everyone') return true;
                    if (item.visibility === 'superadmin') return isSystemAdmin;
                    if (item.visibility === 'org_admin') return isOrgAdmin || isSystemAdmin;
                    if (item.visibility === 'staff') return isStaff;
                    return false;
                });
                return { ...section, items: filteredAppItems };
            });
    }, [visibleSections, appDetailItems, isSystemAdmin, isOrgAdmin, isStaff]);

    /* ── Return ────────────────────────────────────────────────── */

    return {
        isSystemAdmin,
        isOrgAdmin,
        isLandAdmin,
        isPlayer,
        isStaff,
        user,
        location,
        panelASections,
        panelBConfig,
        queueCounts,
    };
}
