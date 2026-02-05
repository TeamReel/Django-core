import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, matchPath } from 'react-router-dom';
import {
  LayoutDashboard, Globe, Shield, Shirt, CalendarDays, Trophy, Timer,
  Users, Library, Sparkles, Settings, Activity, Flag, Puzzle, Palette,
  LineChart, Lock, BookOpen, Scroll, Command, LucideIcon, Folder,
      Bell, CreditCard, UserCircle, Star, PanelLeftClose, PanelLeft, Calendar, Film
} from 'lucide-react';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useUserRole } from './PermissionGuards';
import { useAppSelection } from '../hooks/useAppSelection';
import { AppIcon } from './AppIcon';
import { addRecent } from '../utils/navStorage';
import { ACTIVE_CONTEXT_CHANGED_EVENT } from '../utils/activeContext';
import { looksLikeUuid } from '../utils/periodPath';
import { getApiBaseUrl } from '../utils/apiBase';

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
      { path: '/medialib', label: 'Media Library', icon: Library, visibility: 'everyone' },
      { path: '/studio', label: 'AI Studio', icon: Sparkles, visibility: 'everyone' },
    ]
  },
  {
        id: 'settings',
        title: 'SETTINGS',
        visibility: 'everyone',
        items: [
            { path: '/preferences?tab=profile', label: 'Preferences', icon: Settings, visibility: 'everyone' },
            { path: '/content-templates', label: 'Templates', icon: Palette, visibility: 'staff' },
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
        membership: { id: string } | null;
    };

    const [resolvedAppContext, setResolvedAppContext] = useState<ResolvedAppContext | null>(null);

    // Record recents for canonical TeamReel hierarchy pages.
    useEffect(() => {
        const pathname = String(location.pathname || '').trim();
        const search = String(location.search || '');
        const fullPath = `${pathname}${search}`;

        if (!pathname || pathname === '/' || pathname.startsWith('/recents') || pathname.startsWith('/favorites')) {
            return;
        }

        const segs = pathname.split('/').map(s => s.trim()).filter(Boolean);
        if (segs.length === 0) return;

        // Track common pages (no backend needed; this makes Recents feel alive immediately).
        if (pathname === '/directory') {
            const tab = new URLSearchParams(search).get('tab');
            const label = tab ? `Directory • ${String(tab).trim()}` : 'Directory';
            addRecent({ kind: 'page', label, path: fullPath });
            return;
        }

        if (pathname.startsWith('/content')) {
            addRecent({ kind: 'page', label: 'Library', path: fullPath });
            return;
        }

        if (pathname.startsWith('/studio')) {
            addRecent({ kind: 'page', label: 'AI Studio', path: fullPath });
            return;
        }

        if (pathname.startsWith('/credits')) {
            const wallet = new URLSearchParams(search).get('wallet');
            addRecent({ kind: 'page', label: wallet === 'personal' ? 'My Wallet' : 'Credits', path: fullPath });
            return;
        }

        if (pathname === '/profile' || pathname === '/preferences' || pathname.startsWith('/notifications')) {
            const label = pathname === '/profile' ? 'My Profile' : (pathname === '/preferences' ? 'Preferences' : 'Notifications');
            addRecent({ kind: 'page', label, path: fullPath });
            return;
        }

        // Canonical vanity hierarchy (best labels from resolved context).
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
            'register',
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

        // If it's not a reserved root, assume it's a vanity hierarchy route.
        if (!reservedRoots.has(segs[0])) {
            // Org-scoped list routes like /:orgId/clubs should be treated as pages.
            const orgSectionLike = new Set(['clubs', 'teams', 'seasons', 'competitions', 'matches', 'users', 'projects']);
            if (segs[1] && orgSectionLike.has(segs[1])) {
                const orgLabel = String(resolvedAppContext?.orgName || segs[0]).trim();
                addRecent({ kind: 'page', label: `${orgLabel} • ${segs[1]}`, path: fullPath });
                return;
            }

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

            addRecent({ kind, label: cleanLabel, path: fullPath });
            return;
        }
    }, [location.pathname, location.search, resolvedAppContext]);

    // Deterministic Panel A defaults: build paths from API-backed slugs/keys.
    useEffect(() => {
        const apiBaseUrl = getApiBaseUrl();

        if (!user) {
            setResolvedAppContext(null);
            return;
        }

        let cancelled = false;

        const load = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/api/v1/auth/active-context/`, {
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
                                  key: String(payload.season.key || payload.season.slug || payload.season.id),
                                  name: (payload.season.name ?? null) as string | null,
                              }
                            : null,
                        competition: payload?.competition
                            ? {
                                  id: String(payload.competition.id),
                                  key: String(payload.competition.key || payload.competition.slug || payload.competition.id),
                                  name: (payload.competition.name ?? null) as string | null,
                              }
                            : null,
                        match: payload?.match
                            ? {
                                  id: String(payload.match.id),
                                  key: String(payload.match.slug || payload.match.key || payload.match.id),
                                  label: (payload.match.title ?? null) as string | null,
                              }
                            : null,
                        membership: payload?.membership?.id
                            ? { id: String(payload.membership.id) }
                            : null,
                    });
                }
            } catch {
                if (!cancelled) setResolvedAppContext(null);
            }
        };

        const onActiveContextChanged = () => {
            void load();
        };

        void load();
        window.addEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, onActiveContextChanged);
        return () => {
            cancelled = true;
            window.removeEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, onActiveContextChanged);
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
      const isOrgRoute = path.startsWith('/organisations/');

        // Notifications has its own top navbar entry; keep Panel B hidden here.
        if (path.startsWith('/notifications')) {
            return null;
        }

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
    let activeSection: 'work' | 'people' | 'content' | 'templates' | 'organisation' | 'platform' | 'help' | 'preferences' = 'work';
    if (path.startsWith('/content-templates')) activeSection = 'templates';
    else if (path.startsWith('/content') || path.startsWith('/studio')) activeSection = 'content';
    else if (path.startsWith('/credits')) activeSection = isPersonalWallet ? 'preferences' : 'organisation';
    else if (path.startsWith('/permissions') || path === '/users') activeSection = 'organisation';
    else if (path.startsWith('/organisation/')) activeSection = 'organisation';
    else if (path.startsWith('/profile') || path.startsWith('/preferences') || path.startsWith('/memberships') || path.startsWith('/billing') || path.startsWith('/notifications')) activeSection = 'preferences';
    else if (['/health', '/flags', '/audit', '/integration', '/design', '/observability', '/security', '/constitution', '/demo/performance'].some(prefix => path.startsWith(prefix))) activeSection = 'platform';
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
                    { label: 'Recents', path: '/recents', icon: Timer },
                    { label: 'Manage Favorites', path: '/favorites', icon: Star },
                ];
                break;
            }

            if (path === '/recents' || path === '/favorites') {
                title = 'Overview';
                items = [
                    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
                    { label: 'Recents', path: '/recents', icon: Timer },
                    { label: 'Manage Favorites', path: '/favorites', icon: Star },
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
                    { label: 'Settings', path: makeOrgSectionUrl(orgId, 'settings'), icon: Settings },
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
                        { label: 'Settings', path: makeTabUrl(baseUrl, 'settings'), icon: Settings },
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
                    { label: 'Assets', path: makeTabUrl(baseUrl, 'assets'), icon: Folder },
                    { label: 'Balance', path: makeTabUrl(baseUrl, 'balance'), icon: LineChart },
                    { label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll },
                    { label: 'Settings', path: makeTabUrl(baseUrl, 'settings'), icon: Settings },
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
                    { label: 'Team', path: makeTabUrl(baseUrl, 'team'), icon: Shirt },
                    { label: 'Media', path: makeTabUrl(baseUrl, 'media'), icon: Star },
                    { label: 'Content', path: makeTabUrl(baseUrl, 'content'), icon: Sparkles },
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

                                // Member detail pages share the same route shape as competition detail pages.
                                // Only treat UUID last segments as "Member" for vanity routes (NOT /organisations/...)
                                // to avoid ambiguity where competition IDs can be UUIDs.
                                if (!isOrgRoute && looksLikeUuid(String(competitionId || '').trim())) {
                                    title = 'Member';
                                    items = [
                                        { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
                                        { label: 'Profile Photo', path: makeTabUrl(baseUrl, 'profile'), icon: UserCircle },
                                        { label: 'Legacy Photo', path: makeTabUrl(baseUrl, 'legacy_photo'), icon: Timer },
                                        { label: 'In Tenue', path: makeTabUrl(baseUrl, 'kit'), icon: Shirt },
                                        { label: 'Close-up', path: makeTabUrl(baseUrl, 'closeup'), icon: Star },
                                        { label: 'Short Intro', path: makeTabUrl(baseUrl, 'intro'), icon: Sparkles },
                                        { label: 'Celebration', path: makeTabUrl(baseUrl, 'celebration'), icon: Trophy },
                                        { label: 'Legacy in Tenue', path: makeTabUrl(baseUrl, 'legacy'), icon: Trophy },
                                    ];
                                    break;
                                }

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
                    { label: 'Team', path: makeTabUrl(baseUrl, 'team'), icon: Shirt },
                    { label: 'Media', path: makeTabUrl(baseUrl, 'media'), icon: Star },
                    { label: 'Content', path: makeTabUrl(baseUrl, 'content'), icon: Sparkles },
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
                                    { label: 'Content', path: makeTabUrl(baseUrl, 'content'), icon: Sparkles },
                                    { label: 'Lineup', path: makeTabUrl(baseUrl, 'lineup'), icon: Users },
                                    { label: 'Transactions', path: makeTabUrl(baseUrl, 'transactions'), icon: Scroll },
                                    { label: 'Details', path: makeTabUrl(baseUrl, 'details'), icon: Globe },
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
                    { label: 'Team', path: makeTabUrl(baseUrl, 'team'), icon: Shirt },
                    { label: 'Media', path: makeTabUrl(baseUrl, 'media'), icon: Star },
                    { label: 'Content', path: makeTabUrl(baseUrl, 'content'), icon: Sparkles },
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

        case 'templates':
            title = 'Content Templates';
            items = [
                { label: 'All Templates', path: '/content-templates?tab=all', icon: Library },
                { label: 'Season', path: '/content-templates?tab=season', icon: Calendar },
                { label: 'Pre-Match', path: '/content-templates?tab=pre_match', icon: Film },
                { label: 'During Match', path: '/content-templates?tab=during_match', icon: Sparkles },
                { label: 'Post-Match', path: '/content-templates?tab=post_match', icon: Trophy },
                { label: 'Member', path: '/content-templates?tab=member', icon: UserCircle },
            ];
            break;

        case 'preferences':
            title = 'Personal Settings';
            items = [
                { label: 'Profile', path: '/preferences?tab=profile', icon: UserCircle },
                { label: 'Personalisation', path: '/preferences?tab=personalisation', icon: Palette },
                { label: 'Notification settings', path: '/preferences?tab=notifications', icon: Settings },
                { label: 'My Wallet', path: '/credits?wallet=personal', icon: CreditCard },
                { label: 'Memberships', path: '/memberships', icon: Users },
                { label: 'My Audit', path: '/preferences?tab=audit', icon: Scroll },
                { label: 'Billing & Licensing', path: '/billing', icon: CreditCard },
            ];
            break;

        case 'organisation':
            if (isOrgAdmin || isSystemAdmin) {
                title = 'Organisation';
                items = [
                    { label: 'Permissions', path: '/permissions', icon: Lock },
                    { label: 'Users', path: '/users', icon: Users },
                    { label: 'Audit', path: '/organisation/audit', icon: Scroll },
                    { label: 'Organisation Wallet', path: '/credits?wallet=org', icon: CreditCard },
                ];
            }
            break;

        case 'platform':
            title = 'Platform';
            items = [
                ...((isOrgAdmin || isSystemAdmin) ? [{ label: 'Audit', path: '/audit', icon: Scroll }] : []),
                ...(isStaff ? [
                    { label: 'Health', path: '/health', icon: Activity },
                    { label: 'Cache Performance', path: '/demo/performance', icon: LineChart },
                    { label: 'Features', path: '/flags', icon: Flag },
                    { label: 'Integration', path: '/integration-status', icon: Puzzle },
                    { label: 'Design System', path: '/design-system', icon: Palette },
                    { label: 'Observability', path: '/observability', icon: LineChart },
                    { label: 'Security', path: '/security', icon: Lock },
                    { label: 'Constitution', path: '/constitution', icon: Scroll },
                ] : []),
            ];
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
    }, [location.pathname, orgSlug, clubSlugOrId, teamSlugOrId, seasonSlugOrId, competitionSlugOrId, matchId, teamName, seasonName, competitionName, isOrgAdmin, isSystemAdmin, isStaff, user?.email]);

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
        // If membership isn't in active context yet, infer it when we are on a vanity member detail route.
        // NOTE: do not infer on /organisations/... routes to avoid UUID competitionId ambiguity.
        const inferredMembershipId = (() => {
            if (String(path || '').startsWith('/organisations/')) return '';
            // Vanity hierarchy paths: /:org/:club/:team/:season/:child
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

        // Use distinct, predictable fallbacks so links never collapse into the same path.
        const directoryPath = '/directory';
        const clubsIndexPath = orgId ? `/${orgId}/clubs` : directoryPath;
        const teamsIndexPath = orgId ? `/${orgId}/teams` : directoryPath;
        const seasonsIndexPath = orgId ? `/${orgId}/seasons` : directoryPath;
        const competitionsIndexPath = orgId ? `/${orgId}/competitions` : directoryPath;
        const matchesIndexPath = orgId ? `/${orgId}/matches` : directoryPath;

        const clubPath = orgId && clubSlug ? `/${orgId}/${clubSlug}` : clubsIndexPath;
        const teamPath = orgId && clubSlug && teamSlug ? `/${orgId}/${clubSlug}/${teamSlug}` : teamsIndexPath;

        // Prefer team-scoped routes when possible.
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

        const federationLabel = 'Federation';
        const clubLabel = 'Club';
        const teamLabel = 'Team';
        const seasonLabel = 'Season';
        const competitionLabel = 'Competition';
        const matchLabel = 'Match';
        const memberLabel = 'Member';

        const currentUserId = String((user as any)?.id || '').trim();

        return [
            { label: federationLabel, path: federationPath, icon: Globe, visibility: 'everyone' },
            { label: clubLabel, path: clubPath, icon: Shield, visibility: 'everyone' },
            { label: teamLabel, path: teamPath, icon: Shirt, visibility: 'everyone' },
            { label: seasonLabel, path: seasonPath, icon: CalendarDays, visibility: 'everyone' },
            { label: competitionLabel, path: competitionPath, icon: Trophy, visibility: 'everyone' },
            { label: matchLabel, path: matchPath, icon: Timer, visibility: 'everyone' },
            { label: memberLabel, path: memberPath, icon: Users, visibility: 'everyone' },
            ...(currentUserId ? [{ label: 'User', path: `/users/${encodeURIComponent(currentUserId)}`, icon: Users, visibility: 'everyone' as const }] : []),
        ];
    }, [location.pathname, orgSlug, clubName, teamName, resolvedAppContext, user]);

    const panelASections = useMemo(() => {
        return visibleSections
            .map((section) => {
                if (section.id !== 'app') return section;
                return {
                    ...section,
                    items: appDetailItems,
                };
            })
            // Always keep the APP section visible (it now contains stable hierarchy links).
            ;
    }, [visibleSections, appDetailItems]);


  return (
    <div style={{ display: 'flex', height: '100%', zIndex: 90, flexShrink: 0 }}>


      {/* --- PANEL A: PRIMARY SIDEBAR (Narrow Only but Expandable) --- */}
      {/* Note: We keep the existing width toggle for Panel A logic but Panel B sits next to it.
          Use a simpler visual for Panel B: Light/Gray background. */}

      <aside
        className="sidebar-panel-a"
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
        {/* Collapse/Expand Toggle - inside Panel A header area */}
        <button
            onClick={toggle}
            title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            aria-label={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            className="sidebar-collapse-button"
            style={{
                position: 'absolute',
                top: 18,
                right: 12,
                width: 32,
                height: 32,
                borderRadius: '6px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--sidebar-a-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                transition: 'all 0.15s ease',
                opacity: 0.7,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--sidebar-a-hover-bg)';
                e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.opacity = '0.7';
            }}
        >
            <AppIcon icon={isOpen ? PanelLeftClose : PanelLeft} size={20} />
        </button>

        {/* LOGO AREA */}
        <div style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: isOpen ? 'flex-start' : 'center',
            padding: isOpen ? '0 20px' : '0',
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

            {panelASections.map((section) => {
                const path = location.pathname;
                const walletParam = new URLSearchParams(location.search || '').get('wallet');
                const isPersonalWallet = walletParam === 'personal';

                const isPreferencesRoute =
                    path.startsWith('/profile') ||
                    path.startsWith('/notifications') ||
                    path.startsWith('/preferences') ||
                    path.startsWith('/memberships') ||
                    path.startsWith('/billing') ||
                    (path.startsWith('/credits') && isPersonalWallet);

                const isOrganisationRoute =
                    path.startsWith('/permissions') ||
                    path === '/users' ||
                    path.startsWith('/organisation/') ||
                    path.startsWith('/audit') ||
                    (path.startsWith('/credits') && !isPersonalWallet);

                const isPlatformRoute =
                    path.startsWith('/health') ||
                    path.startsWith('/flags') ||
                    path.startsWith('/integration-status') ||
                    path.startsWith('/design-system') ||
                    path.startsWith('/observability') ||
                    path.startsWith('/security');

                const sectionIsActive = (() => {
                    if (section.id === 'settings') {
                        return isPreferencesRoute || isOrganisationRoute || isPlatformRoute;
                    }

                    return section.items.some((item) => {
                        const itemPath = String(item.path || '').split('?')[0];
                        if (!itemPath) return false;
                        if (itemPath === '/dashboard') {
                            return path === '/dashboard' || path === '/recents' || path === '/favorites';
                        }
                        if (itemPath === '/directory') {
                            return path.startsWith('/directory');
                        }
                        if (itemPath === '/medialib' || itemPath === '/studio') {
                            return path.startsWith(itemPath);
                        }
                        return path === itemPath || path.startsWith(`${itemPath}/`);
                    });
                })();

                return (
               <div key={section.id} style={{ marginBottom: section.bottom ? 0 : 16 }}>
                    {/* Section Label (Only if open) */}
                    {isOpen && section.title && (
                        <div
                          style={{
                            padding: '0 12px',
                            marginBottom: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            opacity: sectionIsActive ? 1 : 0.5,
                            color: sectionIsActive ? 'var(--sidebar-a-active-text)' : 'var(--sidebar-a-text)',
                          }}
                        >
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
                                    path.startsWith('/memberships') ||
                                    path.startsWith('/billing') ||
                                    (path.startsWith('/credits') && isPersonalWallet);

                                const isOrganisationRoute =
                                    path.startsWith('/permissions') ||
                                    path === '/users' ||
                                    path.startsWith('/organisation/') ||
                                    (path.startsWith('/credits') && !isPersonalWallet);

                                const isPlatformRoute =
                                    path.startsWith('/audit') ||
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
                );
            })}
        </div>

        {/* Collapse Toggle Removed */}
      </aside>

      {/* --- PANEL B: SECONDARY CONTEXT SIDEBAR --- */}
      {panelBConfig && (
        <aside
            className="sidebar-panel-b"
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
