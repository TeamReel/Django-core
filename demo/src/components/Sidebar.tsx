import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, matchPath } from 'react-router-dom';
import {
  LayoutDashboard, Globe, Shield, Shirt, CalendarDays, Trophy, Timer,
  Users, Library, Sparkles, Settings, Activity, Flag, Puzzle, Palette,
  LineChart, Lock, BookOpen, Scroll, Command, LucideIcon, Folder
} from 'lucide-react';
import { useUserRole } from './PermissionGuards';
import { useAppSelection } from '../hooks/useAppSelection';
import { AppIcon } from './AppIcon';

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
    visibility: 'everyone',
    items: [
            { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, visibility: 'everyone' },
            { path: '/directory', label: 'Directory', icon: Folder, visibility: 'everyone' }
    ]
  },
  {
    id: 'app',
    title: 'APP',
    visibility: 'everyone',
        // NOTE: Panel A should show detail/context links here (not table/list pages).
        // Items are injected dynamically via `panelASections`.
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
    id: 'organisation',
    title: 'ORGANISATION',
    visibility: 'org_admin',
    items: [
      { path: '/permissions', label: 'Settings', icon: Settings, visibility: 'org_admin' },
    ]
  },
  {
    id: 'platform',
    title: 'PLATFORM',
    visibility: 'staff',
    items: [
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
      { path: '/constitution', label: 'Constitution', icon: Scroll, visibility: 'everyone' },
    ]
  }
];

export default function Sidebar({ isOpen, toggle }: SidebarProps) {
  const { isSystemAdmin, isOrgAdmin, isLandAdmin } = useUserRole();
  const location = useLocation();
  const isStaff = isSystemAdmin || isLandAdmin;
    const [user2364Label, setUser2364Label] = useState('User: 2364');
  const {
      orgSlug,
      clubSlugOrId, clubName,
      teamSlugOrId, teamName,
      seasonSlugOrId, seasonName,
      competitionSlugOrId, competitionName,
      matchId
  } = useAppSelection();

    useEffect(() => {
        // Optional convenience shortcut: keep the APP link human-friendly.
        // If the user isn't accessible, keep the numeric fallback label.
        let cancelled = false;
        const run = async () => {
            try {
                const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                const res = await fetch(
                    `${apiBaseUrl}/api/v1/admin/users/2364/`,
                    { credentials: 'include' }
                );
                if (!res.ok) return;
                const raw = await res.json();
                const u = (raw as any)?.data ?? raw;
                const name = `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim();
                const email = String(u?.email || '').trim();
                const label = name || email;
                if (!cancelled && label) setUser2364Label(`User: ${label}`);
            } catch {
                // ignore
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, []);

  // --- PANEL B LOGIC (New) ---
  const panelBConfig = useMemo(() => {
    const path = location.pathname;

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
    let activeSection: 'work' | 'people' | 'content' | 'organisation' | 'platform' | 'help' = 'work';
    if (path.startsWith('/content') || path.startsWith('/studio')) activeSection = 'content';
    else if (path.startsWith('/permissions') || path.startsWith('/settings')) activeSection = 'organisation';
    else if (['/health', '/flags', '/integration', '/design', '/observability', '/security'].some(prefix => path.startsWith(prefix))) activeSection = 'platform';
    else if (['/docs', '/constitution'].some(prefix => path.startsWith(prefix))) activeSection = 'help';


    // 2. Build Items based on Section & Context
    let title = '';
    let items: { label: string; path: string; icon?: LucideIcon }[] = [];

    switch (activeSection) {
        case 'work':
            // Dashboard or Directory: show overview section in Panel B
            if (path === '/dashboard' || path === '/directory') {
                title = 'Overview';
                items = [
                    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
                    { label: 'Directory', path: '/directory', icon: Folder },
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

        case 'organisation':
            if (isOrgAdmin || isSystemAdmin) {
                title = 'Organisation';
                items = [
                    { label: 'Settings', path: '/permissions', icon: Settings },
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
                ];
            }
            break;

        case 'help':
            // Hidden specifically requested? "Hide or show 2-3 links".
            // We'll hide it for cleanliness if empty, or show minimal.
            title = 'Help';
            items = [
                { label: 'User Guide', path: '/docs', icon: BookOpen },
                { label: 'Constitution', path: '/constitution', icon: Scroll }
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

        const orgSections = new Set(['clubs', 'teams', 'seasons', 'competitions', 'matches', 'users', 'hierarchy']);

        const routeOrg = segs[0] && !reservedRoots.has(segs[0]) ? segs[0] : '';
        const routeSecond = segs[1] || '';
        const isOrgLevelRoute = Boolean(routeOrg) && (!routeSecond || orgSections.has(routeSecond));

        const orgId = String(routeOrg || orgSlug || '').trim();

        // Avoid stale selection on org-level routes by clearing deeper levels.
        const clubId = isOrgLevelRoute ? '' : String(clubSlugOrId || '').trim();
        const teamId = isOrgLevelRoute ? '' : String(teamSlugOrId || '').trim();
        const seasonId = isOrgLevelRoute ? '' : String(seasonSlugOrId || '').trim();
        const competitionId = isOrgLevelRoute ? '' : String(competitionSlugOrId || '').trim();
        const matchKey = isOrgLevelRoute ? '' : String(matchId || '').trim();

        const federationPath = orgId ? `/${orgId}` : '/dashboard';

        // When you're on a federation/org page, you might not have a club/team/etc selected.
        // In that case, these links should NOT fall back to the federation path, otherwise
        // multiple items in Panel A become active at once.
        const directoryPath = '/directory';
        const clubPath = orgId && clubId ? `/${orgId}/${clubId}` : directoryPath;
        const teamPath = orgId && clubId && teamId ? `/${orgId}/${clubId}/${teamId}` : directoryPath;
        const seasonPath = orgId && clubId && teamId && seasonId ? `/${orgId}/${clubId}/${teamId}/${seasonId}` : directoryPath;
        const competitionPath = orgId && clubId && teamId && seasonId && competitionId
            ? `/${orgId}/${clubId}/${teamId}/${seasonId}/${competitionId}`
            : directoryPath;
        const matchPath = orgId && clubId && teamId && seasonId && competitionId && matchKey
            ? `/${orgId}/${clubId}/${teamId}/${seasonId}/${competitionId}/${matchKey}`
            : directoryPath;

        const federationLabel = `Federation${orgId ? `: ${orgId}` : ''}`;
        const clubLabel = `Club${clubName ? `: ${clubName}` : (clubId ? `: ${clubId}` : '')}`;
        const teamLabel = `Team${teamName ? `: ${teamName}` : (teamId ? `: ${teamId}` : '')}`;
        const seasonLabel = `Season${seasonName ? `: ${seasonName}` : (seasonId ? `: ${seasonId}` : '')}`;
        const competitionLabel = `Competition${competitionName ? `: ${competitionName}` : (competitionId ? `: ${competitionId}` : '')}`;
        const matchLabel = `Match${matchKey ? `: ${matchKey}` : ''}`;

        return [
            { label: federationLabel, path: federationPath, icon: Globe, visibility: 'everyone' },
            { label: clubLabel, path: clubPath, icon: Shield, visibility: 'everyone' },
            { label: teamLabel, path: teamPath, icon: Shirt, visibility: 'everyone' },
            { label: seasonLabel, path: seasonPath, icon: CalendarDays, visibility: 'everyone' },
            { label: competitionLabel, path: competitionPath, icon: Trophy, visibility: 'everyone' },
            { label: matchLabel, path: matchPath, icon: Timer, visibility: 'everyone' },
            { label: user2364Label, path: '/users/2364', icon: Users, visibility: 'org_admin' },
        ];
    }, [location.pathname, orgSlug, clubSlugOrId, clubName, teamSlugOrId, teamName, seasonSlugOrId, seasonName, competitionSlugOrId, competitionName, matchId, user2364Label]);

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
        style={{
            zIndex: 20, // Higher than Panel B
            width: isOpen ? 240 : 72,
            backgroundColor: 'var(--sidebar-a-bg)',
            color: 'var(--sidebar-a-text)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.2s ease-in-out',
            flexShrink: 0,
            borderRight: '1px solid var(--sidebar-a-border)'
        }}
      >
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
                <>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                         <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, color: 'var(--app-link)' }}>
                            <AppIcon icon={Command} size={24} />
                        </span>
                        <span style={{ marginLeft: 12, fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--sidebar-a-text)' }}>TeamReel</span>
                    </div>
                    <button
                        onClick={toggle}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--sidebar-a-text)',
                            padding: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.6
                        }}
                    >
                        <span style={{ fontSize: 20 }}>«</span>
                    </button>
                </>
             ) : (
                <button
                    onClick={toggle}
                    title="Expand Sidebar"
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48
                    }}
                >
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, color: 'var(--app-link)' }}>
                            <AppIcon icon={Command} size={24} />
                        </span>
                        <span style={{ fontSize: 14, opacity: 0.7, lineHeight: 1 }}>»</span>
                    </span>
                </button>
             )}
        </div>


        {/* Global Navigation (Panel A) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px', overflowY: 'auto' }}>

            {panelASections.map(section => (
               <div key={section.id} style={{ marginBottom: section.bottom ? 0 : 16 }}>
                    {/* Section Label (Only if open) */}
                    {isOpen && section.title && !section.bottom && (
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
                            style={({ isActive }) => ({
                                height: 40,
                                textDecoration: 'none',
                                padding: isOpen ? '0 12px' : '0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isOpen ? 'flex-start' : 'center',
                                borderRadius: 8,
                                background: isActive ? 'var(--sidebar-a-active-bg)' : 'transparent',
                                color: isActive ? 'var(--sidebar-a-active-text)' : 'var(--sidebar-a-text)',
                            })}
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
                                const effectiveLocationTab = locationTab || 'overview';
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
