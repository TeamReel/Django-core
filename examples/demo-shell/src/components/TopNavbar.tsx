/**
 * TopNavbar - Docker-style mega menu navigation
 *
 * Architecture:
 * - Single shared mega menu panel anchored to navbar container (not per-item dropdowns)
 * - Panel is positioned absolutely, centered, with max-width constraint
 * - Multi-column grid layout (2-3 columns based on item count)
 *
 * Behavior:
 * - Desktop: Dropdowns open on hover with 200ms delay before closing
 * - Mobile/Touch: Dropdowns open on tap/click (mega menu hidden on mobile)
 * - Keyboard: Tab to navigate, Enter/Space to open, ESC to close
 * - Accessibility: Proper ARIA attributes (aria-haspopup, aria-expanded, aria-controls)
 * - Theme: Uses theme variables for consistent light/dark mode support
 *
 * Hover mechanism:
 * - Mouse enter trigger → open immediately, show mega panel for that group
 * - Mouse leave trigger → close after 200ms (allows moving to panel)
 * - Mouse enter mega panel → cancel close timer (keep open)
 * - Mouse leave mega panel → close after 200ms
 * - Only one mega panel visible at a time
 * - Hover disabled on touch devices
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useSignOut } from '@django-core/auth-ui';
import { useTheme } from '@django-core/theme-system';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useUserRole } from './PermissionGuards';
import ProfileAvatarDropdown from './ProfileAvatarDropdown';
import { SearchBar } from './SearchBar';

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

interface NavItem {
  path: string;
  label: string;
  description?: string;
  icon?: string;
}

interface NotificationResponse {
  count: number;
  results: Array<{
    id: string;
    is_read: boolean;
  }>;
}

const navGroups: NavGroup[] = [
  {
    id: 'identity',
    label: 'Identity & Context',
    items: [
      { path: '/organisations', label: 'Organisations', description: 'Manage organisations and membership', icon: '🏢' },
      { path: '/projects', label: 'Projects', description: 'Browse and manage projects', icon: '📁' },
      { path: '/users', label: 'Users', description: 'View users and roles', icon: '👥' },
      { path: '/permissions', label: 'Permissions', description: 'Configure access control', icon: '🔐' },
    ],
  },
  {
    id: 'config',
    label: 'Configuration',
    items: [
      { path: '/credits', label: 'Credits', description: 'View organisation credits', icon: '💳' },
      { path: '/usage-events', label: 'Usage Events', description: 'Track usage and analytics', icon: '📈' },
      { path: '/audit', label: 'Audit Log', description: 'Review recorded audit events', icon: '📋' },
      { path: '/flags', label: 'Feature Flags', description: 'Toggle experimental features', icon: '🚩' },
    ],
  },
  {
    id: 'platform',
    label: 'Platform Status',
    items: [
      { path: '/health', label: 'Health Status', description: 'System health and uptime', icon: '❤️' },
      { path: '/integration-status', label: 'Integration Status', description: 'Module integration overview', icon: '🔄' },
      { path: '/constitution', label: 'Constitution', description: 'Core principles and rules', icon: '📜' },
      { path: '/security', label: 'Security', description: 'Baseline checks and recent events', icon: '🔒' },
      { path: '/observability', label: 'Observability', description: 'Metrics and monitoring', icon: '📊' },
      { path: '/api-docs', label: 'API Docs', description: 'OpenAPI documentation', icon: '🔌' },
      { path: '/demo/performance', label: 'Cache Performance', description: 'Redis cache metrics and controls', icon: '⚡' },
    ],
  },
  {
    id: 'frontend',
    label: 'Frontend Resources',
    items: [
      { path: '/design-system', label: 'Design System', description: 'UI components and tokens', icon: '🎨' },
      { path: '/auth-flows', label: 'Auth Flows', description: 'Login and signup demos', icon: '🔐' },
      { path: '/context', label: 'Context Switcher', description: 'Org and project selection', icon: '🔀' },
      { path: '/demo/files', label: 'File Management Demo', description: 'Upload and file handling', icon: '📁' },
      { path: '/resources', label: 'Resources', description: 'Resource display patterns', icon: '📊' },
      { path: '/templates', label: 'Templates', description: 'Page layout templates', icon: '📄' },
      { path: '/theme', label: 'Theme Showcase', description: 'Theme system demonstration', icon: '🎭' },
      { path: '/integration', label: 'Integration Patterns', description: 'Frontend integration examples', icon: '🔗' },
    ],
  },
  {
    id: 'docs',
    label: 'Documentation',
    items: [
      { path: '/docs', label: 'Docs', description: 'Documentation and guides', icon: '📚' },
      { path: '/tasks', label: 'Tasks', description: 'Background task management', icon: '✓' },
      { path: '/routing-logs', label: 'Routing Logs', description: 'Notification routing decisions', icon: '🔀' },
      { path: '/deployment', label: 'Deployment', description: 'Deploy and release guides', icon: '🚀' },
    ],
  },
];

export default function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { signOut, loading: signOutLoading } = useSignOut();
  const { mode, setTheme } = useTheme();
  const { context } = useContextSwitcher();
  const themeToggleEnabled = useFeatureFlag('dark_mode', true); // Theme toggle feature flag (resolved with org overrides)
  const [themeToggleGlobalEnabled, setThemeToggleGlobalEnabled] = useState<boolean>(true); // Global flag value (for superadmins)
  const { isSystemAdmin, isOrgAdmin, hasOrgRole } = useUserRole();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState<'EN' | 'NL' | 'DE' | 'IT' | 'FR'>('EN');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Docker-style hover timers
  const hoverTimerRef = useRef<Record<string, NodeJS.Timeout>>({});
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDropdownHoveredRef = useRef(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const currentThemeMode = mode || 'light';

  // Detect touch device
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('touchstart', checkTouch, { once: true });
  }, []);

  // Docker-style hover handlers
  const handleMouseEnterTrigger = useCallback((groupId: string) => {
    if (isTouchDevice) return; // Disable hover on touch devices

    console.log('Mouse enter trigger:', groupId, 'isTouchDevice:', isTouchDevice);

    // Clear any pending close timer
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    // Open immediately on hover
    setOpenDropdown(groupId);
  }, [isTouchDevice]);

  const handleMouseLeaveTrigger = useCallback((groupId: string) => {
    if (isTouchDevice) return;

    console.log('Mouse leave trigger:', groupId);

    // If we are already hovering the dropdown (due to overlap), don't close
    if (isDropdownHoveredRef.current) {
      console.log('Ignoring leave trigger because dropdown is hovered');
      return;
    }

    // Delay closing to allow moving to dropdown panel
    closeTimerRef.current = setTimeout(() => {
      console.log('Closing dropdown after delay');
      setOpenDropdown(null);
    }, 300); // Increased from 200ms to 300ms
  }, [isTouchDevice]);

  const handleMouseEnterDropdown = useCallback((groupId: string) => {
    if (isTouchDevice) return;
    console.log('Mouse enter dropdown panel:', groupId);
    isDropdownHoveredRef.current = true;

    // Cancel close timer when entering dropdown
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [isTouchDevice]);

  const handleMouseLeaveDropdown = useCallback((groupId: string) => {
    if (isTouchDevice) return;
    console.log('Mouse leave dropdown panel:', groupId);
    isDropdownHoveredRef.current = false;

    // Close after delay when leaving dropdown
    closeTimerRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 200);
  }, [isTouchDevice]);

  // Click handler for touch devices
  const handleClickTrigger = useCallback((groupId: string, e: React.MouseEvent) => {
    if (!isTouchDevice) return; // Only handle clicks on touch devices

    e.preventDefault();
    setOpenDropdown(prev => prev === groupId ? null : groupId);
  }, [isTouchDevice]);

  // Keyboard handler
  const handleKeyDown = useCallback((groupId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpenDropdown(prev => prev === groupId ? null : groupId);
    } else if (e.key === 'Escape') {
      setOpenDropdown(null);
    }
  }, []);

  // For superadmins: Fetch the global flag value (not resolved with org overrides)
  useEffect(() => {
    if (!isSystemAdmin) return; // Only for superadmins

    const fetchGlobalFlag = async () => {
      try {
        // Fetch flags without org context to get global values
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${baseUrl}/api/v1/settings/feature-flags/resolve-all/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const flags = data.data?.results || data.results || data.data || data || [];
          const themeFlag = flags.find((f: any) => f.key === 'dark_mode');

          if (themeFlag) {
            // For superadmins, ONLY use global_value (ignore resolved/org overrides)
            const globalValue = themeFlag.global_value !== null && themeFlag.global_value !== undefined
              ? themeFlag.global_value
              : true; // Default to true if no global value found
            console.log('[TopNavbar] Global dark_mode flag for superadmin:', globalValue, 'raw:', themeFlag);
            setThemeToggleGlobalEnabled(globalValue);
          }
        }
      } catch (err) {
        console.error('[TopNavbar] Error fetching global flag:', err);
      }
    };

    fetchGlobalFlag();

    // Listen for feature flag changes
    const handleFlagChange = () => {
      console.log('[TopNavbar] Feature flags changed, refetching global flag');
      fetchGlobalFlag();
    };

    window.addEventListener('storage', handleFlagChange);
    window.addEventListener('featureFlagsChanged' as any, handleFlagChange);

    return () => {
      window.removeEventListener('storage', handleFlagChange);
      window.removeEventListener('featureFlagsChanged' as any, handleFlagChange);
    };
  }, [isSystemAdmin]);

  // Load language from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('demo_language') as 'EN' | 'NL' | 'DE';
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  const handleLanguageChange = (lang: 'EN' | 'NL' | 'DE' | 'IT' | 'FR') => {
    console.log('Language change clicked:', lang);
    setLanguage(lang);
    localStorage.setItem('demo_language', lang);
    setLanguageMenuOpen(false);
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    console.log('Language changed event dispatched');
  };

  const toggleTheme = () => {
    console.log('Theme toggle clicked! Current mode:', mode);
    const newMode = mode === 'light' ? 'dark' : 'light';
    console.log('Switching to:', newMode);
    setTheme({ mode: newMode });
  };

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        console.log('[TopNavbar] Fetching notifications from:', `${apiBaseUrl}/api/v1/user-notifications/`);
        const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data: NotificationResponse = await response.json();
          console.log('[TopNavbar] Notifications API response:', data);
          console.log('[TopNavbar] data.results:', data.results);
          console.log('[TopNavbar] data.data:', (data as any).data);

          // Handle B13 envelope structure
          const notifications = data.results
            || (data as any).data?.results
            || (data as any).data?.data
            || (data as any).data
            || [];
          console.log('[TopNavbar] Parsed notifications:', notifications);

          const unread = Array.isArray(notifications)
            ? notifications.filter(n => !n.is_read).length
            : 0;
          console.log('[TopNavbar] Unread count:', unread);
          setUnreadCount(unread);
        } else {
          console.error('[TopNavbar] Notifications API error:', response.status, response.statusText);
        }
      } catch (err) {
        console.error('Failed to fetch notification count:', err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);

    const handleNotificationChange = () => fetchUnreadCount();
    window.addEventListener('notificationChanged', handleNotificationChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationChanged', handleNotificationChange);
    };
  }, [user]);

  // Filter based on permissions (same logic as Sidebar)
  const filteredNavGroups = navGroups.map(group => {
    const items = group.items.filter(item => {
      // Admin-only pages
      if (['/integration-status', '/health', '/constitution', '/observability', '/api-docs', '/routing-logs', '/demo/performance'].includes(item.path)) {
        return isSystemAdmin;
      }

      // Org Admin+ pages (includes flags for tenant-aware management)
      if (['/flags', '/credits', '/audit', '/usage-events'].includes(item.path)) {
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

  // Add Dashboard as a standalone item
  const dashboardItem = { path: '/dashboard', label: 'Dashboard', icon: '🏠' };

  const isItemActive = (path: string): boolean => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isGroupActive = (group: NavGroup): boolean => {
    return group.items.some(item => isItemActive(item.path));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside both trigger containers AND mega menu panel
      if (openDropdown && !target.closest('.nav-dropdown-container') && !target.closest('#mega-menu-panel')) {
        setOpenDropdown(null);
      }
      if (languageMenuOpen && !target.closest('.language-menu-container')) {
        setLanguageMenuOpen(false);
      }
    };

    if (openDropdown || languageMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown, languageMenuOpen]);

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      Object.values(hoverTimerRef.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Get column count based on item count (Docker-style)
  const getColumnCount = (itemCount: number): number => {
    if (itemCount <= 6) return 1; // Single column for small menus
    if (itemCount <= 14) return 2; // Two columns for medium menus
    return 3; // Three columns for large menus
  };

  // Get the active group for mega menu
  const activeGroup = openDropdown ? filteredNavGroups.find(g => g.id === openDropdown) : null;

  return (
    <div style={{ height: '57px', position: 'relative', zIndex: 500 }}>
      <nav style={{
        backgroundColor: 'var(--app-surface)',
        borderBottom: '1px solid var(--app-border)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 500,
        overflow: 'visible',
      }}>
        <div style={{
          maxWidth: '100%',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          height: '56px',
        }}>
          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--app-text)',
              padding: '8px',
              marginRight: '8px',
            }}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>

          {/* Left side: Navigation items */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flex: 1,
            flexWrap: 'nowrap',
            height: '100%',
          }} className="desktop-nav">
            {/* Dashboard link */}
            <Link
              to={dashboardItem.path}
              title={dashboardItem.label}
              aria-label={dashboardItem.label}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                textDecoration: 'none',
                color: isItemActive(dashboardItem.path) ? '#2563eb' : 'var(--app-text)',
                backgroundColor: isItemActive(dashboardItem.path) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                fontWeight: isItemActive(dashboardItem.path) ? 600 : 500,
                fontSize: '14px',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '16px' }}>{dashboardItem.icon}</span>
            </Link>

            {/* Group triggers */}
            {filteredNavGroups.map(group => {
              const isActive = isGroupActive(group);
              const isOpen = openDropdown === group.id;

              return (
                <div
                  key={group.id}
                  className="nav-dropdown-container"
                  style={{
                    position: 'relative',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <button
                    onClick={(e) => handleClickTrigger(group.id, e)}
                    onKeyDown={(e) => handleKeyDown(group.id, e)}
                    onMouseEnter={() => handleMouseEnterTrigger(group.id)}
                    onMouseLeave={() => {
                      console.log('Mouse leave BUTTON:', group.id);
                      handleMouseLeaveTrigger(group.id);
                    }}
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    aria-controls={`mega-menu-panel`}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      color: isActive ? '#2563eb' : 'var(--app-text)',
                      backgroundColor: isActive || isOpen ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{group.label}</span>
                    <span style={{ fontSize: '10px', transition: 'transform 0.2s' }}>{isOpen ? '▴' : '▾'}</span>
                  </button>

                  {/* Mega Menu Panel for this group */}
                  {isOpen && (
                    <div
                      id={`mega-menu-panel-${group.id}`}
                      role="menu"
                      onMouseEnter={() => handleMouseEnterDropdown(group.id)}
                      onMouseLeave={() => handleMouseLeaveDropdown(group.id)}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% - 10px)', // Overlap by 10px
                        left: '0',
                        paddingTop: '10px', // Push content down
                        minWidth: '600px',
                        zIndex: 100,
                      }}
                    >
                      <div style={{
                        backgroundColor: 'var(--app-surface)',
                        border: '1px solid var(--app-border)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                        padding: '20px',
                      }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${getColumnCount(group.items.length)}, minmax(0, 1fr))`,
                          columnGap: '40px',
                          rowGap: '10px',
                        }}
                      >
                        {group.items.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            role="menuitem"
                            onClick={() => setOpenDropdown(null)}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                              padding: '10px 12px',
                              textDecoration: 'none',
                              color: isItemActive(item.path) ? '#2563eb' : 'var(--app-text)',
                              backgroundColor: isItemActive(item.path) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                              borderRadius: '10px',
                              transition: 'background-color 0.15s',
                              pointerEvents: 'auto',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              if (!isItemActive(item.path)) {
                                e.currentTarget.style.backgroundColor = 'var(--app-surface-2)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isItemActive(item.path)) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            {item.icon && <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>{item.icon}</span>}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                              <span style={{
                                fontSize: '14px',
                                fontWeight: isItemActive(item.path) ? 600 : 500,
                                lineHeight: '1.3',
                              }}>
                                {item.label}
                              </span>
                              {item.description && (
                                <span style={{
                                  fontSize: '12px',
                                  color: 'var(--app-muted-text)',
                                  lineHeight: '1.3',
                                }}>
                                  {item.description}
                                </span>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right side: User controls */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Search Bar */}
            <div className="nav-search-container" style={{ width: '300px', maxWidth: '300px' }}>
              <SearchBar placeholder="Search..." />
            </div>

            {/* Theme Toggle - for superadmin: check global flag only, for others: check resolved flag (with org overrides) */}
            {(isSystemAdmin ? themeToggleGlobalEnabled : themeToggleEnabled) && (
              <button
                onClick={toggleTheme}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--app-text)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '20px',
                  position: 'relative',
                  zIndex: 1000,
                  pointerEvents: 'auto',
                  color: 'var(--app-text)',
                }}
                title={`Switch to ${currentThemeMode === 'light' ? 'dark' : 'light'} mode`}
                aria-label={`Switch to ${currentThemeMode === 'light' ? 'dark' : 'light'} mode`}
              >
                ◐
              </button>
            )}

            {/* Language Switcher */}
            <div className="language-menu-container" style={{ position: 'relative' }}>
              <button
                onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--app-border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--app-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                aria-label="Select language"
              >
                🌐 {language} <span style={{ fontSize: '10px' }}>{languageMenuOpen ? '▴' : '▾'}</span>
              </button>

              {languageMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: 'var(--app-surface)',
                  border: '1px solid var(--app-border)',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  minWidth: '120px',
                  zIndex: 1000,
                }}>
                  {(['EN', 'NL', 'DE', 'IT', 'FR'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 16px',
                        textAlign: 'left',
                        border: 'none',
                        backgroundColor: language === lang ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        color: language === lang ? 'var(--app-link)' : 'var(--app-text)',
                        fontWeight: language === lang ? 600 : 400,
                        fontSize: '14px',
                        cursor: 'pointer',
                        borderBottom: lang !== 'FR' ? '1px solid var(--app-border)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (language !== lang) {
                          e.currentTarget.style.backgroundColor = 'var(--app-surface-secondary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (language !== lang) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Icon */}
            <button
              onClick={() => navigate('/notifications')}
              style={{
                position: 'relative',
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '20px'
              }}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Profile Avatar Dropdown */}
            <ProfileAvatarDropdown />
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .mobile-menu-button {
            display: block !important;
          }
          .desktop-nav {
            display: none !important;
          }
          .desktop-only {
            display: none !important;
          }
          #mega-menu-panel {
            display: none !important;
          }
          .nav-search-container {
            width: auto !important;
            flex: 1;
            min-width: 120px;
          }
        }
        @media (max-width: 480px) {
          .language-menu-container {
            display: none !important;
          }
          .hide-on-mobile {
            display: none !important;
          }
          .nav-search-container {
            min-width: 80px;
          }
        }
      `}</style>
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '48px',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--app-surface)',
          borderTop: '1px solid var(--app-border)',
          overflowY: 'auto',
          zIndex: 999,
          padding: '16px',
        }}>
          {/* Dashboard */}
          <Link
            to={dashboardItem.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              marginBottom: '8px',
              borderRadius: '6px',
              textDecoration: 'none',
              color: isItemActive(dashboardItem.path) ? '#2563eb' : 'var(--app-text)',
              backgroundColor: isItemActive(dashboardItem.path) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              fontWeight: isItemActive(dashboardItem.path) ? 600 : 500,
            }}
          >
            <span>{dashboardItem.icon}</span>
            <span>{dashboardItem.label}</span>
          </Link>

          {/* Groups */}
          {filteredNavGroups.map(group => (
            <div key={group.id} style={{ marginBottom: '16px' }}>
              <div style={{
                padding: '8px 12px',
                fontWeight: 600,
                color: 'var(--app-text)',
                fontSize: '14px',
                opacity: 0.7,
              }}>
                {group.label}
              </div>
              {group.items.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    marginLeft: '12px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: isItemActive(item.path) ? '#2563eb' : 'var(--app-text)',
                    backgroundColor: isItemActive(item.path) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    fontWeight: isItemActive(item.path) ? 600 : 400,
                    fontSize: '14px',
                  }}
                >
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}

          {/* Mobile User Controls */}
          {user && (
            <div style={{ borderTop: '1px solid var(--app-border)', marginTop: '16px', paddingTop: '16px', padding: '16px' }}>
              <ProfileAvatarDropdown />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
