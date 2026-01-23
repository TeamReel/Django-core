import { useMemo } from 'react';
import { NavLink, useLocation, matchPath } from 'react-router-dom';
import { useUserRole } from './PermissionGuards';

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

  // Show Secondary Sidebar if the active group has children
  const showSecondary = activeGroup && activeGroup.items.length > 0;

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
