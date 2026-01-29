import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import TopNavbar from '../components/TopNavbar';
import Sidebar from '../components/Sidebar';
import MobileBottomNav from '../components/MobileBottomNav';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const openSearchRef = useRef<(() => void) | null>(null);

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
        <div style={{ flexShrink: 0, zIndex: 100 }}>
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
            paddingBottom: isMobile ? '80px' : '24px', // Extra space for bottom nav on mobile
            backgroundColor: 'var(--app-surface-1)',
            position: 'relative'
          }}
        >
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <MobileBottomNav
            onOpenSearch={() => openSearchRef.current?.()}
            onToggleMenu={toggleSidebar}
          />
        )}
      </div>
    </div>
  );
}
