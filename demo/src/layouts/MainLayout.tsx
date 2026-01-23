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
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: 'var(--app-bg)',
      color: 'var(--app-text)',
      overflow: 'hidden' // MainLayout handles scrolling of content
    }}>
      {/* TopNavbar fixed at top */}
      <div style={{ flexShrink: 0, zIndex: 100 }}>
        <TopNavbar />
      </div>

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden', // Contain scrolling to content area
        position: 'relative'
      }}>
        {/* Sidebar on the left */}
        <Sidebar isOpen={sidebarOpen} toggle={toggleSidebar} />

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
