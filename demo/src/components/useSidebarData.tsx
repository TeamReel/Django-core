/**
 * Sidebar — Orchestrator hook
 *
 * Composes sub-hooks (resolved context, recents) and pure builders
 * (panel B config) to provide everything the Sidebar component needs.
 */
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Globe, Shield, Shirt, CalendarDays, Trophy, Timer,
    Users,
} from 'lucide-react';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useUserRole } from './PermissionGuards';
import { useAppSelection } from '../hooks/useAppSelection';
import { looksLikeUuid } from '../utils/periodPath';
import { useQueueCounts } from '../hooks/useQueueCounts';
import { NAV_CONFIG, type NavItem, type NavSection } from './sidebarData';
import { useResolvedAppContext } from './useResolvedAppContext';
import { useSidebarRecents } from './useSidebarRecents';
import { buildPanelBConfig } from './sidebarPanelBConfig';

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useSidebarData() {
    const { isSystemAdmin, isOrgAdmin, isLandAdmin, isPlayer } = useUserRole();
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
        (context as any)?.organisation?.slug,
        (context as any)?.organisation?.id,
        (organisations as any)?.length,
    );

    useSidebarRecents(resolvedAppContext);

    /* ── Panel B ───────────────────────────────────────────────── */

    const panelBConfig = useMemo(() => {
        return buildPanelBConfig({
            path: location.pathname,
            search: location.search || '',
            isPlayer,
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
    }, [location.pathname, location.search, orgSlug, clubSlugOrId, teamSlugOrId, seasonSlugOrId, competitionSlugOrId, matchId, teamName, seasonName, competitionName, isOrgAdmin, isSystemAdmin, isStaff, user?.email]);

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

        const federationPath = orgId ? `/${orgId}` : '/dashboard';
        const directoryPath = '/directory';
        const clubsIndexPath = orgId ? `/${orgId}/clubs` : directoryPath;
        const teamsIndexPath = orgId ? `/${orgId}/teams` : directoryPath;
        const seasonsIndexPath = orgId ? `/${orgId}/seasons` : directoryPath;
        const competitionsIndexPath = orgId ? `/${orgId}/competitions` : directoryPath;
        const matchesIndexPath = orgId ? `/${orgId}/matches` : directoryPath;

        const clubPath = orgId && clubSlug ? `/${orgId}/${clubSlug}` : clubsIndexPath;
        const teamPath = orgId && clubSlug && teamSlug ? `/${orgId}/${clubSlug}/${teamSlug}` : teamsIndexPath;

        const teamSeasonsPath = orgId && clubSlug && teamSlug
            ? `/${orgId}/${clubSlug}/${teamSlug}/seasons`
            : seasonsIndexPath;

        const seasonPath = orgId && clubSlug && teamSlug && seasonKey
            ? `/${orgId}/${clubSlug}/${teamSlug}/${seasonKey}`
            : teamSeasonsPath;

        const competitionDetailPath = orgId && clubSlug && teamSlug && seasonKey && competitionKey
            ? `/${orgId}/${clubSlug}/${teamSlug}/${seasonKey}/${competitionKey}`
            : '';

        const competitionPath = competitionDetailPath
            ? competitionDetailPath
            : (orgId && clubSlug && teamSlug && seasonKey ? withTab(seasonPath, 'competitions') : competitionsIndexPath);

        const matchDetailPath = orgId && clubSlug && teamSlug && seasonKey && competitionKey && matchKey
            ? `/${orgId}/${clubSlug}/${teamSlug}/${seasonKey}/${competitionKey}/${matchKey}`
            : '';

        const matchPath = matchDetailPath
            ? matchDetailPath
            : (competitionDetailPath ? withTab(competitionDetailPath, 'matches') : (seasonKey ? withTab(seasonPath, 'matches') : matchesIndexPath));

        const memberDetailPath = orgId && clubSlug && teamSlug && seasonKey && membershipId
            ? `${seasonPath}/${membershipId}`
            : '';

        const memberPath = memberDetailPath
            ? memberDetailPath
            : (seasonKey ? withTab(seasonPath, 'squad') : '/directory?tab=users');

        const currentUserId = String((user as any)?.id || '').trim();

        return [
            { label: 'Federation', path: federationPath, icon: Globe, visibility: 'staff' as const },
            { label: 'Club', path: clubPath, icon: Shield, visibility: 'org_admin' as const },
            { label: 'Team', path: teamPath, icon: Shirt, visibility: 'everyone' as const },
            { label: 'Season', path: seasonPath, icon: CalendarDays, visibility: 'everyone' as const },
            { label: 'Competition', path: competitionPath, icon: Trophy, visibility: 'everyone' as const },
            { label: 'Match', path: matchPath, icon: Timer, visibility: 'everyone' as const },
            { label: 'Member', path: memberPath, icon: Users, visibility: 'everyone' as const },
            ...(currentUserId ? [{ label: 'User', path: `/users/${encodeURIComponent(currentUserId)}`, icon: Users, visibility: 'superadmin' as const }] : []),
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
