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
      competitionSlugOrId, // Add this
      matchId // Add this
  } = useAppSelection();

  // Construct App Context Group dynamically
  const appGroup: NavSection | null = useMemo(() => {
    if (!orgSlug) return null;

    const items: NavItem[] = [];
    // Club Item
    if (clubSlugOrId) {
        items.push({
            label: clubName || 'Club',
            path: `/organisations/${orgSlug}/projects/${clubSlugOrId}`,
            icon: '🏟️',
            visibility: 'everyone'
        });
    }
    // Team Item
    if (clubSlugOrId && teamSlugOrId) {
         items.push({
            label: teamName || 'Team',
            path: `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}`,
            icon: '👕',
            visibility: 'everyone'
        });
    }
    // Season Item
    if (clubSlugOrId && teamSlugOrId && seasonSlugOrId) {
        items.push({
            label: seasonName || 'Season',
            path: `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}`,
            icon: '📅',
            visibility: 'everyone'
        });
    }

    // Members Item (Context Leaf) - Only if active
    if (clubSlugOrId && teamSlugOrId && seasonSlugOrId && !competitionSlugOrId && location.pathname.includes('/members')) {
        items.push({
            label: 'Members',
            path: location.pathname,
            icon: '👥',
            visibility: 'everyone'
        });
    }

    // Competition Item (New)
    if (clubSlugOrId && teamSlugOrId && seasonSlugOrId && competitionSlugOrId) {
        items.push({
            label: 'Competition', // Name resolution usually requires more complex fetching or is less critical here, hardcoded or use ID?
            // Actually useAppSelection might have competitionName, let's just label it 'Competition' for now or update hook to return name
            path: `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}/competitions/${competitionSlugOrId}`,
            icon: '🏆',
            visibility: 'everyone'
        });
    }
    // Match Item (New)
    if (clubSlugOrId && teamSlugOrId && seasonSlugOrId && competitionSlugOrId && matchId) {
        items.push({
            label: 'Match',
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
  }, [orgSlug, clubSlugOrId, clubName, teamSlugOrId, teamName, seasonSlugOrId, seasonName]);


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

      {/* --- PANEL A: PRIMARY SIDEBAR (Wide or Narrow) --- */}
      <aside
        style={{
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
        {/* Logo / Brand Area */}
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

        {/* Primary Items */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px', overflowY: 'auto' }}>

            {/* APP CONTEXT GROUP (Dynamic) - Breadcrumb Style */}
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
                                height: 32, // Compact height
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
                            <span style={{
                                fontSize: 14,
                                minWidth: 24,
                                display: 'flex',
                                justifyContent: 'center',
                                opacity: 0.8
                            }}>{item.icon}</span>
                            {isOpen && (
                                <span style={{
                                    marginLeft: 12,
                                    fontSize: 13, // Slightly smaller text
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    color: 'inherit'
                                }}>
                                    {item.label}
                                </span>
                            )}
                            {/* Connector line simulation for breadcrumb feel (optional) */}
                            {index < (appGroup.items.length - 1) && isOpen && (
                                <div style={{
                                    position: 'absolute',
                                    left: 23,
                                    top: 26, // Below icon
                                    bottom: -10, // Extend down
                                    width: 1,
                                    backgroundColor: '#334155',
                                    zIndex: 0
                                }} />
                            )}
                        </NavLink>
                    ))}
                </div>
            )}

            {/* Render Sections */}
            {visibleSections.filter(g => !g.bottom).map(section => (
                <div key={section.id} style={{ marginBottom: 24 }}> {/* Increased spacing */}
                    {/* Section Title */}
                    {isOpen && section.title && (
                        <div style={{
                            padding: '0 12px',
                            marginBottom: 8,
                            fontSize: 10, // Smaller
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: '#475569', // Lighter Slate-600
                        }}>
                            {section.title}
                        </div>
                    )}
                    {/* Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {section.items.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                title={!isOpen ? item.label : undefined}
                                style={({ isActive }) => ({
                                    height: 40,
                                    textDecoration: 'none',
                                    padding: isOpen ? '0 12px' : '0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: isOpen ? 'flex-start' : 'center',
                                    borderRadius: 8,
                                    color: isActive ? '#fff' : '#94a3b8',
                                    backgroundColor: isActive ? '#334155' : 'transparent', // Darker highlight for nav
                                    transition: 'background-color 0.15s'
                                })}
                            >
                                <span style={{ fontSize: 18, minWidth: 24, display: 'flex', justifyContent: 'center' }}>{item.icon}</span>
                                {isOpen && (
                                    <span style={{ marginLeft: 12, fontSize: 14, fontWeight: 500 }}>
                                        {item.label}
                                    </span>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        {/* Bottom Items (Help, etc) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px', borderTop: '1px solid #1e293b' }}>
             {visibleSections.filter(g => g.bottom).map(section => (
                 <div key={section.id} style={{ opacity: 0.8, transition: 'opacity 0.2s', marginBottom: 8 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}>
                    {isOpen && section.title && (
                        <div style={{
                            padding: '0 12px',
                            marginBottom: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: '#475569'
                        }}>
                            {section.title}
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {section.items.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                title={!isOpen ? item.label : undefined}
                                style={({ isActive }) => ({
                                    height: 36, // Slightly compact
                                    textDecoration: 'none',
                                    padding: isOpen ? '0 12px' : '0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: isOpen ? 'flex-start' : 'center',
                                    borderRadius: 6,
                                    color: isActive ? '#fff' : '#64748b', // Muted text
                                    backgroundColor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                                })}
                            >
                                <span style={{ fontSize: 16, minWidth: 24, display: 'flex', justifyContent: 'center' }}>{item.icon}</span>
                                {isOpen && (
                                    <span style={{ marginLeft: 12, fontSize: 13, fontWeight: 500 }}>
                                        {item.label}
                                    </span>
                                )}
                            </NavLink>
                        ))}
                    </div>
                 </div>
            ))}

            {/* Collapse Toggle */}
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
                    borderRadius: 8,
                    padding: isOpen ? '0 12px' : 0,
                    marginTop: 8
                }}
            >
                 <span style={{ fontSize: 20, minWidth: 24, textAlign: 'center' }}>{isOpen ? '«' : '»'}</span>
                 {isOpen && <span style={{ marginLeft: 12, fontSize: 14 }}>Collapse</span>}
            </button>
        </div>
      </aside>
    </div>
  );
}
