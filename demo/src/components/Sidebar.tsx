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

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  path?: string; // Default path if clicked
  visibility: 'everyone' | 'org_admin' | 'staff';
  items: NavItem[]; // Secondary items
  bottom?: boolean;
}

const NAV_CONFIG: NavGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '🏠',
    path: '/dashboard',
    visibility: 'everyone',
    items: []
  },
  {
    id: 'work',
    label: 'Work',
    icon: '⚽',
    visibility: 'everyone',
    items: [
      { path: '/directory', label: 'Federations', icon: '🌐', visibility: 'everyone' },
      { path: '/matches', label: 'Matches', icon: '⏱️', visibility: 'everyone' },
      { path: '/competitions', label: 'Competitions', icon: '🏆', visibility: 'everyone' },
      { path: '/seasons', label: 'Seasons', icon: '📅', visibility: 'everyone' },
      { path: '/clubs', label: 'Clubs', icon: '🏟️', visibility: 'everyone' },
      { path: '/teams', label: 'Teams', icon: '👕', visibility: 'everyone' },
    ]
  },
  {
    id: 'content',
    label: 'Content',
    icon: '📚',
    visibility: 'everyone',
    items: [
      { path: '/content', label: 'Library', icon: '📂', visibility: 'everyone' },
      { path: '/studio', label: 'AI Studio', icon: '✨', visibility: 'everyone' },
    ]
  },
  {
    id: 'organisation',
    label: 'Organisation',
    icon: '🏢',
    visibility: 'org_admin',
    items: [
      { path: '/users', label: 'Members', icon: '👥', visibility: 'org_admin' },
      { path: '/permissions', label: 'Settings', icon: '⚙️', visibility: 'org_admin' },
    ]
  },
  {
    id: 'platform',
    label: 'Platform',
    icon: '🛠️',
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
    label: 'Help',
    icon: '❓',
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
      seasonSlugOrId, seasonName
  } = useAppSelection();

  // Construct App Context Group dynamically
  const appGroup: NavGroup | null = useMemo(() => {
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

    if (items.length === 0) return null;

    return {
        id: 'app-context',
        label: 'Context', // Label often hidden in primary rail unless collapsed?
        icon: '📍',
        visibility: 'everyone',
        items
    };
  }, [orgSlug, clubSlugOrId, clubName, teamSlugOrId, teamName, seasonSlugOrId, seasonName]);


  // Filter groups and items based on permissions
  const visibleGroups = useMemo(() => {
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
    }).filter((g): g is NavGroup => g !== null);
  }, [isOrgAdmin, isStaff, isSystemAdmin]);

  // Determine ACTIVE Primary Group
  // Logic: Is current path equal to Group Path OR does it match any Child Item path?
  const activeGroup = visibleGroups.find(group => {
    if (group.path && matchPath({ path: group.path, end: false }, location.pathname)) {
        return true;
    }
    return group.items.some(item => matchPath({ path: item.path, end: false }, location.pathname));
  });

  // Check if active group is the App Group
  const isAppGroupActive = appGroup?.items.some(item => matchPath({ path: item.path, end: false }, location.pathname));

  // Show Secondary Sidebar if the active group has children
  const showSecondary = (activeGroup && activeGroup.items.length > 0) || false; // Note: App Group doesn't trigger Secondary Panel in this design, or does it?
  // User asked for "Panel A... categories". If App items are in Panel A, they are just items.
  // If clicked, do they open a secondary panel?
  // For now, let's assume App items are direct links in Panel A for quick access.

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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px' }}>

            {/* APP CONTEXT GROUP */}
            {appGroup && appGroup.items.length > 0 && (
                <>
                    {/* Render App Items directly in Panel A */}
                    {appGroup.items.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            title={!isOpen ? item.label : undefined}
                            className={({ isActive }) =>
                                `flex items-center rounded-md transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
                            }
                            style={{
                                height: 44,
                                textDecoration: 'none',
                                padding: isOpen ? '0 12px' : '0',
                                justifyContent: isOpen ? 'flex-start' : 'center',
                            }}
                        >
                            <span style={{ fontSize: 20, minWidth: 24, display: 'flex', justifyContent: 'center' }}>{item.icon}</span>
                            {isOpen && (
                                <span style={{ marginLeft: 12, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.label}
                                </span>
                            )}
                        </NavLink>
                    ))}
                    {/* Divider */}
                    <div style={{ height: 1, backgroundColor: '#334155', margin: '8px 0' }} />
                </>
            )}

            {visibleGroups.filter(g => !g.bottom).map(group => (
                <PrimaryItem
                    key={group.id}
                    group={group}
                    isActive={activeGroup?.id === group.id}
                    isOpen={isOpen}
                />
            ))}
        </div>

        {/* Bottom Items (Help, etc) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px 12px' }}>
             {visibleGroups.filter(g => g.bottom).map(group => (
                <PrimaryItem
                    key={group.id}
                    group={group}
                    isActive={activeGroup?.id === group.id}
                    isOpen={isOpen}
                />
            ))}

            {/* Collapse Toggle */}
            <button
                onClick={toggle}
                className="hover:bg-slate-800"
                style={{
                    height: 48,
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

      {/* --- PANEL B: SECONDARY SIDEBAR (Contextual) --- */}
      {showSecondary && (
         <aside
            style={{
                width: 260, // Fixed wide width
                backgroundColor: 'var(--app-surface-1)',
                borderRight: '1px solid var(--app-border)',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                flexShrink: 0,
            }}
         >
             {/* Secondary Header */}
             <div style={{
                 height: 64,
                 display: 'flex',
                 alignItems: 'center',
                 padding: '0 24px',
                 borderBottom: '1px solid var(--app-border)',
                 fontWeight: 600,
                 fontSize: 16,
                 color: 'var(--app-text)'
             }}>
                 {activeGroup?.label}
             </div>

             {/* Secondary Items List */}
             <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '16px' }}>
                 {activeGroup?.items.map(item => (
                     <NavLink
                        key={item.path}
                        to={item.path}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px 12px',
                            borderRadius: 6,
                            textDecoration: 'none',
                            color: isActive ? 'var(--app-primary)' : 'var(--app-text)',
                            backgroundColor: isActive ? 'var(--app-primary-subtle)' : 'transparent',
                            fontSize: 14,
                            fontWeight: isActive ? 500 : 400,
                        })}
                     >
                        {({ isActive }) => (
                            <>
                                <span style={{ fontSize: 18, marginRight: 12, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                                {item.label}
                            </>
                        )}
                     </NavLink>
                 ))}
             </div>
         </aside>
      )}
    </div>
  );
}

// Component for Panel A items
function PrimaryItem({ group, isActive, isOpen }: { group: NavGroup, isActive: boolean, isOpen: boolean }) {
    // Navigate to group path OR first child
    const targetPath = group.path || (group.items.length > 0 ? group.items[0].path : '/');

    return (
        <NavLink
            to={targetPath}
            title={!isOpen ? group.label : undefined}
            style={{
                display: 'flex',
                alignItems: 'center',
                height: 48,
                padding: isOpen ? '0 12px' : '0 0',
                justifyContent: isOpen ? 'flex-start' : 'center',
                borderRadius: 8,
                textDecoration: 'none',
                color: isActive ? '#fff' : '#94a3b8',
                backgroundColor: isActive ? 'var(--app-primary)' : 'transparent',
                transition: 'all 0.2s',
            }}
            className={isActive ? 'bg-primary' : 'hover:bg-slate-800'}
        >
            <span style={{ fontSize: 20, minWidth: 24, textAlign: 'center' }}>{group.icon}</span>
            {isOpen && <span style={{ marginLeft: 12, fontWeight: 500, fontSize: 14 }}>{group.label}</span>}
        </NavLink>
    );
}
