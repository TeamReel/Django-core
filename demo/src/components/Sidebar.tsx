import { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useUserRole } from './PermissionGuards';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  bottom?: boolean; // Pinned to bottom?
  restricted?: boolean; // Staff only section?
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
  visibility: 'everyone' | 'org_admin' | 'staff';
}

const NAV_CONFIG: NavGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: '🏠', visibility: 'everyone' },
      { path: '/directory', label: 'Directory', icon: '📂', visibility: 'everyone' },
    ]
  },
  {
    id: 'work',
    label: 'Work',
    items: [
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
    items: [
      { path: '/content', label: 'Library', icon: '📚', visibility: 'everyone' },
      { path: '/studio', label: 'AI Studio', icon: '✨', visibility: 'everyone' },
    ]
  },
  {
    id: 'organisation',
    label: 'Organisation',
    items: [
      { path: '/users', label: 'Members', icon: '👥', visibility: 'org_admin' },
      { path: '/permissions', label: 'Settings', icon: '⚙️', visibility: 'org_admin' },
    ]
  },
  {
    id: 'platform',
    label: 'Platform',
    restricted: true,
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

  const isStaff = isSystemAdmin || isLandAdmin; // Define strict staff role

  const visibleGroups = useMemo(() => {
    return NAV_CONFIG.map(group => {
      // Filter items based on visibility
      const textItems = group.items.filter(item => {
        if (item.visibility === 'everyone') return true;
        if (item.visibility === 'org_admin') return isOrgAdmin || isSystemAdmin;
        if (item.visibility === 'staff') return isStaff;
        return false;
      });

      return { ...group, items: textItems };
    }).filter(group => group.items.length > 0); // Remove empty groups
  }, [isOrgAdmin, isStaff]);

  return (
    <aside
      style={{
        width: isOpen ? 240 : 64,
        transition: 'width 0.2s ease-in-out',
        backgroundColor: 'var(--app-surface-1)',
        borderRight: '1px solid var(--app-border)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        height: '100%',
        zIndex: 90
      }}
    >
      {/* Collapse Toggle */}
      <div
        onClick={toggle}
        role="button"
        style={{
          height: 48,
          borderBottom: '1px solid var(--app-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isOpen ? 'flex-end' : 'center',
          padding: isOpen ? '0 16px' : 0,
          cursor: 'pointer',
          color: 'var(--app-text-muted)'
        }}
      >
        {isOpen ? '«' : '»'}
      </div>

      <div style={{ flex: 1, padding: '12px 0' }}>
        {visibleGroups.map(group => (
          !group.bottom && (
            <div key={group.id} style={{ marginBottom: 16 }}>
              {isOpen && (
                <div style={{
                  padding: '0 16px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: group.restricted ? '#dc2626' : 'var(--app-text-muted)',
                  letterSpacing: '0.05em'
                }}>
                  {group.label}
                </div>
              )}
              {group.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    height: 40,
                    padding: isOpen ? '0 16px' : '0',
                    justifyContent: isOpen ? 'flex-start' : 'center',
                    color: isActive ? 'var(--app-primary)' : 'var(--app-text)',
                    backgroundColor: isActive ? 'var(--app-primary-subtle)' : 'transparent',
                    textDecoration: 'none',
                    fontSize: 14,
                    borderLeft: isActive ? '3px solid var(--app-primary)' : '3px solid transparent'
                  })}
                  title={!isOpen ? item.label : undefined}
                >
                  <span style={{ fontSize: 18, minWidth: 24, textAlign: 'center' }}>{item.icon}</span>
                  {isOpen && <span style={{ marginLeft: 12, whiteSpace: 'nowrap' }}>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          )
        ))}
      </div>

      {/* Bottom Section (Help, User, etc) */}
      <div style={{ borderTop: '1px solid var(--app-border)', padding: '12px 0' }}>
         {visibleGroups.filter(g => g.bottom).map(group => (
            <div key={group.id}>
              {group.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    height: 40,
                    padding: isOpen ? '0 16px' : '0',
                    justifyContent: isOpen ? 'flex-start' : 'center',
                    color: isActive ? 'var(--app-primary)' : 'var(--app-text)',
                    backgroundColor: isActive ? 'var(--app-primary-subtle)' : 'transparent',
                    textDecoration: 'none',
                    fontSize: 14,
                    borderLeft: isActive ? '3px solid var(--app-primary)' : '3px solid transparent'
                  })}
                  title={!isOpen ? item.label : undefined}
                >
                   <span style={{ fontSize: 18, minWidth: 24, textAlign: 'center' }}>{item.icon}</span>
                   {isOpen && <span style={{ marginLeft: 12, whiteSpace: 'nowrap' }}>{item.label}</span>}
                </NavLink>
              ))}
            </div>
         ))}
      </div>
    </aside>
  );
}
