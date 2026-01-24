import { useMemo } from 'react';
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
  const {
      orgSlug,
      clubSlugOrId, clubName,
      teamSlugOrId, teamName,
      seasonSlugOrId, seasonName,
      competitionSlugOrId, competitionName,
      matchId
  } = useAppSelection();

  // --- PANEL B LOGIC (New) ---
  const panelBConfig = useMemo(() => {
    const path = location.pathname;

        const makeTabUrl = (baseUrl: string, tab: string) => {
            const t = String(tab || '').trim().toLowerCase();
            if (!t || t === 'overview') return baseUrl;
            return `${baseUrl}?tab=${encodeURIComponent(t)}`;
        };

        // Org-context pages (federation subpages). These must be detected BEFORE
        // club/team vanity route matching, because e.g. `/organisations/:orgId/clubs`
        // would otherwise look like a club detail route with projectId="clubs".
        const orgClubsMatch = matchPath({ path: '/organisations/:orgId/clubs', end: true }, path);
        const orgTeamsMatch = matchPath({ path: '/organisations/:orgId/teams', end: true }, path);
        const orgSeasonsMatch = matchPath({ path: '/organisations/:orgId/seasons', end: true }, path);
        const orgCompetitionsMatch = matchPath({ path: '/organisations/:orgId/competitions', end: true }, path);
        const orgMatchesMatch = matchPath({ path: '/organisations/:orgId/matches', end: true }, path);
        const orgUsersMatch = matchPath({ path: '/organisations/:orgId/users', end: true }, path);

        // Detect TeamReel vanity + /organisations routes so Panel B is driven by the actual page.
        const teamDetailMatch =
            matchPath({ path: '/organisations/:orgId/:clubId/:projectId', end: true }, path) ||
            matchPath({ path: '/:orgId/:clubId/:projectId', end: true }, path);

        const clubDetailMatch =
            matchPath({ path: '/organisations/:orgId/:projectId', end: true }, path) ||
            matchPath({ path: '/:orgId/:projectId', end: true }, path);

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
                const baseUrl = `/${orgId}`;
                items = [
                    { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
                    { label: 'Clubs', path: makeTabUrl(baseUrl, 'clubs'), icon: Shield },
                    { label: 'Teams', path: makeTabUrl(baseUrl, 'teams'), icon: Shirt },
                    { label: 'Seasons', path: makeTabUrl(baseUrl, 'seasons'), icon: CalendarDays },
                    { label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy },
                    { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
                    { label: 'Users', path: makeTabUrl(baseUrl, 'users'), icon: Users },
                ];
                break;
            }

            // Federation detail route: Panel B must be driven by the *current route*.
            // Without this guard, async `useAppSelection` hydration can set a prior club/team
            // selection and cause Panel B to flip to "Team Actions" (Overview/Seasons) after load.
            if (orgDetailMatch && !clubDetailMatch && !teamDetailMatch) {
                const orgId = String((orgDetailMatch?.params as any)?.orgId || (orgDetailMatch?.params as any)?.id || '').trim();
                if (orgId) {
                    title = 'Federation';
                    const baseUrl = `/${orgId}`;
                    items = [
                        { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
                        { label: 'Clubs', path: makeTabUrl(baseUrl, 'clubs'), icon: Shield },
                        { label: 'Teams', path: makeTabUrl(baseUrl, 'teams'), icon: Shirt },
                        { label: 'Seasons', path: makeTabUrl(baseUrl, 'seasons'), icon: CalendarDays },
                        { label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy },
                        { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
                        { label: 'Users', path: makeTabUrl(baseUrl, 'users'), icon: Users },
                    ];
                    break;
                }
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
                    { label: 'People', path: makeTabUrl(baseUrl, 'people'), icon: Users },
                    { label: 'Seasons', path: makeTabUrl(baseUrl, 'seasons'), icon: CalendarDays },
                    { label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy },
                    { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
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
                    { label: 'People', path: makeTabUrl(baseUrl, 'people'), icon: Users },
                    { label: 'Teams', path: makeTabUrl(baseUrl, 'teams'), icon: Shirt },
                    { label: 'Seasons', path: makeTabUrl(baseUrl, 'seasons'), icon: CalendarDays },
                    { label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy },
                    { label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer },
                    { label: 'Balance', path: makeTabUrl(baseUrl, 'balance'), icon: LineChart },
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
                const baseUrl = `/${orgId}`;
                items.push({ label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard });
                items.push({ label: 'Clubs', path: makeTabUrl(baseUrl, 'clubs'), icon: Shield });
                items.push({ label: 'Teams', path: makeTabUrl(baseUrl, 'teams'), icon: Shirt });
                items.push({ label: 'Seasons', path: makeTabUrl(baseUrl, 'seasons'), icon: CalendarDays });
                items.push({ label: 'Competitions', path: makeTabUrl(baseUrl, 'competitions'), icon: Trophy });
                items.push({ label: 'Matches', path: makeTabUrl(baseUrl, 'matches'), icon: Timer });
                items.push({ label: 'Users', path: makeTabUrl(baseUrl, 'users'), icon: Users });
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
                    { label: 'Users', path: '/users', icon: Users },
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

        const orgId = String(orgSlug || '').trim();
        const clubId = String(clubSlugOrId || '').trim();
        const teamId = String(teamSlugOrId || '').trim();
        const seasonId = String(seasonSlugOrId || '').trim();
        const competitionId = String(competitionSlugOrId || '').trim();
        const matchKey = String(matchId || '').trim();

        const federationPath = orgId ? `/${orgId}` : '/dashboard';
        const clubPath = orgId && clubId ? `/${orgId}/${clubId}` : federationPath;
        const teamPath = orgId && clubId && teamId ? `/${orgId}/${clubId}/${teamId}` : clubPath;
        const seasonPath = orgId && clubId && teamId && seasonId ? `/${orgId}/${clubId}/${teamId}/${seasonId}` : teamPath;
        const competitionPath = orgId && clubId && teamId && seasonId && competitionId
            ? `/${orgId}/${clubId}/${teamId}/${seasonId}/${competitionId}`
            : seasonPath;
        const matchPath = orgId && clubId && teamId && seasonId && competitionId && matchKey
            ? `/${orgId}/${clubId}/${teamId}/${seasonId}/${competitionId}/${matchKey}`
            : '/matches';

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
        ];
    }, [orgSlug, clubSlugOrId, clubName, teamSlugOrId, teamName, seasonSlugOrId, seasonName, competitionSlugOrId, competitionName, matchId]);

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
        </aside>
      )}


    </div>
  );
}
