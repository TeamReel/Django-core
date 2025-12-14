import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/organisations', label: 'Organisations', icon: '🏢' },
    { path: '/organisations/:slug/projects', label: 'Projects', icon: '📁' },
  ];

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
      </nav>
    </aside>
  );
}
