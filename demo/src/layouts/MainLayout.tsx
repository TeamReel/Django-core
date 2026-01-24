import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import TopNavbar from '../components/TopNavbar';
import Sidebar from '../components/Sidebar';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setSidebarOpen(savedState !== 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem('sidebar-collapsed', String(!newState));
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row', // Changed to row for Sidebar-first layout
      height: '100vh',
      backgroundColor: 'var(--app-bg)',
      color: 'var(--app-text)',
      overflow: 'hidden'
    }}>
      {/* Sidebar on the left, full height */}
      <Sidebar isOpen={sidebarOpen} toggle={toggleSidebar} />

      {/* Main Content Column (Navbar + Page) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        position: 'relative'
      }}>
        {/* TopNavbar */}
        <div style={{ flexShrink: 0, zIndex: 100 }}>
          <TopNavbar isSidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />
        </div>

        {/* Main Content Area */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          backgroundColor: 'var(--app-surface-1)',
          position: 'relative'
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
