import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, Button } from '@django-core/design-system';

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
  const STORAGE_KEY = 'demo_sidebar_expanded_groups';

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setExpandedGroups(new Set(JSON.parse(stored)));
      } catch {
        // ignore malformed storage
      }
    }

    for (const group of navGroups) {
      const hasActive = group.items.some(item =>
        location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
      );
      if (hasActive) {
        setExpandedGroups(prev => new Set([...prev, group.id]));
        break;
      }
    }
  }, [location.pathname]);

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
    <aside data-testid="sidebar" style={{ width: 280, minHeight: '100vh' }}>
      <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {navGroups.map(group => (
          <Card key={group.id} data-testid={`nav-group-${group.id}`} style={{ padding: 8 }}>
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
                        backgroundColor: active ? '#eff6ff' : 'transparent',
                        color: active ? '#0f172a' : '#374151',
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
              backgroundColor: isItemActive('/dashboard') ? '#eff6ff' : 'transparent',
              color: isItemActive('/dashboard') ? '#0f172a' : '#374151',
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
