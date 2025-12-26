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
      { path: '/profile', label: 'Profile', description: 'Edit your profile settings', icon: '👤' },
    ],
  },
  {
    id: 'config',
    label: 'Configuration',
    items: [
      { path: '/preferences', label: 'Preferences', description: 'Customize application settings', icon: '⚙️' },
      { path: '/audit', label: 'Audit Log', description: 'Review recorded audit events', icon: '📋' },
      { path: '/flags', label: 'Feature Flags', description: 'Toggle experimental features', icon: '🚩' },
      { path: '/credits', label: 'Credits', description: 'View credits and attribution', icon: '💳' },
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
      { path: '/notifications', label: 'Notifications', description: 'User notification system', icon: '🔔' },
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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState<'EN' | 'NL' | 'DE'>('EN');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Docker-style hover timers
  const hoverTimerRef = useRef<Record<string, NodeJS.Timeout>>({});
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
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

    // Delay closing to allow moving to dropdown panel
    closeTimerRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 200);
  }, [isTouchDevice]);

  const handleMouseEnterDropdown = useCallback(() => {
    if (isTouchDevice) return;

    // Cancel close timer when entering dropdown
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [isTouchDevice]);

  const handleMouseLeaveDropdown = useCallback(() => {
    if (isTouchDevice) return;

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

  // Load language from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('demo_language') as 'EN' | 'NL' | 'DE';
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  const handleLanguageChange = (lang: 'EN' | 'NL' | 'DE') => {
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
        const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data: NotificationResponse = await response.json();
          const unread = data.results?.filter(n => !n.is_read).length || 0;
          setUnreadCount(unread);
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
      if (item.path === '/security') {
        const isSystemAdmin = (user as any)?.role === 'superadmin' || (user as any)?.role === 'admin';
        const orgs = (user as any)?.organisations || [];
        const isOrgAdmin = orgs.some((org: any) =>
          org.role?.toLowerCase().includes('admin') ||
          org.role?.toLowerCase().includes('coach')
        );
        return isSystemAdmin || isOrgAdmin;
      }
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
    <div style={{ position: 'relative' }}>
      <nav style={{
        backgroundColor: 'var(--app-surface)',
        borderBottom: '1px solid var(--app-border)',
        position: 'sticky',
        top: 0,
        zIndex: 500,
      }}>
        <div style={{
          maxWidth: '100%',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          gap: '16px',
          height: '56px',
        }}>
          {/* Left side: Navigation items */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flex: 1,
            overflow: 'hidden',
            flexWrap: 'nowrap',
          }} className="desktop-nav">
            {/* Dashboard link */}
            <Link
              to={dashboardItem.path}
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
              <span>{dashboardItem.icon}</span>
              <span>{dashboardItem.label}</span>
            </Link>

            {/* Group triggers */}
            {filteredNavGroups.map(group => {
              const isActive = isGroupActive(group);
              const isOpen = openDropdown === group.id;

              return (
                <div
                  key={group.id}
                  className="nav-dropdown-container"
                  onMouseEnter={() => handleMouseEnterTrigger(group.id)}
                  onMouseLeave={() => handleMouseLeaveTrigger(group.id)}
                >
                  <button
                    onClick={(e) => handleClickTrigger(group.id, e)}
                    onKeyDown={(e) => handleKeyDown(group.id, e)}
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
                </div>
              );
            })}
          </div>

          {/* Right side: User controls */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Theme Toggle */}
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
                  {(['EN', 'NL', 'DE'] as const).map(lang => (
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
                        borderBottom: lang !== 'DE' ? '1px solid var(--app-border)' : 'none',
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

            <span style={{ fontSize: '14px', color: 'var(--app-text)', opacity: 0.7 }}>{user.email}</span>
            <button
              onClick={signOut}
              disabled={signOutLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: signOutLoading ? '#6c757d' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: signOutLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {signOutLoading ? 'Logging out...' : 'Log Out'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-button {
            display: block !important;
          }
          .desktop-nav {
            display: none !important;
          }
          #mega-menu-panel {
            display: none !important;
          }
        }
      `}</style>
      </nav>

      {/* Docker-style Mega Menu Panel */}
      {activeGroup && (
        <div
          id="mega-menu-panel"
          role="menu"
          onMouseEnter={handleMouseEnterDropdown}
          onMouseLeave={handleMouseLeaveDropdown}
          style={{
            position: 'absolute',
            top: '56px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '1000px',
            backgroundColor: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            padding: '20px',
            zIndex: 100,
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${getColumnCount(activeGroup.items.length)}, minmax(0, 1fr))`,
              columnGap: '40px',
              rowGap: '10px',
            }}
          >
            {activeGroup.items.map((item) => (
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
                    color: 'inherit',
                  }}>
                    {item.label}
                  </span>
                  {item.description && (
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 400,
                      lineHeight: '1.4',
                      color: 'var(--app-muted-text)',
                    }}>
                      {item.description}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
        </div>
      )}
    </div>
  );
}
