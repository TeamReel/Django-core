/**
 * MobileBottomNav - Bottom tab bar for mobile navigation
 *
 * Displays a fixed bottom navigation bar on mobile with quick access to:
 * - Home (Dashboard)
 * - Directory (Browse all entities)
 * - Create (Content creation - center prominent button)
 * - Library (Content/Media)
 * - More (Menu/sidebar toggle)
 *
 * Only visible on mobile (<640px)
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Folder, Plus, Library, Menu } from 'lucide-react';

interface MobileBottomNavProps {
  /** Callback to open search/command palette */
  onOpenSearch?: () => void;
  /** Callback to open create modal */
  onOpenCreate?: () => void;
  /** Callback to toggle sidebar/menu */
  onToggleMenu?: () => void;
}

export default function MobileBottomNav({ onOpenCreate, onToggleMenu }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'home', icon: Home, label: 'Home', path: '/dashboard' },
    { id: 'directory', icon: Folder, label: 'Directory', path: '/directory' },
    { id: 'create', icon: Plus, label: 'Create', action: onOpenCreate || (() => navigate('/content?action=create')) },
    { id: 'library', icon: Library, label: 'Library', path: '/content' },
    { id: 'more', icon: Menu, label: 'More', action: onToggleMenu },
  ];

  const isActive = (tab: typeof tabs[0]) => {
    if (!tab.path) return false;
    const currentPath = location.pathname;
    const tabBasePath = tab.path.split('?')[0];

    if (tabBasePath === '/dashboard') {
      return currentPath === '/' || currentPath === '/dashboard' || currentPath === '/recents' || currentPath === '/favorites';
    }

    if (tabBasePath === '/directory') {
      return currentPath === '/directory' || currentPath.startsWith('/organisations') ||
             currentPath.startsWith('/clubs') || currentPath.startsWith('/teams');
    }

    if (tabBasePath === '/content') {
      return currentPath === '/content' || currentPath.startsWith('/content/');
    }

    return currentPath.startsWith(tabBasePath);
  };

  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        backgroundColor: 'var(--app-surface)',
        borderTop: '1px solid var(--app-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 1000,
      }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab);
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.action) {
                tab.action();
              } else if (tab.path) {
                navigate(tab.path);
              }
            }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px 4px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: active ? 'var(--app-primary)' : 'var(--app-muted-text)',
              transition: 'color 0.2s ease',
            }}
          >
            {tab.id === 'create' ? (
              // Special styling for create button
              <span
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--app-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <Icon size={22} strokeWidth={2.5} />
              </span>
            ) : (
              <>
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: active ? 600 : 400,
                    lineHeight: 1,
                  }}
                >
                  {tab.label}
                </span>
              </>
            )}
          </button>
        );
      })}
    </nav>
  );
}
