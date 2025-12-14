import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();
  const isDev = import.meta.env.DEV;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/organisations', label: 'Organisations', icon: '🏢' },
    { path: '/organisations/:slug/projects', label: 'Projects', icon: '📁' },
    { path: '/resources', label: 'Resources', icon: '📦' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  const statusItems = isDev ? [
    { path: '/status/health', label: 'Health', icon: '❤️' },
    { path: '/status/permissions', label: 'Permissions', icon: '🔐' },
  ] : [];

  return (
    <aside style={{
      width: '250px',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      borderRight: '1px solid #eee',
      padding: '24px 0'
    }}>
      <nav>
        {navItems.map(item => {
          const isActive = location.pathname === item.path ||
                          (item.path === '/organisations' && location.pathname.startsWith('/organisations'));

          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 24px',
                color: isActive ? '#007bff' : '#333',
                backgroundColor: isActive ? '#e7f3ff' : 'transparent',
                textDecoration: 'none',
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? '3px solid #007bff' : '3px solid transparent'
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Status submenu (dev mode only) */}
        {statusItems.length > 0 && (
          <>
            <div style={{
              margin: '24px 24px 12px 24px',
              padding: '8px 0',
              borderTop: '1px solid #dee2e6',
              fontSize: '12px',
              fontWeight: 600,
              color: '#6c757d',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Status (Dev Only)
            </div>
            {statusItems.map(item => {
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 24px',
                    color: isActive ? '#007bff' : '#333',
                    backgroundColor: isActive ? '#e7f3ff' : 'transparent',
                    textDecoration: 'none',
                    fontWeight: isActive ? 600 : 400,
                    borderLeft: isActive ? '3px solid #007bff' : '3px solid transparent'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
}
