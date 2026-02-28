/**
 * MobileBottomNav - Bottom tab bar for mobile navigation
 *
 * Displays a fixed bottom navigation bar on mobile with quick access to core pages.
 * Role-aware: hides admin-only items (Directory) for non-admin users and shows
 * contextual items (Team) instead.
 *
 * Uses the active context API to reliably resolve Match and Content paths,
 * even when the user is on a completely different page (e.g. dashboard).
 *
 * Swipe-up gesture opens QuickCreateFAB.
 *
 * Only visible on mobile (<640px)
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Sparkles, Swords, Library, Menu, Shirt, Clapperboard } from 'lucide-react';
import { useSwipeGesture } from '@django-core/design-system';
import { useUserRole } from './PermissionGuards';
import { useAppSelection } from '../hooks/useAppSelection';
import { getActiveContext, ACTIVE_CONTEXT_CHANGED_EVENT } from '../utils/activeContext';

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
  const { orgSlug, clubSlugOrId, teamSlugOrId, matchId: urlMatchId } = useAppSelection();

  // ── Active context state (fetched from API) ───────────────────────────
  const [activeMatchSlug, setActiveMatchSlug] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    try {
      const ctx = await getActiveContext();
      setActiveMatchSlug(ctx?.match?.slug || ctx?.match?.id || null);
    } catch {
      setActiveMatchSlug(null);
    }
  }, []);

  // Fetch on mount + listen for changes
  useEffect(() => {
    fetchContext();
    const handler = () => fetchContext();
    window.addEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, handler);
    return () => window.removeEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, handler);
  }, [fetchContext]);

  // Swipe-up opens QuickCreateFAB
  const swipeHandlers = useSwipeGesture({
    threshold: 40,
    onSwipeUp: () => {
      window.dispatchEvent(new CustomEvent('teamreel:open-quick-create'));
    },
  });

  // Build team path from active context
  const teamPath = orgSlug && clubSlugOrId && teamSlugOrId
    ? `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}`
    : orgSlug && clubSlugOrId
      ? `/${orgSlug}/${clubSlugOrId}`
      : '/dashboard';

  // Resolve match slug: prefer active context, then URL-parsed matchId
  const resolvedMatchSlug = activeMatchSlug || urlMatchId;

  // Match tab → active match page
  const matchPath = resolvedMatchSlug
    ? `/matches/${resolvedMatchSlug}`
    : teamPath !== '/dashboard'
      ? teamPath
      : '/dashboard';

  // Content tab → always gallery (/studio)
  const contentPath = '/studio';

  const tabs = [
    { id: 'home', icon: Home, label: 'Home', path: '/dashboard' },
    { id: 'team', icon: Shirt, label: 'Team', path: teamPath },
    { id: 'match', icon: Swords, label: 'Match', path: matchPath },
    { id: 'content', icon: Clapperboard, label: 'Content', path: contentPath },
    { id: 'more', icon: Menu, label: 'More', action: onToggleMenu },
  ];

  const isActive = (tab: typeof tabs[0]) => {
    if (!tab.path) return false;
    const currentPath = location.pathname;
    const tabBasePath = tab.path.split('?')[0];

    if (tabBasePath === '/dashboard') {
      return currentPath === '/' || currentPath === '/dashboard' || currentPath === '/recents' || currentPath === '/favorites';
    }

    if (tab.id === 'match') {
      // /matches/:slug OR /:org/:club/:project/:season/:competition/:match (6 segments)
      if (currentPath.startsWith('/matches/')) return true;
      const segs = currentPath.split('/').filter(Boolean);
      if (segs.length >= 6) return true;
      return false;
    }

    if (tab.id === 'team') {
      const segs = currentPath.split('/').filter(Boolean);
      const reserved = new Set(['dashboard', 'directory', 'content', 'studio', 'permissions', 'settings', 'health', 'docs', 'search', 'login', 'logout', 'organisations', 'users', 'credits', 'profile', 'notifications', 'preferences', 'approvals', 'medialib', 'billing', 'memberships', 'audit', 'flags', 'recents', 'favorites', 'content-templates', 'workflow-templates', 'matches']);
      // Exclude deep match paths (6+ segments = org/club/project/season/comp/match)
      if (segs.length >= 6) return false;
      return segs.length > 0 && !reserved.has(segs[0]);
    }

    if (tab.id === 'content') {
      return currentPath.startsWith('/studio');
    }

    return currentPath.startsWith(tabBasePath);
  };

  return (
    <nav
      className="mobile-bottom-nav"
      {...swipeHandlers}
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
              // Mobile accessibility: 44px minimum touch target (WCAG 2.5.5)
              minWidth: '44px',
              minHeight: '44px',
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
