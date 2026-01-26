import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, matchPath } from 'react-router-dom';
import {
  LayoutDashboard, Globe, Shield, Shirt, CalendarDays, Trophy, Timer,
  Users, Library, Sparkles, Settings, Activity, Flag, Puzzle, Palette,
  LineChart, Lock, BookOpen, Scroll, Command, LucideIcon, Folder,
        Bell, CreditCard, UserCircle, Star
} from 'lucide-react';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useUserRole } from './PermissionGuards';
import { useAppSelection } from '../hooks/useAppSelection';
import { AppIcon } from './AppIcon';
import { useNavFavorites } from '../hooks/useNavItems';
import { addRecent } from '../utils/navStorage';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  visibility: 'everyone' | 'org_admin' | 'staff';
}

interface NavSection {
  id: string;
  title?: string;
  items: NavItem[];
  visibility: 'everyone' | 'org_admin' | 'staff';
  bottom?: boolean;
}

const NAV_CONFIG: NavSection[] = [
  {
    id: 'overview',
    title: 'OVERVIEW',
    visibility: 'everyone',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, visibility: 'everyone' },
      { path: '/directory', label: 'Directory', icon: Folder, visibility: 'everyone' },
    ]
  },
    {
        id: 'favorites',
        title: 'FAVORITES',
        visibility: 'everyone',
        // Items are injected dynamically from localStorage
        items: []
    },
  {
    id: 'app',
    title: 'APP',
    visibility: 'everyone',
    // Items are injected dynamically based on resolvedAppContext
    items: []
  },
  {
    id: 'content',
    title: 'CONTENT',
    visibility: 'everyone',
    items: [
      { path: '/content', label: 'Library', icon: Library, visibility: 'everyone' },
      { path: '/studio', label: 'AI Studio', icon: Sparkles, visibility: 'everyone' },
    ]
  },
  {
        id: 'settings',
        title: 'SETTINGS',
        visibility: 'everyone',
        items: [
            { path: '/preferences', label: 'Preferences', icon: Settings, visibility: 'everyone' },
            { path: '/permissions', label: 'Organisation', icon: Users, visibility: 'org_admin' },
            { path: '/health', label: 'Platform', icon: Activity, visibility: 'staff' },
        ]
  },
  {
    id: 'help',
    title: 'HELP',
    visibility: 'everyone',
    bottom: true,
    items: [
      { path: '/docs', label: 'User Guide', icon: BookOpen, visibility: 'everyone' },
    ]
  }
];

export default function Sidebar({ isOpen, toggle }: SidebarProps) {
  const { isSystemAdmin, isOrgAdmin, isLandAdmin } = useUserRole();
    const { user } = useAuth();
    const { context, organisations } = useContextSwitcher();
  const location = useLocation();
    const favorites = useNavFavorites();
  const isStaff = isSystemAdmin || isLandAdmin;
  const {
      orgSlug,
      clubSlugOrId, clubName,
      teamSlugOrId, teamName,
      seasonSlugOrId, seasonName,
      competitionSlugOrId, competitionName,
            matchId,
  } = useAppSelection();

    type ResolvedAppContext = {
        orgSlug: string;
        orgName: string | null;
        club: { id: string; slug: string; name: string | null } | null;
        team: { id: string; slug: string; name: string | null } | null;
        season: { id: string; key: string; name: string | null } | null;
        competition: { id: string; key: string; name: string | null } | null;
        match: { id: string; key: string; label: string | null } | null;
    };

    const [resolvedAppContext, setResolvedAppContext] = useState<ResolvedAppContext | null>(null);

    // Record recents for canonical TeamReel hierarchy pages.
    useEffect(() => {
        const path = String(location.pathname || '').trim();
        if (!path || path === '/' || path.startsWith('/dashboard') || path.startsWith('/directory') || path.startsWith('/recents') || path.startsWith('/favorites')) {
            return;
        }

        const segs = path.split('/').map(s => s.trim()).filter(Boolean);
        if (segs.length === 0) return;

        const reservedRoots = new Set([
            'dashboard',
            'directory',
            'content',
            'studio',
            'permissions',
            'settings',
            'health',
            'docs',
            'constitution',
            'search',
            'login',
            'logout',
            'organisations',
            'projects',
            'matches',
            'users',
            'credits',
            'profile',
            'notifications',
            'preferences',
            'audit',
            'flags',
            'integration-status',
            'design-system',
            'observability',
            'security',
            'api-docs',
            'demo',
            'usage-events',
            'routing-logs',
            'auth-flows',
            'context',
            'resources',
            'recents',
            'favorites',
        ]);

        // Only track canonical vanity hierarchy: /:org/:club/:team/... (no reserved roots)
        if (reservedRoots.has(segs[0])) return;

        const orgSectionLike = new Set(['clubs', 'teams', 'seasons', 'competitions', 'matches', 'users', 'projects']);
        if (segs[1] && orgSectionLike.has(segs[1])) return;

        const kindOrder = ['federation', 'club', 'team', 'season', 'competition', 'match'] as const;
        const depth = Math.min(segs.length, kindOrder.length) - 1;
        const kind = kindOrder[Math.max(0, depth)];

        let label = '';
        if (kind === 'federation') label = resolvedAppContext?.orgName || segs[0];
        else if (kind === 'club') label = resolvedAppContext?.club?.name || segs[1];
        else if (kind === 'team') label = resolvedAppContext?.team?.name || segs[2];
        else if (kind === 'season') label = resolvedAppContext?.season?.name || segs[3];
        else if (kind === 'competition') label = resolvedAppContext?.competition?.name || segs[4];
        else if (kind === 'match') label = resolvedAppContext?.match?.label || segs[5];

        const cleanLabel = String(label || '').trim();
        if (!cleanLabel) return;

        addRecent({ kind, label: cleanLabel, path });
    }, [location.pathname, resolvedAppContext]);

    // Deterministic Panel A defaults: build paths from API-backed slugs/keys.
    useEffect(() => {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

        if (!user) {
            setResolvedAppContext(null);
            return;
        }

        let cancelled = false;

        const run = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/api/v1/auth/default-context/`, {
                    credentials: 'include',
                });

                if (!response.ok) {
                    if (!cancelled) setResolvedAppContext(null);
                    return;
                }

                const envelope = await response.json();
                const payload = envelope?.data;

                if (!cancelled) {
                    setResolvedAppContext({
                        orgSlug: String(payload?.organisation?.slug || '').trim(),
                        orgName: (payload?.organisation?.name ?? null) as string | null,
                        club: payload?.club
                            ? {
                                  id: String(payload.club.id),
                                  slug: String(payload.club.slug || payload.club.id),
                                  name: (payload.club.name ?? null) as string | null,
                              }
                            : null,
                        team: payload?.team
                            ? {
                                  id: String(payload.team.id),
                                  slug: String(payload.team.slug || payload.team.id),
                                  name: (payload.team.name ?? null) as string | null,
                              }
                            : null,
                        season: payload?.season
                            ? {
                                  id: String(payload.season.id),
                                  key: String(payload.season.key || payload.season.id),
                                  name: (payload.season.name ?? null) as string | null,
                              }
                            : null,
                        competition: payload?.competition
                            ? {
                                  id: String(payload.competition.id),
                                  key: String(payload.competition.key || payload.competition.id),
                                  name: (payload.competition.name ?? null) as string | null,
                              }
                            : null,
                        match: payload?.match
                            ? {
                                  id: String(payload.match.id),
                                  key: String(payload.match.key || payload.match.id),
                                  label: (payload.match.title ?? null) as string | null,
                              }
                            : null,
                    });
                }
            } catch {
                if (!cancelled) setResolvedAppContext(null);
            }
        };

        void run();
        return () => {
            cancelled = true;
        };
    }, [
        user,
        orgSlug,
        (context as any)?.organisation?.slug,
        (context as any)?.organisation?.id,
        (organisations as any)?.length,
    ]);

  // --- PANEL B LOGIC (New) ---
  const panelBConfig = useMemo(() => {
        const path = location.pathname;
        const walletParam = new URLSearchParams(location.search || '').get('wallet');
        const isPersonalWallet = walletParam === 'personal';

        const makeTabUrl = (baseUrl: string, tab: string) => {
            const t = String(tab || '').trim().toLowerCase();
            if (!t || t === 'overview') return baseUrl;
            return `${baseUrl}?tab=${encodeURIComponent(t)}`;
        };

        const makeOrgSectionUrl = (orgIdOrSlug: string, section: string) => {
            const orgKey = String(orgIdOrSlug || '').trim();
            if (!orgKey) return '/federations';
            const s = String(section || '').trim().toLowerCase();
            if (!s || s === 'overview') return `/${encodeURIComponent(orgKey)}`;
            return `/${encodeURIComponent(orgKey)}/${encodeURIComponent(s)}`;
        };

        // Org-context pages (federation subpages). These must be detected BEFORE
        // club/team vanity route matching, because e.g. `/organisations/:orgId/clubs`
        // would otherwise look like a club detail route with projectId="clubs".
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

        // Detect TeamReel vanity + /organisations routes so Panel B is driven by the actual page.
        const teamDetailMatch =
            matchPath({ path: '/organisations/:orgId/:clubId/:projectId', end: true }, path) ||
            matchPath({ path: '/:orgId/:clubId/:projectId', end: true }, path);

        const clubDetailMatch =
            matchPath({ path: '/organisations/:orgId/:projectId', end: true }, path) ||
            matchPath({ path: '/:orgId/:projectId', end: true }, path);

        // Season detail routes (tabs should render in Panel B, not on the page).
        const seasonDetailTeamMatch =
            matchPath({ path: '/organisations/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId', end: true }, path) ||
            matchPath({ path: '/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId', end: true }, path);

        const seasonDetailProjectMatch =
            matchPath({ path: '/organisations/:orgId/projects/:projectId/seasons/:seasonId', end: true }, path) ||
            matchPath({ path: '/:orgId/projects/:projectId/seasons/:seasonId', end: true }, path);

        // Canonical TeamReel hierarchy season routes (no /projects/.../seasons segments)
        const seasonDetailVanityTeamMatch =
            matchPath({ path: '/organisations/:orgId/:clubId/:projectId/:seasonId', end: true }, path) ||
            matchPath({ path: '/:orgId/:clubId/:projectId/:seasonId', end: true }, path);

        // Canonical TeamReel hierarchy competition routes (no /projects/.../competitions segments)
        const competitionDetailVanityTeamMatch =
            matchPath({ path: '/organisations/:orgId/:clubId/:projectId/:seasonId/:competitionId', end: true }, path) ||
            matchPath({ path: '/:orgId/:clubId/:projectId/:seasonId/:competitionId', end: true }, path);

        // Canonical TeamReel hierarchy match routes
        const matchDetailVanityTeamMatch =
            matchPath({ path: '/organisations/:orgId/:clubId/:projectId/:seasonId/:competitionId/:matchId', end: true }, path) ||
            matchPath({ path: '/:orgId/:clubId/:projectId/:seasonId/:competitionId/:matchId', end: true }, path);

        const orgDetailMatch =
            matchPath({ path: '/organisations/:id', end: true }, path) ||
            matchPath({ path: '/organisations/:orgId', end: true }, path) ||
            matchPath({ path: '/:orgId', end: true }, path);

    // 1. Determine Active Section
    let activeSection: 'work' | 'people' | 'content' | 'organisation' | 'platform' | 'help' | 'preferences' = 'work';
    if (path.startsWith('/content') || path.startsWith('/studio')) activeSection = 'content';
    else if (path.startsWith('/credits')) activeSection = isPersonalWallet ? 'preferences' : 'organisation';
    else if (path.startsWith('/permissions') || path.startsWith('/audit') || path === '/users') activeSection = 'organisation';
    else if (path.startsWith('/profile') || path.startsWith('/notifications') || path.startsWith('/preferences')) activeSection = 'preferences';
    else if (['/health', '/flags', '/integration', '/design', '/observability', '/security', '/constitution'].some(prefix => path.startsWith(prefix))) activeSection = 'platform';
    else if (['/docs'].some(prefix => path.startsWith(prefix))) activeSection = 'help';


    // 2. Build Items based on Section & Context
    let title = '';
    let items: { label: string; path: string; icon?: LucideIcon }[] = [];

    switch (activeSection) {
        case 'work':
            // Dashboard or Directory: show overview section in Panel B
            if (path === '/dashboard') {
                title = 'Overview';
                items = [
                    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
                    { label: 'Directory', path: '/directory', icon: Folder },
                    { label: 'Recents', path: '/recents', icon: Timer },
                ];
                break;
            }

            // Directory landing page: show directory tabs in Panel B.
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
                ];
                break;
            }

            // Federation subpages: keep Panel B on federation tabs.
            if (
              orgClubsMatch ||
              orgTeamsMatch ||
              orgSeasonsMatch ||
              orgCompetitionsMatch ||
              orgMatchesMatch ||
              orgUsersMatch
            ) {
                const orgId = String((orgClubsMatch?.params as any)?.orgId || (orgTeamsMatch?.params as any)?.orgId || (orgSeasonsMatch?.params as any)?.orgId || (orgCompetitionsMatch?.params as any)?.orgId || (orgMatchesMatch?.params as any)?.orgId || (orgUsersMatch?.params as any)?.orgId || '').trim();

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
                ];
                break;
            }

            // Federation detail route: Panel B must be driven by the *current route*.
            // Without this guard, async `useAppSelection` hydration can set a prior club/team
            // selection and cause Panel B to flip to "Team Actions" (Overview/Seasons) after load.
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
                        { label: 'Audit', path: makeTabUrl(baseUrl, 'audit'), icon: Scroll },
                        { label: 'Governance', path: makeTabUrl(baseUrl, 'governance'), icon: BookOpen },
                        { label: 'Operations', path: makeTabUrl(baseUrl, 'operations'), icon: Settings },
                    ];
                    break;
                }
            }

            // User detail page: tabs are querystring-driven and should live in Panel B.
            if (userDetailMatch?.params?.userId) {
                const { userId } = userDetailMatch.params as any;
                const baseUrl = `/users/${userId}`;
                title = 'User';
                items = [
                    { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
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
                break;
            }

            // Primary requirement: show the detail-page tabs in Panel B (instead of generic actions).
            // ClubDetailPage / TeamDetailPage are implemented by ProjectDetailPage under the hood,
            // which uses a querystring tab model (activeTab).
            if (teamDetailMatch?.params?.orgId && teamDetailMatch?.params?.clubId && teamDetailMatch?.params?.projectId) {
                const { orgId, clubId, projectId } = teamDetailMatch.params as any;
                const baseUrl = path.startsWith('/organisations/')
                  ? `/organisations/${orgId}/${clubId}/${projectId}`
                  : `/${orgId}/${clubId}/${projectId}`;

                title = 'Team';
                items = [
                    { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
                    { label: 'Hierarchy', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
                    { label: 'Seasons', path: makeTabUrl(baseUrl, 'seasons'), icon: CalendarDays },
                    { label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy },
                    { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
                    { label: 'Members', path: makeTabUrl(baseUrl, 'members'), icon: Users },
                    { label: 'Balance', path: makeTabUrl(baseUrl, 'balance'), icon: LineChart },
                    { label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll },
                ];
                break;
            }

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
                    { label: 'Balance', path: makeTabUrl(baseUrl, 'balance'), icon: LineChart },
                    { label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll },
                ];
                break;
            }

            if (seasonDetailTeamMatch?.params?.orgId && seasonDetailTeamMatch?.params?.clubId && seasonDetailTeamMatch?.params?.projectId && seasonDetailTeamMatch?.params?.seasonId) {
                const { orgId, clubId, projectId, seasonId } = seasonDetailTeamMatch.params as any;
                const baseUrl = path.startsWith('/organisations/')
                  ? `/organisations/${orgId}/projects/${clubId}/teams/${projectId}/seasons/${seasonId}`
                  : `/${orgId}/projects/${clubId}/teams/${projectId}/seasons/${seasonId}`;

                title = 'Season';
                items = [
                    { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
                    { label: 'Hierarchy', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
                    { label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy },
                    { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
                    { label: 'Squad', path: makeTabUrl(baseUrl, 'squad'), icon: Users },
                    { label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll },
                ];
                break;
            }

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

                                title = 'Competition';
                                items = [
                                        { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
                                        { label: 'Hierarchy', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
                                        { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
                                        { label: 'Users', path: makeTabUrl(baseUrl, 'users'), icon: Users },
                                        { label: 'Audit', path: makeTabUrl(baseUrl, 'audit'), icon: Scroll },
                                ];
                                break;
                        }

            if (seasonDetailVanityTeamMatch?.params?.orgId && seasonDetailVanityTeamMatch?.params?.clubId && seasonDetailVanityTeamMatch?.params?.projectId && seasonDetailVanityTeamMatch?.params?.seasonId) {
                const { orgId, clubId, projectId, seasonId } = seasonDetailVanityTeamMatch.params as any;
                const baseUrl = path.startsWith('/organisations/')
                  ? `/organisations/${orgId}/${clubId}/${projectId}/${seasonId}`
                  : `/${orgId}/${clubId}/${projectId}/${seasonId}`;

                title = 'Season';
                items = [
                    { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
                    { label: 'Hierarchy', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
                    { label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy },
                    { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
                    { label: 'Squad', path: makeTabUrl(baseUrl, 'squad'), icon: Users },
                    { label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll },
                ];
                break;
            }

                        if (
                            matchDetailVanityTeamMatch?.params?.orgId &&
                            matchDetailVanityTeamMatch?.params?.clubId &&
                            matchDetailVanityTeamMatch?.params?.projectId &&
                            matchDetailVanityTeamMatch?.params?.seasonId &&
                            matchDetailVanityTeamMatch?.params?.competitionId &&
                            matchDetailVanityTeamMatch?.params?.matchId
                        ) {
                                const { orgId, clubId, projectId, seasonId, competitionId, matchId } = matchDetailVanityTeamMatch.params as any;
                                const baseUrl = path.startsWith('/organisations/')
                                    ? `/organisations/${orgId}/${clubId}/${projectId}/${seasonId}/${competitionId}/${matchId}`
                                    : `/${orgId}/${clubId}/${projectId}/${seasonId}/${competitionId}/${matchId}`;

                                title = 'Match';
                                items = [
                                        { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
                                        { label: 'Hierarchy', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
                                        { label: 'Match', path: makeTabUrl(baseUrl, 'match'), icon: Timer },
                                        { label: 'Lineup', path: makeTabUrl(baseUrl, 'lineup'), icon: Users },
                                        { label: 'Date', path: makeTabUrl(baseUrl, 'date'), icon: CalendarDays },
                                        { label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll },
                                ];
                                break;
                        }

            if (seasonDetailProjectMatch?.params?.orgId && seasonDetailProjectMatch?.params?.projectId && seasonDetailProjectMatch?.params?.seasonId) {
                const { orgId, projectId, seasonId } = seasonDetailProjectMatch.params as any;
                const baseUrl = path.startsWith('/organisations/')
                  ? `/organisations/${orgId}/projects/${projectId}/seasons/${seasonId}`
                  : `/${orgId}/projects/${projectId}/seasons/${seasonId}`;

                title = 'Season';
                items = [
                    { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
                    { label: 'Hierarchy', path: makeTabUrl(baseUrl, 'hierarchy'), icon: Globe },
                    { label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy },
                    { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
                    { label: 'Squad', path: makeTabUrl(baseUrl, 'squad'), icon: Users },
                    { label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll },
                ];
                break;
            }

            // Hierarchy Context Logic
            if (matchId) {
                title = 'Match Actions';
                items.push({ label: 'Overview', path: location.pathname, icon: LayoutDashboard });
                // Add relevant Match actions if available as routes
            } else if (!orgDetailMatch && competitionSlugOrId && seasonSlugOrId && teamSlugOrId && clubSlugOrId && orgSlug) {
                 title = 'Competition Actions';
                 const baseUrl = `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}/competitions/${competitionSlugOrId}`;
                 items.push({ label: 'Overview', path: baseUrl, icon: LayoutDashboard });
                 items.push({ label: 'Matches', path: `${baseUrl}/matches`, icon: Timer });
            } else if (!orgDetailMatch && competitionSlugOrId && seasonSlugOrId && !teamSlugOrId && orgSlug) {
                 // Club/Project Competition Context
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
                // Club Actions
                title = 'Club Actions';
                const baseUrl = `/organisations/${orgSlug}/projects/${clubSlugOrId}`;
                items.push({ label: 'Overview', path: baseUrl, icon: LayoutDashboard });
                items.push({ label: 'Teams', path: `${baseUrl}/teams`, icon: Shirt });
                items.push({ label: 'Seasons', path: `${baseUrl}/seasons`, icon: CalendarDays });
            } else if ((orgSlug && location.pathname.startsWith(`/organisations/${orgSlug}`)) || (orgDetailMatch?.params as any)?.orgId || (orgDetailMatch?.params as any)?.id) {
                // Organisation Actions
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
                 // Browse Mode (Default) - Standard shortcuts
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
            break;

        case 'content':
            title = 'Content';
            items = [
                { label: 'Library', path: '/content', icon: Library },
                { label: 'AI Studio', path: '/studio', icon: Sparkles },
            ];
            break;

        case 'preferences':
            title = 'Personal Settings';
            items = [
                { label: 'My Wallet', path: '/credits?wallet=personal', icon: CreditCard },
                { label: 'Profile', path: '/profile', icon: UserCircle },
                { label: 'Notifications', path: '/notifications', icon: Bell },
                { label: 'Preferences', path: '/preferences', icon: Settings },
            ];
            break;

        case 'organisation':
            if (isOrgAdmin || isSystemAdmin) {
                title = 'Organisation';
                items = [
                    { label: 'Permissions', path: '/permissions', icon: Lock },
                    { label: 'Users', path: '/users', icon: Users },
                    { label: 'Audit', path: '/audit', icon: Scroll },
                    { label: 'Credits', path: '/credits?wallet=org', icon: CreditCard },
                ];
            }
            break;

        case 'platform':
            if (isStaff) {
                title = 'Platform';
                items = [
                    { label: 'Health', path: '/health', icon: Activity },
                    { label: 'Features', path: '/flags', icon: Flag },
                    { label: 'Integration', path: '/integration-status', icon: Puzzle },
                    { label: 'Design System', path: '/design-system', icon: Palette },
                    { label: 'Observability', path: '/observability', icon: LineChart },
                    { label: 'Security', path: '/security', icon: Lock },
                    { label: 'Constitution', path: '/constitution', icon: Scroll },
                ];
            }
            break;

        case 'help':
            title = 'Help';
            items = [
                { label: 'User Guide', path: '/docs', icon: BookOpen },
            ];
            break;
    }

    if (items.length === 0) return null;

    return { title, items, isActive: true };
  }, [location.pathname, orgSlug, clubSlugOrId, teamSlugOrId, seasonSlugOrId, competitionSlugOrId, matchId, teamName, seasonName, competitionName, isOrgAdmin, isSystemAdmin, isStaff]);

  // Filter groups and items based on permissions
  const visibleSections = useMemo(() => {
    return NAV_CONFIG.map(group => {
      // 1. Check Primary Group Permission
      const isGroupVisible =
        group.visibility === 'everyone' ||
        (group.visibility === 'org_admin' && (isOrgAdmin || isSystemAdmin)) ||
        (group.visibility === 'staff' && isStaff);

      if (!isGroupVisible) return null;

      // 2. Check Secondary Items Permission
      const visibleItems = group.items.filter(item => {
         if (item.visibility === 'everyone') return true;
         if (item.visibility === 'org_admin') return isOrgAdmin || isSystemAdmin;
         if (item.visibility === 'staff') return isStaff;
         return false;
      });

      return { ...group, items: visibleItems };
    }).filter((g): g is NavSection => g !== null);
  }, [isOrgAdmin, isStaff, isSystemAdmin]);

    // Panel A: show detail/context links under APP (not the table/list pages).
    const appDetailItems = useMemo<NavItem[]>(() => {
        // Requirement: always show all hierarchy levels.
        // Linking strategy: current selection (from useAppSelection) is already computed as
        // "most relevant" (current path → last visited → most recent), so we can build
        // stable detail URLs from it and use safe fallbacks when a level isn't available.

        const path = location.pathname;
        const segs = String(path || '')
            .split('/')
            .map((s) => s.trim())
            .filter(Boolean);

        const reservedRoots = new Set([
            'dashboard',
            'directory',
            'content',
            'studio',
            'permissions',
            'settings',
            'health',
            'docs',
            'constitution',
            'search',
            'login',
            'logout',
            'organisations',
            'projects',
            'matches',
            'users',
        ]);

        const routeOrg = segs[0] && !reservedRoots.has(segs[0]) ? segs[0] : '';
        const orgId = String(resolvedAppContext?.orgSlug || orgSlug || routeOrg || '').trim();

        const clubSlug = String(resolvedAppContext?.club?.slug || '').trim();
        const teamSlug = String(resolvedAppContext?.team?.slug || '').trim();
        const seasonKey = String(resolvedAppContext?.season?.key || '').trim();
        const competitionKey = String(resolvedAppContext?.competition?.key || '').trim();
        const matchKey = String(resolvedAppContext?.match?.key || '').trim();

                const federationPath = orgId ? `/${orgId}` : '/dashboard';

                // Use distinct, predictable fallbacks so links never collapse into the same path.
                const directoryPath = '/directory';
                const clubsIndexPath = orgId ? `/${orgId}/clubs` : directoryPath;
                const teamsIndexPath = orgId ? `/${orgId}/teams` : directoryPath;
                const seasonsIndexPath = orgId ? `/${orgId}/seasons` : directoryPath;
                const competitionsIndexPath = orgId ? `/${orgId}/competitions` : directoryPath;
                const matchesIndexPath = orgId ? `/${orgId}/matches` : directoryPath;

                const clubPath = orgId && clubSlug ? `/${orgId}/${clubSlug}` : clubsIndexPath;
                const teamPath = orgId && clubSlug && teamSlug ? `/${orgId}/${clubSlug}/${teamSlug}` : teamsIndexPath;
                const seasonPath = orgId && clubSlug && teamSlug && seasonKey ? `/${orgId}/${clubSlug}/${teamSlug}/${seasonKey}` : seasonsIndexPath;

                // No more ?tab fallbacks: always go to a detail page, or fall back one level up.
                const competitionPath = orgId && clubSlug && teamSlug && seasonKey && competitionKey
                    ? `/${orgId}/${clubSlug}/${teamSlug}/${seasonKey}/${competitionKey}`
                    : (orgId && clubSlug && teamSlug && seasonKey ? seasonPath : competitionsIndexPath);

                const matchPath = orgId && clubSlug && teamSlug && seasonKey && competitionKey && matchKey
                    ? `/${orgId}/${clubSlug}/${teamSlug}/${seasonKey}/${competitionKey}/${matchKey}`
                    : matchesIndexPath;

        const federationLabel = 'Federation';
        const clubLabel = 'Club';
        const teamLabel = 'Team';
        const seasonLabel = 'Season';
        const competitionLabel = 'Competition';
        const matchLabel = 'Match';

        const currentUserId = String((user as any)?.id || '').trim();

        return [
            { label: federationLabel, path: federationPath, icon: Globe, visibility: 'everyone' },
            { label: clubLabel, path: clubPath, icon: Shield, visibility: 'everyone' },
            { label: teamLabel, path: teamPath, icon: Shirt, visibility: 'everyone' },
            { label: seasonLabel, path: seasonPath, icon: CalendarDays, visibility: 'everyone' },
            { label: competitionLabel, path: competitionPath, icon: Trophy, visibility: 'everyone' },
            { label: matchLabel, path: matchPath, icon: Timer, visibility: 'everyone' },
            ...(currentUserId ? [{ label: 'User', path: `/users/${encodeURIComponent(currentUserId)}`, icon: Users, visibility: 'everyone' as const }] : []),
        ];
    }, [location.pathname, orgSlug, clubName, teamName, resolvedAppContext, user]);

    const favoritesItems = useMemo<NavItem[]>(() => {
        const mapIcon = (kind: string): LucideIcon => {
            switch (kind) {
                case 'federation': return Globe;
                case 'club': return Shield;
                case 'team': return Shirt;
                case 'season': return CalendarDays;
                case 'competition': return Trophy;
                case 'match': return Timer;
                case 'user': return Users;
                default: return Star;
            }
        };

        const items: NavItem[] = favorites.slice(0, 8).map((f) => ({
            label: String(f.label || '').trim() || f.path,
            path: f.path,
            icon: mapIcon(String((f as any)?.kind || 'page')),
            visibility: 'everyone',
        }));

        // Always provide a management entry
        items.push({ label: 'Manage', path: '/favorites', icon: Star, visibility: 'everyone' });
        return items;
    }, [favorites]);

    const panelASections = useMemo(() => {
        return visibleSections
            .map((section) => {
                if (section.id !== 'app') return section;
                return {
                    ...section,
                    items: appDetailItems,
                };
            })
            .map((section) => {
                if (section.id !== 'favorites') return section;
                return {
                    ...section,
                    items: favoritesItems,
                };
            })
            // Always keep the APP section visible (it now contains stable hierarchy links).
            ;
    }, [visibleSections, appDetailItems, favoritesItems]);


  return (
    <div style={{ display: 'flex', height: '100%', zIndex: 90, flexShrink: 0 }}>


      {/* --- PANEL A: PRIMARY SIDEBAR (Narrow Only but Expandable) --- */}
      {/* Note: We keep the existing width toggle for Panel A logic but Panel B sits next to it.
          Use a simpler visual for Panel B: Light/Gray background. */}

      <aside
        style={{
            zIndex: 20, // Higher than Panel B
            width: isOpen ? 240 : 72,
            backgroundColor: 'var(--sidebar-a-bg)',
            color: 'var(--sidebar-a-text)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.2s ease-in-out',
            flexShrink: 0,
            borderRight: '1px solid var(--sidebar-a-border)',
            position: 'relative'
        }}
      >
        {/* Collapse/Expand Toggle (Top-right edge of Panel A) */}
        <button
            onClick={toggle}
            title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            aria-label={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            style={{
                position: 'absolute',
                top: 18,
                right: -14,
                width: 28,
                height: 28,
                borderRadius: 999,
                backgroundColor: 'var(--sidebar-a-bg)',
                border: '1px solid var(--sidebar-a-border)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                cursor: 'pointer',
                color: 'var(--sidebar-a-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 30,
                opacity: 0.95,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.95';
            }}
        >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{isOpen ? '«' : '»'}</span>
        </button>

        {/* LOGO AREA */}
        <div style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: isOpen ? 'space-between' : 'center',
            padding: isOpen ? '0 12px 0 20px' : '0',
            borderBottom: '1px solid var(--sidebar-a-border)',
            marginBottom: 16
        }}>
             {isOpen ? (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                     <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, color: 'var(--app-link)' }}>
                        <AppIcon icon={Command} size={24} />
                    </span>
                    <span style={{ marginLeft: 12, fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--sidebar-a-text)' }}>TeamReel</span>
                </div>
             ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, color: 'var(--app-link)' }}>
                    <AppIcon icon={Command} size={24} />
                </span>
             )}
        </div>


        {/* Global Navigation (Panel A) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px', overflowY: 'auto' }}>

            {panelASections.map(section => (
               <div key={section.id} style={{ marginBottom: section.bottom ? 0 : 16 }}>
                    {/* Section Label (Only if open) */}
                    {isOpen && section.title && (
                        <div style={{ padding: '0 12px', marginBottom: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, color: 'var(--sidebar-a-text)' }}>
                            {section.title}
                        </div>
                    )}

                    {section.items.map((item, index) => (
                        <NavLink
                            key={`${section.id}:${index}:${item.label}`}
                            to={item.path}
                            end={section.id === 'app'}
                            title={!isOpen ? item.label : undefined}
                            className="flex items-center rounded-md transition-colors"
                            style={({ isActive }) => {
                                const path = location.pathname;
                                const walletParam = new URLSearchParams(location.search || '').get('wallet');
                                const isPersonalWallet = walletParam === 'personal';

                                const itemPath = String(item.path || '').split('?')[0];

                                const isPreferencesRoute =
                                    path.startsWith('/profile') ||
                                    path.startsWith('/notifications') ||
                                    path.startsWith('/preferences') ||
                                    (path.startsWith('/credits') && isPersonalWallet);

                                const isOrganisationRoute =
                                    path.startsWith('/permissions') ||
                                    path === '/users' ||
                                    path.startsWith('/audit') ||
                                    (path.startsWith('/credits') && !isPersonalWallet);

                                const isPlatformRoute =
                                    path.startsWith('/health') ||
                                    path.startsWith('/flags') ||
                                    path.startsWith('/integration-status') ||
                                    path.startsWith('/design-system') ||
                                    path.startsWith('/observability') ||
                                    path.startsWith('/security');

                                const isActiveViaItem =
                                    (itemPath === '/preferences' && isPreferencesRoute) ||
                                    (itemPath === '/permissions' && isOrganisationRoute) ||
                                    (itemPath === '/health' && isPlatformRoute);

                                const active = isActive || isActiveViaItem;

                                return {
                                height: 40,
                                textDecoration: 'none',
                                padding: isOpen ? '0 12px' : '0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isOpen ? 'flex-start' : 'center',
                                borderRadius: 8,
                                background: active ? 'var(--sidebar-a-active-bg)' : 'transparent',
                                color: active ? 'var(--sidebar-a-active-text)' : 'var(--sidebar-a-text)',
                                };
                            }}
                        >
                            <span style={{ minWidth: 24, display: 'flex', justifyContent: 'center' }}>
                                <AppIcon icon={item.icon} size={18} />
                            </span>
                            {isOpen && <span style={{ marginLeft: 12, fontSize: 14, fontWeight: 500 }}>{item.label}</span>}
                        </NavLink>
                    ))}
               </div>
            ))}
        </div>

        {/* Collapse Toggle Removed */}
      </aside>

      {/* --- PANEL B: SECONDARY CONTEXT SIDEBAR --- */}
      {panelBConfig && (
        <aside
            style={{
                width: 220, // Fixed width for panel B
                backgroundColor: 'var(--sidebar-b-bg)',
                borderRight: '1px solid var(--sidebar-b-border)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                zIndex: 10
            }}
        >
            {/* Header */}
            <div style={{
                height: 64,
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                borderBottom: '1px solid var(--sidebar-b-border)',
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--sidebar-b-text)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
            }}>
                {panelBConfig.title}
            </div>

            {/* Items */}
            {(() => {
                // Check if this is a tab-based navigation (items have ?tab= query params)
                const hasTabItems = panelBConfig.items.some(item => String(item.path || '').includes('?tab='));

                if (hasTabItems) {
                    // Tab list layout (stacked vertically in Panel B)
                    return (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                padding: '16px 12px',
                                marginBottom: 0,
                                borderBottom: '1px solid var(--app-border)',
                            }}
                        >
                            {panelBConfig.items.map(item => {
                                const [itemPathname, itemQuery = ''] = String(item.path || '').split('?');
                                const itemSearch = itemQuery ? `?${itemQuery}` : '';
                                const locationTab = String(new URLSearchParams(location.search).get('tab') || '').trim().toLowerCase();
                                const itemTab = String(new URLSearchParams(itemSearch).get('tab') || '').trim().toLowerCase();
                                const effectiveLocationTab = locationTab || (location.pathname === '/directory' ? 'federations' : 'overview');
                                const effectiveItemTab = itemTab || 'overview';
                                const isActive = location.pathname === itemPathname && effectiveLocationTab === effectiveItemTab;

                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '6px 10px',
                                            borderRadius: 8,
                                            border: `1px solid ${isActive ? 'var(--sidebar-b-border)' : 'transparent'}`,
                                            background: isActive ? 'var(--sidebar-b-active-bg)' : 'transparent',
                                            color: isActive ? 'var(--sidebar-b-active-text)' : 'var(--sidebar-b-text)',
                                            fontSize: 13,
                                            fontWeight: isActive ? 700 : 600,
                                            textDecoration: 'none',
                                            width: '100%',
                                        }}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    );
                } else {
                    // Regular sidebar item list (for section links like federation overview/clubs/teams)
                    return (
                        <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {panelBConfig.items.map(item => {
                                const [itemPathname, itemQuery = ''] = String(item.path || '').split('?');
                                const itemSearch = itemQuery ? `?${itemQuery}` : '';
                                const locationTab = String(new URLSearchParams(location.search).get('tab') || '').trim().toLowerCase();
                                const itemTab = String(new URLSearchParams(itemSearch).get('tab') || '').trim().toLowerCase();
                                const isTabItem = Boolean(itemTab);
                                const isActive = isTabItem
                                    ? (location.pathname === itemPathname && locationTab === itemTab)
                                    : (location.pathname === itemPathname && (!locationTab || locationTab === 'overview'));

                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '8px 12px',
                                            borderRadius: 6,
                                            textDecoration: 'none',
                                            fontSize: 14,
                                            color: isActive ? 'var(--sidebar-b-active-text)' : 'var(--sidebar-b-text)',
                                            backgroundColor: isActive ? 'var(--sidebar-b-active-bg)' : 'transparent',
                                            fontWeight: isActive ? 600 : 400
                                        }}
                                    >
                                        {item.icon && (
                                            <span style={{ marginRight: 10, display: 'flex' }}>
                                                <AppIcon icon={item.icon} size={16} />
                                            </span>
                                        )}
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    );
                }
            })()}
        </aside>
      )}


    </div>
  );
}
