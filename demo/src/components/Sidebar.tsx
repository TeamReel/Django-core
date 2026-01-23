import { useMemo } from 'react';
import { NavLink, useLocation, matchPath } from 'react-router-dom';
import { useUserRole } from './PermissionGuards';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
}

interface NavItem {
  path: string; // The link target
  label: string;
  icon: string;
  visibility: 'everyone' | 'org_admin' | 'staff';
  matchPaths?: string[]; // Optional: extra paths that trigger active state
}

interface NavGroup {
  id: string; // Unique ID
  label: string; // Label for the primary icon or section
  icon: string; // Icon for the primary column
  path?: string; // If the group itself is a link (e.g. Dashboard)
  visibility: 'everyone' | 'org_admin' | 'staff';
  items: NavItem[]; // Children (rendered in secondary column)
  bottom?: boolean;
}

const NAV_CONFIG: NavGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '🏠',
    path: '/dashboard',
    visibility: 'everyone',
    items: [] // No children
  },
  {
    id: 'directory',
    label: 'Directory',
    icon: '📂',
    visibility: 'everyone',
    items: [
      { path: '/directory', label: 'Federations', icon: '🌐', visibility: 'everyone' },
      { path: '/matches', label: 'Matches', icon: '⚽', visibility: 'everyone' },
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
      { path: '/content', label: 'Library', icon: '📚', visibility: 'everyone' },
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

  const getFilteredGroups = (config: NavGroup[]) => {
    return config.map(group => {
      // Check group visibility
      const isGroupVisible =
        group.visibility === 'everyone' ||
        (group.visibility === 'org_admin' && (isOrgAdmin || isSystemAdmin)) ||
        (group.visibility === 'staff' && isStaff);

      if (!isGroupVisible) return null;

      // Filter children
      const visibleItems = group.items.filter(item => {
         if (item.visibility === 'everyone') return true;
         if (item.visibility === 'org_admin') return isOrgAdmin || isSystemAdmin;
         if (item.visibility === 'staff') return isStaff;
         return false;
      });

      return { ...group, items: visibleItems };
    }).filter((g): g is NavGroup => g !== null);
  };

  const visibleGroups = useMemo(() => getFilteredGroups(NAV_CONFIG), [isOrgAdmin, isStaff]);

  // Determine active parent group
  const activeGroup = visibleGroups.find(group => {
    // If exact path match (e.g., Dashboard)
    if (group.path && matchPath({ path: group.path, end: false }, location.pathname)) {
        return true;
    }
    // If any child matches
    return group.items.some(item => matchPath({ path: item.path, end: false }, location.pathname));
  });

  const showSecondary = activeGroup && activeGroup.items.length > 0 && isOpen;

  return (
    <div style={{ display: 'flex', height: '100%', zIndex: 90 }}>
      {/* Primary Sidebar (Icons) */}
      <aside
        style={{
          width: 72, // Fixed width for primary icons
          backgroundColor: '#0f172a', // Dark slate (ImageKit style)
          color: '#f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {visibleGroups.filter(g => !g.bottom).map(group => (
                <PrimaryIcon
                    key={group.id}
                    group={group}
                    isActive={activeGroup?.id === group.id}
                />
            ))}
        </div>

        {/* Bottom items */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingBottom: 16 }}>
             {visibleGroups.filter(g => g.bottom).map(group => (
                <PrimaryIcon
                    key={group.id}
                    group={group}
                    isActive={activeGroup?.id === group.id}
                />
            ))}
        </div>

        {/* Toggle (Collapse Secondary) - optional, repurposed */}
        <div
            onClick={toggle}
            style={{
                height: 40, width: '100%',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.1)'
            }}
        >
             {isOpen ? '«' : '»'}
        </div>
      </aside>

      {/* Secondary Sidebar (Context Menu) */}
      {showSecondary && (
         <aside
            style={{
                width: 240,
                backgroundColor: 'var(--app-surface-1)',
                borderRight: '1px solid var(--app-border)',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto'
            }}
         >
             <div style={{ padding: '24px 16px 16px', fontWeight: 600, fontSize: '1.1rem' }}>
                 {activeGroup?.label}
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px' }}>
                 {activeGroup?.items.map(item => (
                     <NavLink
                        key={item.path}
                        to={item.path}
                        style={({ isActive }) => ({
                            padding: '10px 12px',
                            borderRadius: 6,
                            textDecoration: 'none',
                            color: isActive ? 'var(--app-primary)' : 'var(--app-text)',
                            backgroundColor: isActive ? 'var(--app-primary-subtle)' : 'transparent',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10
                        })}
                     >
                         <span style={{ fontSize: '1.1em' }} >{item.icon}</span>
                         {item.label}
                     </NavLink>
                 ))}
             </div>
         </aside>
      )}
    </div>
  );
}

function PrimaryIcon({ group, isActive }: { group: NavGroup, isActive: boolean }) {
    // If group has path, use NavLink, else just a button that might need to trigger something
    // Actually, usually primary icons link to the first child or the path
    const targetPath = group.path || (group.items.length > 0 ? group.items[0].path : '/');

    return (
        <NavLink
            to={targetPath}
            title={group.label}
            style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                textDecoration: 'none',
                color: isActive ? '#fff' : '#94a3b8',
                backgroundColor: isActive ? 'var(--app-primary)' : 'transparent',
                transition: 'all 0.2s',
                fontSize: 24
            }}
        >
            {group.icon}
        </NavLink>
    );
}

// Old code omitted for cleanliness
