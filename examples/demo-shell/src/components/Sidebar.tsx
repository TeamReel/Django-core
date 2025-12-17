import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card } from '@django-core/design-system';

/**
 * Navigation structure organized by category
 */
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

/**
 * Sidebar component with collapsible accordion groups
 * Features:
 * - 5 collapsible accordion groups (identity, config, platform, frontend, docs)
 * - localStorage persistence for expanded/collapsed state
 * - Active category auto-expands on mount
 * - F01 design system components
 */
export default function Sidebar() {
  const location = useLocation();
  const isDev = import.meta.env.DEV;
  const STORAGE_KEY = 'demo_sidebar_expanded_groups';

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
        { path: '/observability', label: 'Observability', icon: '📊' },
      ],
    },
    {
      id: 'frontend',
      label: 'Frontend Resources',
      items: [
        { path: '/design-system', label: 'Design System', icon: '🎨' },
        { path: '/theme', label: 'Theme Showcase', icon: '🎭' },
        { path: '/components', label: 'Components', icon: '⚙️' },
      ],
    },
    {
      id: 'docs',
      label: 'Documentation',
      items: [
        { path: '/docs', label: 'Docs', icon: '📚' },
        { path: '/integration', label: 'Integration Guides', icon: '🔗' },
        { path: '/api-docs', label: 'API Docs', icon: '🔌' },
      ],
    },
  ];

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  /**
   * Load expanded groups from localStorage and auto-expand active group
   */
  useEffect(() => {
    // Load from storage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setExpandedGroups(new Set(JSON.parse(stored)));
      } catch (e) {
        // Invalid storage, ignore
      }
    }

    // Auto-expand group containing active route
    for (const group of navGroups) {
      const hasActive = group.items.some(item =>
        location.pathname === item.path ||
        (item.path.length > 1 && location.pathname.startsWith(item.path))
      );

      if (hasActive) {
        setExpandedGroups(prev => {
          const updated = new Set(prev);
          updated.add(group.id);
          return updated;
        });
        break;
      }
    }
  }, [location.pathname]);

  /**
   * Persist expanded groups to localStorage
   */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(expandedGroups)));
  }, [expandedGroups]);

  /**
   * Toggle accordion group
   */
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const updated = new Set(prev);
      if (updated.has(groupId)) {
        updated.delete(groupId);
      } else {
        updated.add(groupId);
      }
      return updated;
    });
  };

  /**
   * Check if item is active
   */
  const isItemActive = (path: string): boolean => {
    return (
      location.pathname === path ||
      (path.length > 1 && location.pathname.startsWith(path))
    );
  };

  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '280px',
        minHeight: '100vh',
        borderRight: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        overflow: 'auto',
      }}
      data-testid="sidebar"
    >
      <nav style={{ padding: '16px 0', flex: 1 }}>
        {navGroups.map(group => (
          <div key={group.id} data-testid={`nav-group-${group.id}`}>
            {/* Accordion header */}
            <button
              onClick={() => toggleGroup(group.id)}
              style={{
                width: '100%',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: '1px solid #e5e7eb',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                color: '#374151',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.backgroundColor = '#f0f1f3';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.backgroundColor = 'transparent';
              }}
              data-testid={`accordion-toggle-${group.id}`}
            >
              <span>{group.label}</span>
              <span
                style={{
                  transform: expandedGroups.has(group.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  fontSize: '12px',
                }}
              >
                ▼
              </span>
            </button>

            {/* Accordion content */}
            {expandedGroups.has(group.id) && (
              <div style={{ padding: '8px 0' }} data-testid={`accordion-content-${group.id}`}>
                {group.items.map(item => {
                  const active = isItemActive(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px 16px',
                        marginLeft: '12px',
                        marginRight: '8px',
                        borderRadius: '4px',
                        color: active ? '#2563eb' : '#6b7280',
                        backgroundColor: active ? '#eff6ff' : 'transparent',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: active ? 600 : 400,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement;
                        if (!active) {
                          el.style.backgroundColor = '#f3f4f6';
                        }
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement;
                        if (!active) {
                          el.style.backgroundColor = 'transparent';
                        }
                      }}
                      data-testid={`nav-link-${item.path}`}
                    >
                      {item.icon && <span style={{ fontSize: '16px' }}>{item.icon}</span>}
                      <span>{item.label}</span>
                      {active && (
                        <span
                          style={{
                            marginLeft: 'auto',
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            backgroundColor: '#2563eb',
                          }}
                          data-testid={`active-indicator-${item.path}`}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Dashboard shortcut (always visible) */}
        <Link
          to="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            marginTop: '16px',
            borderTop: '1px solid #e5e7eb',
            color: isItemActive('/dashboard') ? '#2563eb' : '#6b7280',
            backgroundColor: isItemActive('/dashboard') ? '#eff6ff' : 'transparent',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: isItemActive('/dashboard') ? 600 : 400,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            if (!isItemActive('/dashboard')) {
              el.style.backgroundColor = '#f3f4f6';
            }
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            if (!isItemActive('/dashboard')) {
              el.style.backgroundColor = 'transparent';
            }
          }}
          data-testid="nav-link-dashboard"
        >
          <span style={{ fontSize: '16px' }}>🏠</span>
          <span>Dashboard</span>
        </Link>
      </nav>
    </aside>
  );
}
