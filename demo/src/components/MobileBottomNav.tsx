/**
 * MobileBottomNav - Bottom tab bar for mobile navigation (4 + 1 pattern)
 *
 * Layout: [ Home ] [ Season ] [ + Create ] [ Gallery ] [ Profile ]
 *
 * The center + button is raised above the bar and opens the MatchWizard
 * as a modal bottom sheet. The other 4 tabs navigate to core destinations.
 * Active tab shows a filled pill background in the theme primary color.
 *
 * Uses the active context API to resolve season paths.
 * Match access: via Dashboard card + floating banner on matchday.
 * Only visible on mobile (<640px).
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, CalendarDays, Plus, Images, UserCircle } from 'lucide-react';
import { getActiveContext, ACTIVE_CONTEXT_CHANGED_EVENT } from '../utils/activeContext';
import { useAppSelection } from '../hooks/useAppSelection';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import MatchWizard from './MatchWizard';
import styles from './MobileBottomNav.module.css';

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const haptic = useHapticFeedback();
  const { orgSlug, clubSlugOrId, teamSlugOrId } = useAppSelection();

  const [activeSeasonSlug, setActiveSeasonSlug] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const fetchContext = useCallback(async () => {
    try {
      const ctx = await getActiveContext();
      setActiveSeasonSlug(ctx?.season?.slug || ctx?.season?.id || null);
    } catch {
      setActiveSeasonSlug(null);
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

  // ── Path resolution ─────────────────────────────────────────────────
  const teamPath = orgSlug && clubSlugOrId && teamSlugOrId
    ? `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}`
    : orgSlug && clubSlugOrId
      ? `/${orgSlug}/${clubSlugOrId}`
      : '/dashboard';

  // Season tab: active season under the current team, or fallback to team page
  const seasonPath = activeSeasonSlug && teamPath !== '/dashboard'
    ? `${teamPath}/${activeSeasonSlug}`
    : teamPath;

  // ── Tab definitions (excluding center + button) ─────────────────────
  const tabs = [
    { id: 'home', icon: Home, label: 'Home', path: '/dashboard' },
    { id: 'season', icon: CalendarDays, label: 'Season', path: seasonPath },
    // center + button is rendered separately
    { id: 'gallery', icon: Images, label: 'Gallery', path: '/studio' },
    { id: 'profile', icon: UserCircle, label: 'Profile', path: '/profile' },
  ];

  const isActive = (tab: typeof tabs[0]) => {
    if (!tab.path) return false;
    const currentPath = location.pathname;

    if (tab.id === 'home') {
      return currentPath === '/' || currentPath === '/dashboard' || currentPath === '/recents' || currentPath === '/favorites';
    }

    if (tab.id === 'season') {
      // Active when on a team/season/competition path (4-6 path segments in vanity URLs)
      const segs = currentPath.split('/').filter(Boolean);
      if (segs.length >= 4 && segs.length <= 6) return true;
      return false;
    }

    if (tab.id === 'gallery') {
      return currentPath.startsWith('/studio');
    }

    if (tab.id === 'profile') {
      return currentPath.startsWith('/profile') || currentPath.startsWith('/preferences') || currentPath.startsWith('/credits');
    }

    return currentPath.startsWith(tab.path);
  };

  // ── Render a single tab button ──────────────────────────────────────
  const renderTab = (tab: typeof tabs[0]) => {
    const active = isActive(tab);
    const Icon = tab.icon;

    return (
      <button
        key={tab.id}
        onClick={() => { haptic.light(); tab.path && navigate(tab.path); }}
        aria-label={tab.label}
        aria-current={active ? 'page' : undefined}
        className={`flex-1 flex-col flex-center cursor-pointer transition ${styles.tab} ${active ? styles.active : ''}`}
      >
        {/* Icon with filled pill background when active */}
        <span className={`flex-center rounded-12 ${styles.iconPill}`}>
          <Icon
            size={20}
            strokeWidth={active ? 2.2 : 1.6}
            fill={active ? 'var(--app-primary)' : 'none'}
            color={active ? 'white' : 'var(--app-muted-text)'}
          />
        </span>
        <span className={styles.tabLabel}>
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <>
      <nav
        className={`mobile-bottom-nav fixed bg-surface border-top z-1000 safe-bottom ${styles.nav}`}
      >
        {/* Left tabs: Home, Season */}
        {tabs.slice(0, 2).map(renderTab)}

        {/* Center: raised + Create button */}
        <div className="flex-1 flex-center relative">
          <button
            onClick={() => setWizardOpen(true)}
            aria-label="Create content"
            className={`absolute rounded-full text-white cursor-pointer flex-center ${styles.createButton}`}
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>

        {/* Right tabs: Gallery, Profile */}
        {tabs.slice(2).map(renderTab)}
      </nav>

      {/* MatchWizard — opened by center + button */}
      <MatchWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />
    </>
  );
}
