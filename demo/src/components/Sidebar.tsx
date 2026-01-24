import { useMemo } from 'react';
import { NavLink, useLocation, matchPath } from 'react-router-dom';
import { useUserRole } from './PermissionGuards';
import { useAppSelection } from '../hooks/useAppSelection';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
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
      { path: '/dashboard', label: 'Dashboard', icon: '🏠', visibility: 'everyone' }
    ]
  },
  {
    id: 'work',
    title: 'WORK HIERARCHY',
    visibility: 'everyone',
    items: [
      { path: '/directory', label: 'Federations', icon: '🌐', visibility: 'everyone' },
      { path: '/clubs', label: 'Clubs', icon: '🏟️', visibility: 'everyone' },
      { path: '/teams', label: 'Teams', icon: '👕', visibility: 'everyone' },
      { path: '/seasons', label: 'Seasons', icon: '📅', visibility: 'everyone' },
      { path: '/competitions', label: 'Competitions', icon: '🏆', visibility: 'everyone' },
      { path: '/matches', label: 'Matches', icon: '⏱️', visibility: 'everyone' },
    ]
  },
  {
    id: 'people',
    title: 'PEOPLE',
    visibility: 'everyone',
    items: [
      { path: '/users', label: 'Users', icon: '👥', visibility: 'everyone' },
    ]
  },
  {
    id: 'content',
    title: 'CONTENT',
    visibility: 'everyone',
    items: [
      { path: '/content', label: 'Library', icon: '📂', visibility: 'everyone' },
      { path: '/studio', label: 'AI Studio', icon: '✨', visibility: 'everyone' },
    ]
  },
  {
    id: 'organisation',
    title: 'ORGANISATION',
    visibility: 'org_admin',
    items: [
      { path: '/permissions', label: 'Settings', icon: '⚙️', visibility: 'org_admin' },
    ]
  },
  {
    id: 'platform',
    title: 'PLATFORM',
    visibility: 'staff',
    items: [
      { path: '/health', label: 'Health', icon: '❤️', visibility: 'staff' },
      { path: '/flags', label: 'Feature Flags', icon: '🚩', visibility: 'staff' },
      { path: '/integration-status', label: 'Integration', icon: '🔄', visibility: 'staff' },
      { path: '/design-system', label: 'Design System', icon: '🎨', visibility: 'staff' },
      { path: '/observability', label: 'Observability', icon: '📊', visibility: 'staff' },
      { path: '/security', label: 'Security', icon: '🛡️', visibility: 'staff' },
    ]
  },
  {
    id: 'help',
    title: 'HELP',
    visibility: 'everyone',
    bottom: true,
    items: [
      { path: '/docs', label: 'User Guide', icon: '📖', visibility: 'everyone' },
      { path: '/constitution', label: 'Constitution', icon: '📜', visibility: 'everyone' },
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

    // 1. Determine Active Section
    let activeSection: 'work' | 'people' | 'content' | 'organisation' | 'platform' | 'help' = 'work';
    if (path.startsWith('/users')) activeSection = 'people';
    else if (path.startsWith('/content') || path.startsWith('/studio')) activeSection = 'content';
    else if (path.startsWith('/permissions') || path.startsWith('/settings')) activeSection = 'organisation';
    else if (['/health', '/flags', '/integration', '/design', '/observability', '/security'].some(prefix => path.startsWith(prefix))) activeSection = 'platform';
    else if (['/docs', '/constitution'].some(prefix => path.startsWith(prefix))) activeSection = 'help';


    // 2. Build Items based on Section & Context
    let title = '';
    let items: { label: string; path: string; icon?: string }[] = [];

    switch (activeSection) {
        case 'work':
            // Hierarchy Context Logic
            if (matchId) {
                title = 'Match Actions';
                items.push({ label: 'Overview', path: location.pathname, icon: '📊' });
                // Add relevant Match actions if available as routes
            } else if (competitionSlugOrId && seasonSlugOrId && teamSlugOrId && clubSlugOrId && orgSlug) {
                 title = 'Competition Actions';
                 const baseUrl = `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}/competitions/${competitionSlugOrId}`;
                 items.push({ label: 'Overview', path: baseUrl, icon: '📊' });
                 items.push({ label: 'Matches', path: `${baseUrl}/matches`, icon: '⏱️' });
            } else if (competitionSlugOrId && seasonSlugOrId && !teamSlugOrId && orgSlug) {
                 // Club/Project Competition Context
                 title = 'Competition Actions';
            } else if (seasonSlugOrId && teamSlugOrId && clubSlugOrId && orgSlug) {
                title = 'Season Actions';
                const baseUrl = `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}`;
                items.push({ label: 'Overview', path: baseUrl, icon: '📊' });
                items.push({ label: 'Squad', path: `${baseUrl}/squad`, icon: '👥' });
            } else if (teamSlugOrId && clubSlugOrId && orgSlug) {
                title = 'Team Actions';
                const baseUrl = `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}`;
                items.push({ label: 'Overview', path: baseUrl, icon: '📊' });
                items.push({ label: 'Seasons', path: `${baseUrl}/seasons`, icon: '📅' });
            } else {
                 // Browse Mode (Default) - Minimal shortcuts only
                 title = 'Browse';
                 // Panel A already has the full list. Show only most common shortcuts here.
                 items = [
                    { label: 'Teams', path: '/teams', icon: '👕' },
                    { label: 'Matches', path: '/matches', icon: '⏱️' },
                 ];
            }
            break;

        case 'content':
            title = 'Content';
            items = [
                { label: 'Library', path: '/content', icon: '📂' },
                { label: 'AI Studio', path: '/studio', icon: '✨' },
            ];
            break;

        case 'people':
             title = 'People';
             items = [
                 { label: 'All Users', path: '/users', icon: '👥' },
             ];
             break;

        case 'organisation':
            if (isOrgAdmin || isSystemAdmin) {
                title = 'Organisation';
                items = [
                    { label: 'Settings', path: '/permissions', icon: '⚙️' },
                ];
            }
            break;

        case 'platform':
            if (isStaff) {
                title = 'Platform';
                items = [
                    { label: 'Health', path: '/health', icon: '❤️' },
                    { label: 'Features', path: '/flags', icon: '🚩' },
                    { label: 'Integration', path: '/integration-status', icon: '🔄' },
                    { label: 'Observability', path: '/observability', icon: '📊' },
                ];
            }
            break;

        case 'help':
            // Hidden specifically requested? "Hide or show 2-3 links".
            // We'll hide it for cleanliness if empty, or show minimal.
            title = 'Help';
            items = [
                { label: 'User Guide', path: '/docs', icon: '📖' },
                { label: 'Constitution', path: '/constitution', icon: '📜' }
            ];
            break;
    }

    if (items.length === 0) return null;

    return { title, items, isActive: true };
  }, [location.pathname, orgSlug, clubSlugOrId, teamSlugOrId, seasonSlugOrId, competitionSlugOrId, matchId, teamName, seasonName, competitionName, isOrgAdmin, isSystemAdmin, isStaff]);




  // Construct App Context Group dynamically for Panel A
  const appGroup: NavSection | null = useMemo(() => {
    // Only show Context in Panel A if we have valid context
    // This restores the "Where I am" block
    if (!orgSlug) return null;

    const items: NavItem[] = [];
    if (clubSlugOrId) {
        items.push({
            label: clubName || 'Club',
            path: `/organisations/${orgSlug}/projects/${clubSlugOrId}`,
            icon: '🏟️',
            visibility: 'everyone'
        });
    }
    if (clubSlugOrId && teamSlugOrId) {
         items.push({
            label: teamName || 'Team',
            path: `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}`,
            icon: '👕',
            visibility: 'everyone'
        });
    }
    if (clubSlugOrId && teamSlugOrId && seasonSlugOrId) {
        items.push({
            label: seasonName || 'Season',
            path: `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}`,
            icon: '📅',
            visibility: 'everyone'
        });
    }
    // Hierarchy continues...
    if (clubSlugOrId && teamSlugOrId && seasonSlugOrId && competitionSlugOrId) {
        items.push({
            label: competitionName || 'Competition',
            path: `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}/competitions/${competitionSlugOrId}`,
            icon: '🏆',
            visibility: 'everyone'
        });
    }
    if (clubSlugOrId && teamSlugOrId && seasonSlugOrId && competitionSlugOrId && matchId) {
        items.push({
            label: 'Match', // Match name?
            path: `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}/competitions/${competitionSlugOrId}/matches/${matchId}`,
            icon: '⏱️',
            visibility: 'everyone'
        });
    }

    if (items.length === 0) return null;

    return {
        id: 'app-context',
        title: 'Context',
        visibility: 'everyone',
        items
    };
  }, [orgSlug, clubSlugOrId, clubName, teamSlugOrId, teamName, seasonSlugOrId, seasonName, competitionSlugOrId, competitionName, matchId]);


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


  return (
    <div style={{ display: 'flex', height: '100%', zIndex: 90, flexShrink: 0 }}>


      {/* --- PANEL A: PRIMARY SIDEBAR (Narrow Only but Expandable) --- */}
      {/* Note: We keep the existing width toggle for Panel A logic but Panel B sits next to it.
          Use a simpler visual for Panel B: Light/Gray background. */}

      <aside
        style={{
            zIndex: 20, // Higher than Panel B
            width: isOpen ? 240 : 72,
            backgroundColor: '#0f172a', // Dark primary
            color: '#f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.2s ease-in-out',
            flexShrink: 0,
            borderRight: '1px solid #1e293b'
        }}
      >
        {/* LOGO AREA */}
        <div style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: isOpen ? 'flex-start' : 'center',
            padding: isOpen ? '0 20px' : '0 0',
            borderBottom: '1px solid #1e293b',
            marginBottom: 16
        }}>
            <span style={{ fontSize: 24 }}>🦁</span>
            {isOpen && <span style={{ marginLeft: 12, fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>TeamReel</span>}
        </div>


        {/* Global Navigation (Panel A) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px', overflowY: 'auto' }}>

            {/* APP CONTEXT GROUP - "Where I am" (Restored) */}
            {appGroup && appGroup.items.length > 0 && (
                <div style={{ paddingBottom: 8, marginBottom: 8, borderBottom: '1px dashed #334155' }}>
                    {appGroup.items.map((item, index) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            title={!isOpen ? item.label : undefined}
                            className={({ isActive }) =>
                                `flex items-center rounded-md transition-colors ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`
                            }
                            style={({ isActive }) => ({
                                height: 32, // Compact
                                textDecoration: 'none',
                                padding: isOpen ? '0 12px' : '0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isOpen ? 'flex-start' : 'center',
                                borderRadius: 4,
                                position: 'relative',
                                background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                            })}
                        >
                            <span style={{ fontSize: 14, minWidth: 24, display: 'flex', justifyContent: 'center', opacity: 0.8 }}>{item.icon}</span>
                            {isOpen && (
                                <span style={{ marginLeft: 12, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.label}
                                </span>
                            )}
                            {/* Connector line simulation */}
                            {index < (appGroup.items.length - 1) && isOpen && (
                                <div style={{ position: 'absolute', left: 23, top: 26, bottom: -10, width: 1, backgroundColor: '#334155', zIndex: 0 }} />
                            )}
                        </NavLink>
                    ))}
                </div>
            )}

            {visibleSections.map(section => (
               <div key={section.id} style={{ marginBottom: section.bottom ? 0 : 16 }}>
                    {/* Section Label (Only if open) */}
                    {isOpen && section.title && !section.bottom && (
                        <div style={{ padding: '0 12px', marginBottom: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.5 }}>
                            {section.title}
                        </div>
                    )}

                    {section.items.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            title={!isOpen ? item.label : undefined}
                            className={({ isActive }) =>
                                `flex items-center rounded-md transition-colors ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`
                            }
                            style={({ isActive }) => ({
                                height: 40,
                                textDecoration: 'none',
                                padding: isOpen ? '0 12px' : '0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isOpen ? 'flex-start' : 'center',
                                borderRadius: 8,
                                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                            })}
                        >
                            <span style={{ fontSize: 18, minWidth: 24, display: 'flex', justifyContent: 'center' }}>{item.icon}</span>
                            {isOpen && <span style={{ marginLeft: 12, fontSize: 14, fontWeight: 500 }}>{item.label}</span>}
                        </NavLink>
                    ))}
               </div>
            ))}
        </div>

        {/* Collapse Toggle */}
        <div style={{ padding: 12, borderTop: '1px solid #1e293b' }}>
            <button
                onClick={toggle}
                className="hover:bg-slate-800"
                style={{
                    height: 40,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isOpen ? 'flex-start' : 'center',
                    border: 'none',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    borderRadius: 8
                }}
            >
                 <span style={{ fontSize: 20 }}>{isOpen ? '«' : '»'}</span>
            </button>
        </div>
      </aside>

      {/* --- PANEL B: SECONDARY CONTEXT SIDEBAR --- */}
      {panelBConfig && (
        <aside
            style={{
                width: 220, // Fixed width for panel B
                backgroundColor: '#f8fafc', // Light
                borderRight: '1px solid #e2e8f0',
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
                borderBottom: '1px solid #e2e8f0',
                fontWeight: 600,
                fontSize: 14,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
            }}>
                {panelBConfig.title}
            </div>

            {/* Items */}
            <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {panelBConfig.items.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderRadius: 6,
                            textDecoration: 'none',
                            fontSize: 14,
                            color: isActive ? '#0f172a' : '#64748b',
                            backgroundColor: isActive ? '#e2e8f0' : 'transparent',
                            fontWeight: isActive ? 600 : 400
                        })}
                    >
                        <span style={{ marginRight: 10, fontSize: 16 }}>{item.icon}</span>
                        {item.label}
                    </NavLink>
                ))}
            </div>
        </aside>
      )}


    </div>
  );
}
