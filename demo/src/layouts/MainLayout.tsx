import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import TopNavbar from '../components/TopNavbar';
import Sidebar from '../components/Sidebar';
import MobileBottomNav from '../components/MobileBottomNav';
const OnboardingWizard = lazy(() => import('../components/OnboardingWizard'));
const ShortcutGuide = lazy(() => import('../components/ShortcutGuide'));
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useRealtimeChannel } from '../hooks/useRealtimeChannel';
import styles from './MainLayout.module.css';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shortcutGuideOpen, setShortcutGuideOpen] = useState(false);
  const openSearchRef = useRef<(() => void) | null>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const prevPathRef = useRef<string>('');
  const location = useLocation();
  const navigate = useNavigate();

  // Global WebSocket subscription — establishes a baseline WS connection
  // for all authenticated pages so user-level events are delivered.
  const { user } = useAuth();
  useRealtimeChannel({ channelType: 'user', channelId: user?.id ?? null });

  // Register global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: '/',
      action: () => openSearchRef.current?.(),
      description: 'Zoeken',
    },
    {
      key: '?',
      shift: true,
      action: () => setShortcutGuideOpen(true),
      description: 'Sneltoetsen tonen',
    },
    {
      key: 'Escape',
      action: () => setShortcutGuideOpen(false),
      description: 'Sluiten',
      allowInInput: true,
    },
    {
      key: 'h',
      action: () => navigate('/dashboard'),
      description: 'Naar dashboard',
    },
    {
      key: 'n',
      action: () => {
        // Trigger the FAB / quick-create if available
        const fab = document.querySelector<HTMLButtonElement>('[data-fab-create]');
        fab?.click();
      },
      description: 'Nieuw item',
    },
  ]);

  // Auto-close mobile sidebar on route change
  useEffect(() => {
    if (isMobile && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [location.pathname, location.search]);

  // Page transition: restart fade-in animation on route change
  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      prevPathRef.current = location.pathname;
      const el = mainContentRef.current;
      if (el) {
        el.style.animation = 'none';
        void el.offsetHeight; // force reflow to restart animation
        el.style.animation = '';
      }
    }
  }, [location.pathname]);

  // Store the openSearch function from TopNavbar
  const handleOpenSearchRef = useCallback((openSearch: () => void) => {
    openSearchRef.current = openSearch;
  }, []);

  // Detect screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 640;
      const tablet = window.innerWidth < 1024;
      setIsMobile(mobile);

      // Auto-collapse sidebar on tablet, hide on mobile
      if (mobile) {
        setSidebarOpen(false);
      } else if (tablet) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load sidebar state from localStorage on mount (only for desktop)
  useEffect(() => {
    if (!isMobile && window.innerWidth >= 1024) {
      const savedState = localStorage.getItem('sidebar-collapsed');
      if (savedState !== null) {
        setSidebarOpen(savedState !== 'true');
      }
    }
  }, [isMobile]);

  // Dynamic mobile navbar offsets for modals/sheets:
  // modal should always sit between visible top and bottom navbars.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const setOffsets = () => {
      // Only relevant on mobile width where nav bars are active
      if (window.innerWidth >= 640) {
        root.style.removeProperty('--tr-top-navbar-offset');
        root.style.removeProperty('--tr-bottom-navbar-offset');
        return;
      }

      const topNav = document.querySelector<HTMLElement>('[data-app-top-navbar="true"]');
      const bottomNav = document.querySelector<HTMLElement>('[data-app-bottom-navbar="true"]');

      const topHeight = topNav
        ? Math.max(0, Math.round(topNav.getBoundingClientRect().height))
        : 57;

      // Occupied bottom area = from highest visible edge of bottom nav zone
      // (includes raised center create button) to viewport bottom.
      // Use the largest available viewport metric to avoid underestimating
      // offset on mobile browsers where visual/layout viewport can differ.
      const layoutViewportHeight = window.innerHeight;
      const visualViewportHeight = window.visualViewport?.height ?? 0;
      const docViewportHeight = document.documentElement.clientHeight;
      const viewportHeight = Math.max(layoutViewportHeight, visualViewportHeight, docViewportHeight);
      let bottomOffset = 96; // robust fallback for raised + button overlap
      if (bottomNav) {
        let highestTop = bottomNav.getBoundingClientRect().top;
        // Scan for raised elements (e.g. center + button) that extend above the nav
        for (const el of bottomNav.querySelectorAll<HTMLElement>('button, a, [role="button"]')) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && r.top < highestTop) {
            highestTop = r.top;
          }
        }
        // Enforce a strict minimum so CTA/footer never falls beneath bottom nav.
        bottomOffset = Math.max(96, Math.round(viewportHeight - highestTop + 10));
      }

        root.style.setProperty('--tr-top-navbar-offset', `${topHeight}px`);
        root.style.setProperty('--tr-bottom-navbar-offset', `${bottomOffset}px`);
      };

      const onResize = () => {
        window.requestAnimationFrame(setOffsets);
      };

      setOffsets();
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', onResize);
      window.visualViewport?.addEventListener('resize', onResize);

      const observer = new ResizeObserver(() => onResize());
      const topNav = document.querySelector<HTMLElement>('[data-app-top-navbar="true"]');
      const bottomNav = document.querySelector<HTMLElement>('[data-app-bottom-navbar="true"]');
      if (topNav) observer.observe(topNav);
    if (bottomNav) observer.observe(bottomNav);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      observer.disconnect();
    };
  }, [isMobile, location.pathname]);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      const newState = !sidebarOpen;
      setSidebarOpen(newState);
      localStorage.setItem('sidebar-collapsed', String(!newState));
    }
  };

  // Close mobile menu when clicking overlay
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className={styles.root}>
      {/* Mobile Overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="sidebar-overlay active"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar-container ${isMobile && mobileMenuOpen ? 'mobile-open' : ''}`}>
        <Sidebar
          isOpen={isMobile ? true : sidebarOpen}
          toggle={isMobile ? closeMobileMenu : toggleSidebar}
        />
      </div>

      {/* Main Content Column (Navbar + Page) */}
      <div className={styles.mainColumn}>
        {/* TopNavbar */}
        <div className={styles.topNavWrapper}>
          <TopNavbar
            isSidebarOpen={sidebarOpen}
            onToggleSidebar={toggleSidebar}
            isMobile={isMobile}
            onOpenSearchRef={handleOpenSearchRef}
          />
        </div>

        {/* Main Content Area */}
        <main
          ref={mainContentRef}
          className={`main-content ${styles.mainContent}`}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: isMobile ? '12px' : '24px',
            paddingBottom: isMobile
              ? 'max(var(--tr-bottom-navbar-offset, calc(96px + env(safe-area-inset-bottom, 0px))), calc(96px + env(safe-area-inset-bottom, 0px)))'
              : '24px',
            backgroundColor: 'var(--app-surface-1)',
            position: 'relative'
          }}
        >
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <>
            <Suspense fallback={null}><OnboardingWizard /></Suspense>
            <MobileBottomNav />
          </>
        )}
      </div>

      {/* Keyboard shortcut cheatsheet */}
      {shortcutGuideOpen && (
        <Suspense fallback={null}>
          <ShortcutGuide isOpen={shortcutGuideOpen} onClose={() => setShortcutGuideOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
