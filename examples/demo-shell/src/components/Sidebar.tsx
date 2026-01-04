import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, Button } from '@django-core/design-system';
import { useAuth } from '@django-core/auth-ui';
import { useUserRole } from './PermissionGuards';

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

interface NavItem {
  path: string;
  label: string;
  icon?: string;
}

const navGroups: NavGroup[] = [
  {
    id: 'identity',
    label: 'Identity & Context',
    items: [
      { path: '/organisations', label: 'Organisations', icon: '🏢' },
      { path: '/projects', label: 'Projects', icon: '📁' },
      { path: '/users', label: 'Users', icon: '👥' },
      { path: '/permissions', label: 'Permissions', icon: '🔐' },
      { path: '/profile', label: 'Profile', icon: '👤' },
    ],
  },
  {
    id: 'config',
    label: 'Configuration',
    items: [
      { path: '/preferences', label: 'Preferences', icon: '⚙️' },
      { path: '/audit', label: 'Audit Log', icon: '📋' },
      { path: '/flags', label: 'Feature Flags', icon: '🚩' },
      { path: '/credits', label: 'Credits', icon: '💳' },
    ],
  },
  {
    id: 'platform',
    label: 'Platform Status',
    items: [
      { path: '/health', label: 'Health Status', icon: '❤️' },
      { path: '/integration-status', label: 'Integration Status', icon: '🔄' },
      { path: '/constitution', label: 'Constitution', icon: '📜' },
      { path: '/security', label: 'Security', icon: '🔒' },
      { path: '/observability', label: 'Observability', icon: '📊' },
      { path: '/api-docs', label: 'API Docs', icon: '🔌' },
      { path: '/demo/performance', label: 'Cache Performance', icon: '⚡' },
      { path: '/demo/websockets', label: 'WebSocket Test', icon: '🔥' },
    ],
  },
  {
    id: 'frontend',
    label: 'Frontend Resources',
    items: [
      { path: '/design-system', label: 'Design System', icon: '🎨' },
      { path: '/auth-flows', label: 'Auth Flows', icon: '🔐' },
      { path: '/context', label: 'Context Switcher', icon: '🔀' },
      { path: '/demo/files', label: 'File Management Demo', icon: '📁' },
      { path: '/resources', label: 'Resources', icon: '📊' },
      { path: '/templates', label: 'Templates', icon: '📄' },
      { path: '/theme', label: 'Theme Showcase', icon: '🎭' },
      { path: '/integration', label: 'Integration Patterns', icon: '🔗' },
    ],
  },
  {
    id: 'docs',
    label: 'Documentation',
    items: [
      { path: '/docs', label: 'Docs', icon: '📚' },
      { path: '/tasks', label: 'Tasks', icon: '✓' },
      { path: '/notifications', label: 'Notifications', icon: '🔔' },
      { path: '/deployment', label: 'Deployment', icon: '🚀' },
    ],
  },
];

/**
 * Sidebar using design-system primitives (Card, Button) with collapsible groups
 * - 5 groups: identity, config, platform, frontend, docs
 * - localStorage persistence of expanded groups
 * - Auto-expands group containing the active route
 */
export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { isSystemAdmin, isOrgAdmin, isCoach, hasOrgRole } = useUserRole();
  const STORAGE_KEY = 'demo_sidebar_expanded_groups';

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Filter navGroups based on permissions
  const filteredNavGroups = navGroups.map(group => {
    const items = group.items.filter(item => {
      // Admin-only pages
      if (['/integration-status', '/health', '/constitution', '/observability', '/api-docs', '/demo/performance', '/demo/websockets'].includes(item.path)) {
        return isSystemAdmin;
      }

      // Org Admin+ pages (includes flags for tenant-aware management)
      if (['/flags', '/credits', '/audit'].includes(item.path)) {
        return isSystemAdmin || isOrgAdmin;
      }

      // Security: Admin or Org Admin/Coach
      if (item.path === '/security') {
        return isSystemAdmin || hasOrgRole;
      }

      // Frontend resources: Admin-only (demo/documentation pages)
      if (group.id === 'frontend') {
        return isSystemAdmin;
      }

      // Documentation: Admin-only (except user-relevant notifications)
      if (group.id === 'docs') {
        if (item.path === '/notifications') {
          return true; // All users can see notifications
        }
        return isSystemAdmin;
      }

      // User-facing pages: everyone
      return true;
    });
    return { ...group, items };
  }).filter(group => group.items.length > 0);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setExpandedGroups(new Set(JSON.parse(stored)));
      } catch {
        // ignore malformed storage
      }
    }

    for (const group of filteredNavGroups) {
      const hasActive = group.items.some(item =>
        location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
      );
      if (hasActive) {
        setExpandedGroups(prev => new Set([...prev, group.id]));
        break;
      }
    }
  }, [location.pathname, user]); // Added user dependency

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(expandedGroups)));
  }, [expandedGroups]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const isItemActive = (path: string): boolean => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <aside data-testid="sidebar" style={{
      width: 280,
      minHeight: '100vh',
      backgroundColor: 'var(--app-surface)',
      borderRight: '1px solid var(--app-border)'
    }}>
      <Card style={{
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        backgroundColor: 'transparent',
        border: 'none',
        boxShadow: 'none'
      }}>
        {filteredNavGroups.map(group => (
          <Card key={group.id} data-testid={`nav-group-${group.id}`} style={{
            padding: 8,
            backgroundColor: 'var(--app-surface-secondary)',
            border: '1px solid var(--app-border)'
          }}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => toggleGroup(group.id)}
              style={{ width: '100%' }}
              data-testid={`accordion-toggle-${group.id}`}
            >
              <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <span>{group.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12 }}>
                  {expandedGroups.has(group.id) ? '▾' : '▸'}
                </span>
              </span>
            </Button>

            {expandedGroups.has(group.id) && (
              <div data-testid={`accordion-content-${group.id}`} style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {group.items.map(item => {
                  const active = isItemActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      data-testid={`nav-link-${item.path}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 6,
                        textDecoration: 'none',
                        backgroundColor: active ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        color: active ? '#2563eb' : 'var(--app-text)',
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      {item.icon && <span aria-hidden="true">{item.icon}</span>}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        ))}

        <Card style={{ padding: 8 }}>
          <Link
            to="/dashboard"
            data-testid="nav-link-dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 6,
              textDecoration: 'none',
              backgroundColor: isItemActive('/dashboard') ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: isItemActive('/dashboard') ? '#2563eb' : 'var(--app-text)',
              fontWeight: isItemActive('/dashboard') ? 600 : 500,
            }}
          >
            <span aria-hidden="true">🏠</span>
            <span>Dashboard</span>
          </Link>
        </Card>
      </Card>
    </aside>
  );
}
