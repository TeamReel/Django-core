/**
 * MobileBottomNav - Bottom tab bar for mobile navigation (4 + 1 pattern)
 *
 * Layout: [ Home ] [ Search ] [ + Create ] [ Match ] [ Gallery ]
 *
 * The center + button is raised above the bar and opens the MatchWizard
 * for quick content creation. The other 4 tabs navigate to core destinations.
 *
 * Uses the active context API to resolve the current match path.
 * Only visible on mobile (<640px).
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Plus, Swords, Clapperboard } from 'lucide-react';
import { getActiveContext, ACTIVE_CONTEXT_CHANGED_EVENT } from '../utils/activeContext';
import { useAppSelection } from '../hooks/useAppSelection';
import MatchWizard from './MatchWizard';

interface MobileBottomNavProps {
  /** Callback to open search/command palette */
  onOpenSearch?: () => void;
}

export default function MobileBottomNav({ onOpenSearch }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgSlug, clubSlugOrId, teamSlugOrId, matchId: urlMatchId } = useAppSelection();

  const [activeMatchSlug, setActiveMatchSlug] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const fetchContext = useCallback(async () => {
    try {
      const ctx = await getActiveContext();
      setActiveMatchSlug(ctx?.match?.slug || ctx?.match?.id || null);
    } catch {
      setActiveMatchSlug(null);
    }
  }, []);

  useEffect(() => {
    fetchContext();
    const handler = () => fetchContext();
    window.addEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, handler);
    return () => window.removeEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, handler);
  }, [fetchContext]);

  // Listen for external open-quick-create events (e.g. SmartEmptyState)
  useEffect(() => {
    const handler = () => setWizardOpen(true);
    window.addEventListener('teamreel:open-quick-create', handler);
    return () => window.removeEventListener('teamreel:open-quick-create', handler);
  }, []);

  // Resolve match path
  const teamPath = orgSlug && clubSlugOrId && teamSlugOrId
    ? `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}`
    : orgSlug && clubSlugOrId
      ? `/${orgSlug}/${clubSlugOrId}`
      : '/dashboard';

  const resolvedMatchSlug = activeMatchSlug || urlMatchId;
  const matchPath = resolvedMatchSlug
    ? `/matches/${resolvedMatchSlug}`
    : teamPath !== '/dashboard'
      ? teamPath
      : '/dashboard';

  // ── Tab definitions (excluding center + button) ─────────────────────
  const tabs = [
    { id: 'home', icon: Home, label: 'Home', path: '/dashboard' },
    { id: 'search', icon: Search, label: 'Search', action: onOpenSearch },
    // center + button is rendered separately
    { id: 'match', icon: Swords, label: 'Match', path: matchPath },
    { id: 'gallery', icon: Clapperboard, label: 'Gallery', path: '/studio' },
  ];

  const isActive = (tab: typeof tabs[0]) => {
    if (!tab.path) return false;
    const currentPath = location.pathname;

    if (tab.id === 'home') {
      return currentPath === '/' || currentPath === '/dashboard' || currentPath === '/recents' || currentPath === '/favorites';
    }

    if (tab.id === 'match') {
      if (currentPath.startsWith('/matches/')) return true;
      const segs = currentPath.split('/').filter(Boolean);
      return segs.length >= 6;
    }

    if (tab.id === 'gallery') {
      return currentPath.startsWith('/studio');
    }

    return currentPath.startsWith(tab.path);
  };

  return (
    <>
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
          padding: '0 4px',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          zIndex: 1000,
        }}
      >
        {/* Left tabs: Home, Search */}
        {tabs.slice(0, 2).map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => tab.action ? tab.action() : tab.path && navigate(tab.path)}
              aria-label={tab.label}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                minWidth: '44px',
                minHeight: '44px',
                padding: '6px 4px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: active ? 'var(--app-primary)' : 'var(--app-muted-text)',
                transition: 'color 0.2s ease',
              }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400, lineHeight: 1 }}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Center: raised + Create button */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <button
            onClick={() => setWizardOpen(true)}
            aria-label="Create content"
            style={{
              position: 'absolute',
              bottom: '8px',
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: 'var(--app-primary, #3B8EA5)',
              color: 'white',
              border: '3px solid var(--app-surface)',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.93)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>

        {/* Right tabs: Match, Gallery */}
        {tabs.slice(2).map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => tab.action ? tab.action() : tab.path && navigate(tab.path)}
              aria-label={tab.label}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                minWidth: '44px',
                minHeight: '44px',
                padding: '6px 4px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: active ? 'var(--app-primary)' : 'var(--app-muted-text)',
                transition: 'color 0.2s ease',
              }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400, lineHeight: 1 }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* MatchWizard — opened by center + button */}
      <MatchWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />
    </>
  );
}
