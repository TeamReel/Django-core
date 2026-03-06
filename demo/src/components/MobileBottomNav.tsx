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
  const [wizardMatchId, setWizardMatchId] = useState<string | undefined>(undefined);

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

  // Listen for external open-quick-create events (e.g. SmartEmptyState, match cards)
  useEffect(() => {
    const handler = (e: Event) => {
      const matchId = (e as CustomEvent)?.detail?.matchId;
      setWizardMatchId(matchId || undefined);
      setWizardOpen(true);
    };
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

  // Dynamic label: "Team" when on the team page itself, "Season" when deeper
  const isOnTeamPage = (() => {
    const segs = location.pathname.split('/').filter(Boolean);
    if (teamPath !== '/dashboard' && location.pathname === teamPath) return true;
    // Exactly 3 segments = org/club/team (no season)
    if (segs.length === 3 && teamPath !== '/dashboard') return true;
    return false;
  })();
  const hierarchyLabel = isOnTeamPage ? 'Team' : 'Season';

  // ── Tab definitions (excluding center + button) ─────────────────────
  const tabs = [
    { id: 'home', icon: Home, label: 'Home', path: '/dashboard' },
    { id: 'season', icon: CalendarDays, label: hierarchyLabel, path: seasonPath },
    // center + button is rendered separately
    { id: 'gallery', icon: Images, label: 'Gallery', path: '/studio' },
    { id: 'profile', icon: UserCircle, label: 'Profile', path: '/profile' },
  ];

  /** Reserved top-level paths that are NOT hierarchy (org/club/team/…) routes */
  const reservedPrefixes = new Set([
    'dashboard', 'login', 'register', 'studio', 'approvals', 'profile',
    'preferences', 'credits', 'memberships', 'billing', 'notifications',
    'settings', 'search', 'recents', 'favorites', 'directory', 'matches',
    'organisations', 'federations', 'clubs', 'teams', 'seasons',
    'competitions', 'users', 'permissions', 'content', 'contentlib',
    'apps', 'docs', '403', '404',
  ]);

  /** Check if a pathname looks like a hierarchy (vanity) route: /:org/:club/:team/… */
  const looksLikeHierarchyPath = (pathname: string): boolean => {
    const segs = pathname.split('/').filter(Boolean);
    if (segs.length < 3) return false; // need at least org/club/team
    return !reservedPrefixes.has(segs[0].toLowerCase());
  };

  const isActive = (tab: typeof tabs[0]) => {
    if (!tab.path) return false;
    const currentPath = location.pathname;

    if (tab.id === 'home') {
      return ['/', '/dashboard', '/recents', '/favorites', '/directory'].includes(currentPath);
    }

    if (tab.id === 'season') {
      // Primary: teamPath resolved from useAppSelection
      if (teamPath !== '/dashboard') {
        return currentPath === teamPath || currentPath.startsWith(teamPath + '/');
      }
      // Fallback for cold deeplinks: detect vanity hierarchy paths before useAppSelection resolves
      return looksLikeHierarchyPath(currentPath);
    }

    if (tab.id === 'gallery') {
      return currentPath.startsWith('/studio') || currentPath.startsWith('/approvals');
    }

    if (tab.id === 'profile') {
      return (
        currentPath.startsWith('/profile') ||
        currentPath.startsWith('/preferences') ||
        currentPath.startsWith('/credits') ||
        currentPath.startsWith('/memberships') ||
        currentPath.startsWith('/billing') ||
        currentPath.startsWith('/notifications') ||
        currentPath === '/settings'
      );
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
        className={`${styles.tab} ${active ? styles.active : ''}`}
      >
        {/* Icon with filled pill background when active */}
        <span className={styles.iconPill}>
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
      <nav className={styles.nav}>
        {/* Left tabs: Home, Season */}
        {tabs.slice(0, 2).map(renderTab)}

        {/* Center: raised + Create button */}
        <div className={styles.createWrap}>
          <button
            onClick={() => setWizardOpen(true)}
            aria-label="Create content"
            className={styles.createButton}
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
        onClose={() => { setWizardOpen(false); setWizardMatchId(undefined); }}
        initialMatchId={wizardMatchId}
      />
    </>
  );
}
