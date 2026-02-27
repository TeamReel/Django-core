/**
 * MobileBottomNav - Bottom tab bar for mobile navigation
 *
 * Displays a fixed bottom navigation bar on mobile with quick access to core pages.
 * Role-aware: hides admin-only items (Directory) for non-admin users and shows
 * contextual items (Team) instead.
 *
 * Only visible on mobile (<640px)
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Sparkles, ClipboardCheck, Library, Menu, Shirt } from 'lucide-react';
import { useUserRole } from './PermissionGuards';
import { useAppSelection } from '../hooks/useAppSelection';

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
  const { isSystemAdmin } = useUserRole();
  const { orgSlug, clubSlugOrId, teamSlugOrId } = useAppSelection();

  // Build team path from active context
  const teamPath = orgSlug && clubSlugOrId && teamSlugOrId
    ? `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}`
    : orgSlug && clubSlugOrId
      ? `/${orgSlug}/${clubSlugOrId}`
      : '/dashboard';

  const tabs = [
    { id: 'home', icon: Home, label: 'Home', path: '/dashboard' },
    { id: 'team', icon: Shirt, label: 'Team', path: teamPath },
    { id: 'gallery', icon: Sparkles, label: 'Gallery', path: '/studio' },
    { id: 'queue', icon: ClipboardCheck, label: 'Queue', path: '/approvals' },
    { id: 'more', icon: Menu, label: 'More', action: onToggleMenu },
  ];

  const isActive = (tab: typeof tabs[0]) => {
    if (!tab.path) return false;
    const currentPath = location.pathname;
    const tabBasePath = tab.path.split('?')[0];

    if (tabBasePath === '/dashboard') {
      return currentPath === '/' || currentPath === '/dashboard' || currentPath === '/recents' || currentPath === '/favorites';
    }

    if (tab.id === 'team') {
      // Active for any vanity hierarchy route (org/club/team/season/etc)
      const segs = currentPath.split('/').filter(Boolean);
      const reserved = new Set(['dashboard', 'directory', 'content', 'studio', 'permissions', 'settings', 'health', 'docs', 'search', 'login', 'logout', 'organisations', 'users', 'credits', 'profile', 'notifications', 'preferences', 'approvals', 'medialib', 'billing', 'memberships', 'audit', 'flags', 'recents', 'favorites', 'content-templates', 'workflow-templates']);
      return segs.length > 0 && !reserved.has(segs[0]);
    }

    if (tabBasePath === '/studio') {
      return currentPath.startsWith('/studio');
    }

    if (tabBasePath === '/approvals') {
      return currentPath.startsWith('/approvals');
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
          </button>
        );
      })}
    </nav>
  );
}
