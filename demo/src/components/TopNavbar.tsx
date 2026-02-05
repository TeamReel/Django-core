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
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useSignOut } from '@django-core/auth-ui';
import { useTheme } from '@django-core/theme-system';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  Home, Menu, X, ChevronDown, ChevronUp, Sun, Moon,
  Globe, Bell, Coins, LucideIcon, PanelLeftOpen, PanelLeftClose, Command, Plus
} from 'lucide-react';
import { AppIcon } from './AppIcon';
import { useUserRole } from './PermissionGuards';
import ProfileAvatarDropdown from './ProfileAvatarDropdown';
import { SearchBar } from './SearchBar';
import Breadcrumbs from './Breadcrumbs';
import CommandPalette from './CommandPalette';
import { getApiBaseUrl } from '../utils/apiBase';

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

interface NavItem {
  path: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

interface NotificationResponse {
  count: number;
  results: Array<{
    id: string;
    is_read: boolean;
  }>;
}

const navGroups: NavGroup[] = [];

interface TopNavbarProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  isMobile?: boolean;
  /** Callback to receive the openSearch function reference */
  onOpenSearchRef?: (openSearch: () => void) => void;
}

export default function TopNavbar({ isSidebarOpen, onToggleSidebar, isMobile, onOpenSearchRef }: TopNavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { signOut, loading: signOutLoading } = useSignOut();
  const { mode, setTheme } = useTheme();
  const { context } = useContextSwitcher();
  const debugLog = (...args: unknown[]) => {
    if (import.meta.env.DEV) console.log(...args);
  };
  const { isSystemAdmin, isLandAdmin, isOrgAdmin, hasOrgRole } = useUserRole();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState<'EN' | 'NL' | 'DE' | 'IT' | 'FR'>('EN');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [myCreditsBalance, setMyCreditsBalance] = useState<string | null>(null);
  const [navSearchHasQuery, setNavSearchHasQuery] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Provide openSearch function to parent via callback ref
  useEffect(() => {
    if (onOpenSearchRef) {
      onOpenSearchRef(() => setCommandOpen(true));
    }
  }, [onOpenSearchRef]);

  const isPlatformRoute = (
    location.pathname.startsWith('/health') ||
    location.pathname.startsWith('/cache-performance') ||
    location.pathname.startsWith('/flags') ||
    location.pathname.startsWith('/integration') ||
    location.pathname.startsWith('/design-system') ||
    location.pathname.startsWith('/observability') ||
    location.pathname.startsWith('/security') ||
    location.pathname.startsWith('/constitution') ||
    location.pathname.startsWith('/api-docs') ||
    location.pathname.startsWith('/platform')
  );

  const showBreadcrumbs = !(
    location.pathname.startsWith('/notifications') ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register') ||
    isPlatformRoute
  );


  const orgIdForMyBalance = String((context as any)?.organisation?.id || '').trim();
  const currentUserId = (user as any)?.id;
  const myCreditsNumber = useMemo(() => {
    if (myCreditsBalance == null) return null;
    const n = Number(myCreditsBalance);
    return Number.isFinite(n) ? n : null;
  }, [myCreditsBalance]);
  const formattedCredits = useMemo(() => {
    if (myCreditsBalance == null) return null;
    const n = Number(myCreditsBalance);
    if (!Number.isFinite(n)) return String(myCreditsBalance);
    const rounded = Math.round(n);
    if (Math.abs(n - rounded) < 0.001) return String(rounded);
    return n.toFixed(2);
  }, [myCreditsBalance]);
  const creditsBadgeColor = useMemo(() => {
    if (myCreditsNumber == null) return '#6b7280'; // gray
    if (myCreditsNumber < 0) return '#dc3545'; // red
    if (myCreditsNumber === 0) return '#2563eb'; // blue
    return '#16a34a'; // green
  }, [myCreditsNumber]);
  const creditsTooltip = useMemo(() => {
    if (myCreditsBalance == null) return 'My balance';
    return `Credits: ${String(myCreditsBalance)}`;
  }, [myCreditsBalance]);

  // Close Create menu on click outside
  useEffect(() => {
    if (!createMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = createMenuRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setCreateMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [createMenuOpen]);





  // appNavGroup removed (moved to Sidebar)

  // Docker-style hover timers
  const hoverTimerRef = useRef<Record<string, number>>({});
  const closeTimerRef = useRef<number | null>(null);
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

    // If we are already hovering the dropdown (due to overlap), don't close
    if (isDropdownHoveredRef.current) {
      return;
    }

    // Delay closing to allow moving to dropdown panel
    closeTimerRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 300); // Increased from 200ms to 300ms
  }, [isTouchDevice]);

  const handleMouseEnterDropdown = useCallback((groupId: string) => {
    if (isTouchDevice) return;
    isDropdownHoveredRef.current = true;

    // Cancel close timer when entering dropdown
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [isTouchDevice]);

  const handleMouseLeaveDropdown = useCallback((groupId: string) => {
    if (isTouchDevice) return;
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


  // Load language from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('demo_language') as 'EN' | 'NL' | 'DE';
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  const handleLanguageChange = (lang: 'EN' | 'NL' | 'DE' | 'IT' | 'FR') => {
    debugLog('Language change clicked:', lang);
    setLanguage(lang);
    localStorage.setItem('demo_language', lang);
    setLanguageMenuOpen(false);
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    debugLog('Language changed event dispatched');
  };

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setTheme({ mode: newMode });
  };

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        debugLog('[TopNavbar] Fetching notifications from:', `${apiBaseUrl}/api/v1/user-notifications/`);
        const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data: NotificationResponse = await response.json();
          debugLog('[TopNavbar] Notifications API response:', data);

          // Handle B13 envelope structure
          const notifications = data.results
            || (data as any).data?.results
            || (data as any).data?.data
            || (data as any).data
            || [];
          debugLog('[TopNavbar] Parsed notifications:', notifications);

          const unread = Array.isArray(notifications)
            ? notifications.filter(n => !n.is_read).length
            : 0;
          debugLog('[TopNavbar] Unread count:', unread);
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

  // Fetch current user's credits (within selected organisation)
  useEffect(() => {
    if (!user) {
      setMyCreditsBalance(null);
      return;
    }
    if (!orgIdForMyBalance) {
      setMyCreditsBalance(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const fetchBalance = async () => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(
          `${apiBaseUrl}/api/v1/transactions/organizations/${encodeURIComponent(orgIdForMyBalance)}/balance/me/`,
          { credentials: 'include', signal: controller.signal }
        );
        if (!response.ok) return;
        const raw = await response.json();
        const data = (raw as any)?.data ?? raw;
        const v = (data as any)?.current_balance;
        if (!cancelled) setMyCreditsBalance(v != null ? String(v) : null);
      } catch {
        // ignore
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
  }, [orgIdForMyBalance, user]);

  // Filter based on permissions (keep Admin grouped; only show what the user can access)
  const isAdmin = isSystemAdmin || isLandAdmin;
  // Previously included appNavGroup here. Removed as it moved to Sidebar.
  const navGroupsWithApp = useMemo(() => [...navGroups], []);

  const filteredNavGroups = navGroupsWithApp.map(group => {
    const items = group.items.filter(item => {
      // Admin group: superadmin or land admin only
      if (group.id === 'admin') {
        return isAdmin;
      }

      // Users/Credits/Audit are tenant admin pages (org/club/team admins + superadmin)
      if (['/credits', '/audit', '/users'].includes(item.path)) {
        return isSystemAdmin || isOrgAdmin;
      }

      // Support docs/deployment are admin-only routes
      if (['/docs', '/deployment'].includes(item.path)) {
        return isAdmin;
      }

      // App pages: everyone
      return true;
    });

    return { ...group, items };
  }).filter(group => group.items.length > 0);

  // Add Dashboard as a standalone item
  const dashboardItem = { path: '/dashboard', label: 'Dashboard', icon: Home };

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
      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
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
          padding: isMobile ? '0 12px' : '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '8px' : '16px',
          height: '56px',
        }}>
          {/* Mobile Menu Button - Hamburger for sidebar toggle */}
          {isMobile && (
            <button
              className="mobile-menu-button"
              onClick={onToggleSidebar}
              style={{
                display: 'flex',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--app-text)',
                padding: '10px',
                border: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '44px',
                minHeight: '44px',
                borderRadius: '8px',
              }}
              aria-label="Toggle menu"
            >
              <Menu size={28} strokeWidth={2.5} />
            </button>
          )}

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
              className="nav-icon-button"
              style={{
                padding: '8px 12px',
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
              <AppIcon icon={dashboardItem.icon} size={16} />
            </Link>

            {/* Breadcrumbs for Hierarchy Context */}
            {showBreadcrumbs ? <Breadcrumbs /> : null}

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
                    <AppIcon icon={isOpen ? ChevronUp : ChevronDown} size={12} />
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
                            {item.icon && <span style={{ flexShrink: 0, marginTop: '2px' }}><AppIcon icon={item.icon} size={16} /></span>}
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
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
            {/* Search Bar - hidden on mobile */}
            {!isMobile && (
              <div
                className={`nav-search-container${navSearchHasQuery ? ' has-query' : ''}`}
                style={{
                  flex: '1 1 360px',
                  minWidth: '220px',
                  maxWidth: '560px',
                }}
              >
                <SearchBar
                  placeholder="Search..."
                  onQueryChange={(q) => setNavSearchHasQuery(Boolean(String(q || '').trim()))}
                />
              </div>
            )}

            {/* Quick Switcher - hidden on mobile */}
            {!isMobile && (
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="nav-icon-button"
                title="Quick switch"
                aria-label="Quick switch"
                style={{
                  padding: '8px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 10,
                }}
              >
                <AppIcon icon={Command} size={18} />
                <span style={{ fontSize: 13, fontWeight: 800 }}>Quick switch</span>
              </button>
            )}

            {/* + Create CTA (main action opens Content Library) - hidden on mobile */}
            {!isMobile && (
            <div ref={createMenuRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => navigate('/content')}
                className="nav-icon-button"
                title="Create content"
                aria-label="Create content"
                style={{
                  padding: '8px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 10,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  background: createMenuOpen ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                }}
              >
                <AppIcon icon={Plus} size={18} />
                <span style={{ fontSize: 13, fontWeight: 800 }}>Create</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateMenuOpen((v) => !v)}
                className="nav-icon-button"
                title="More create options"
                aria-label="More create options"
                style={{
                  padding: '8px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 10,
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  borderLeft: '1px solid var(--app-border)',
                  background: createMenuOpen ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                }}
              >
                <AppIcon icon={createMenuOpen ? ChevronUp : ChevronDown} size={12} />
              </button>

              {createMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    minWidth: 260,
                    backgroundColor: 'var(--app-surface)',
                    border: '1px solid var(--app-border)',
                    borderRadius: 12,
                    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.18)',
                    padding: '8px',
                    zIndex: 1200,
                  }}
                >
                  {[
                    { label: 'Content Library', path: '/content', hint: 'Create content for match/season' },
                    { label: 'AI Studio', path: '/studio/create', hint: 'Generate content (AI)' },
                    { label: 'Match', path: '/directory?tab=matches&create=match', hint: 'Create a new match' },
                    { label: 'Competition', path: '/directory?tab=competitions', hint: 'Go to competitions list' },
                    { label: 'Season', path: '/directory?tab=seasons', hint: 'Go to seasons list' },
                    { label: 'Team', path: '/directory?tab=teams', hint: 'Go to teams list' },
                    { label: 'Club', path: '/directory?tab=clubs', hint: 'Go to clubs list' },
                    { label: 'Federation', path: '/organisations/create', hint: 'Create a new federation' },
                  ].map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        setCreateMenuOpen(false);
                        navigate(item.path);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: 'none',
                        background: 'transparent',
                        padding: '10px 10px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        color: 'var(--app-text)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--app-surface-2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{item.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--app-muted-text)' }}>{item.hint}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* Theme Toggle - hidden on mobile */}
            {!isMobile && (
              <button
                onClick={toggleTheme}
                className="nav-icon-button"
                style={{
                  padding: '8px',
                  position: 'relative',
                  zIndex: 1000,
                  pointerEvents: 'auto',
                }}
                title={`Switch to ${currentThemeMode === 'light' ? 'dark' : 'light'} mode`}
                aria-label={`Switch to ${currentThemeMode === 'light' ? 'dark' : 'light'} mode`}
              >
                <AppIcon icon={currentThemeMode === 'light' ? Moon : Sun} size={20} />
              </button>
            )}

            {/* Language Switcher - hidden on mobile */}
            {!isMobile && (
            <div className="language-menu-container" style={{ position: 'relative' }}>
              <button
                onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                className="nav-icon-button"
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--app-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                aria-label="Select language"
              >
                <AppIcon icon={Globe} size={16} /> {language} <AppIcon icon={languageMenuOpen ? ChevronUp : ChevronDown} size={10} />
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
            )}

            {/* Notification Icon - always visible */}
            <button
              onClick={() => navigate('/notifications')}
              className="nav-right-fixed nav-icon-button"
              aria-label="Notifications"
              style={{
                position: 'relative',
                padding: '8px',
                backgroundColor: 'transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '20px',
                flexShrink: 0,
              }}
              title="Notifications"
            >
              <AppIcon icon={Bell} size={20} />
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

            {/* Credits / Transactions Icon - hidden on mobile */}
            {!isMobile && user ? (
              <button
                className="nav-credits-button nav-icon-button"
                onClick={() => {
                  const id = Number(currentUserId);
                  if (!Number.isFinite(id)) return;
                  navigate(`/users/${id}?tab=balance`);
                }}
                style={{
                  position: 'relative',
                  padding: '8px',
                  backgroundColor: 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: 'var(--app-text)',
                }}
                title={creditsTooltip}
                aria-label="My balance"
              >
                <AppIcon icon={Coins} size={20} />
                {formattedCredits != null && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      backgroundColor: creditsBadgeColor,
                      color: 'white',
                      borderRadius: '10px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                    }}
                  >
                    {formattedCredits}
                  </span>
                )}
              </button>
            ) : null}

            {/* Profile Avatar Dropdown - pass isMobile for expanded menu */}
            <div className="nav-right-fixed" style={{ flexShrink: 0 }}>
              <ProfileAvatarDropdown isMobile={isMobile} onOpenSearch={() => setCommandOpen(true)} />
            </div>
          </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link
                to="/login"
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: 'var(--app-text)',
                  border: '1px solid var(--app-border)',
                }}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: 'white',
                  backgroundColor: '#2563eb',
                  border: '1px solid #2563eb',
                }}
              >
                Register
              </Link>
            </div>
          )}
      </div>

      <style>{`
        .nav-icon-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--nav-icon-border);
          background: transparent;
          color: var(--app-text);
          border-radius: 6px;
          cursor: pointer;
          line-height: 1;
        }
        .nav-icon-button:hover {
          background: var(--nav-icon-hover-bg);
        }
        .nav-icon-button:active {
          transform: translateY(0.5px);
        }
        .nav-icon-button:focus-visible {
          outline: 2px solid rgba(37, 99, 235, 0.45);
          outline-offset: 2px;
        }

        /* Apply the same icon-button styling to fixed right-side icon buttons */
        .nav-right-fixed.nav-icon-button,
        .nav-credits-button.nav-icon-button {
          border-radius: 6px;
        }

        .nav-search-container {
          transition: max-width 160ms ease, flex-basis 160ms ease;
        }
        @media (min-width: 1025px) {
          .nav-search-container:focus-within {
            max-width: 820px !important;
            flex-basis: 640px;
          }
        }
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
          .nav-credits-button {
            display: none !important;
          }
          #mega-menu-panel {
            display: none !important;
          }
          .nav-search-container {
            width: auto !important;
            flex: 0 1 170px !important;
            min-width: 120px !important;
            max-width: 190px !important;
          }
          .nav-search-container.has-query {
            flex: 1 1 260px !important;
            max-width: min(520px, 58vw) !important;
          }
          .nav-right-fixed {
            flex-shrink: 0 !important;
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
            min-width: 110px !important;
            max-width: 150px !important;
          }
          .nav-search-container.has-query {
            max-width: 60vw !important;
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
            <AppIcon icon={dashboardItem.icon} size={16} />
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
                  {item.icon && <AppIcon icon={item.icon} size={16} />}
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
