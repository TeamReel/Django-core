import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopNavbar from '../components/TopNavbar';
import Sidebar from '../components/Sidebar';
import MobileBottomNav from '../components/MobileBottomNav';
import OnboardingWizard from '../components/OnboardingWizard';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const openSearchRef = useRef<(() => void) | null>(null);
  const location = useLocation();

  // Auto-close mobile sidebar on route change
  useEffect(() => {
    if (isMobile && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

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

      // Occupied bottom area = from top edge of bottom nav to viewport bottom.
      // This automatically adapts to safe-area insets and raised + button geometry.
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const bottomOffset = bottomNav
        ? Math.max(0, Math.round(viewportHeight - bottomNav.getBoundingClientRect().top))
        : 80;

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
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      height: '100vh',
      backgroundColor: 'var(--app-bg)',
      color: 'var(--app-text)',
      overflow: 'hidden'
    }}>
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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        position: 'relative',
        width: '100%'
      }}>
        {/* TopNavbar */}
        <div style={{ flexShrink: 0 }}>
          <TopNavbar
            isSidebarOpen={sidebarOpen}
            onToggleSidebar={toggleSidebar}
            isMobile={isMobile}
            onOpenSearchRef={handleOpenSearchRef}
          />
        </div>

        {/* Main Content Area */}
        <main
          className="main-content"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: isMobile ? '12px' : '24px',
            paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom, 0px))' : '24px', // Extra space for bottom nav on mobile
            backgroundColor: 'var(--app-surface-1)',
            position: 'relative'
          }}
        >
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <>
            <OnboardingWizard />
            <MobileBottomNav />
          </>
        )}
      </div>
    </div>
  );
}
