/**
 * MobileBottomNav - Bottom tab bar for mobile navigation (4 + 1 pattern)
 *
 * Layout: [ Home ] [ My Team ] [ + Create ] [ Studio ] [ Profile ]
 *
 * The center + button is raised above the bar and opens the MatchWizard
 * as a modal bottom sheet. The other 4 tabs navigate to core destinations.
 * Active tab shows a filled pill background in the theme primary color.
 *
 * My Team resolves to the user's active team/season via useAppSelection(),
 * falling back to /directory?tab=clubs when no team is selected.
 * Only visible on mobile (<640px).
 */
import { memo, useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, CalendarDays, Plus, Images, UserCircle } from 'lucide-react';
import { useAppSelection } from '../hooks/useAppSelection';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useCreateContext } from '../hooks/useCreateContext';
import { preloadRoutes } from '../utils/preloadRoute';
import { routes } from '../routes';
const CreateWizard = lazy(() => import('./CreateWizard'));
import type { CreateFlowType } from './CreateWizard/CreateWizardContext';
import styles from './MobileBottomNav.module.css';

const MobileBottomNav = memo(function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const haptic = useHapticFeedback();
  const { orgSlug, clubSlugOrId, teamSlugOrId, myOrgSlug, myClubSlugOrId, myTeamSlugOrId } = useAppSelection();
  const { prefill: createPrefill } = useCreateContext();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMatchId, setWizardMatchId] = useState<string | undefined>(undefined);
  const [wizardAutoFlow, setWizardAutoFlow] = useState<CreateFlowType | undefined>(undefined);
  const [wizardSubtype, setWizardSubtype] = useState<string | undefined>(undefined);

  // Preload chunks for the 4 fixed bottom tabs on idle
  useEffect(() => {
    const preload = () => preloadRoutes(['/dashboard', '/studio', '/profile', '/approvals']);
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preload, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    } else {
      const timer = setTimeout(preload, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for external open-quick-create events (e.g. SmartEmptyState, match cards)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const matchId = detail?.matchId;
      const flow = detail?.flow as CreateFlowType | undefined;
      const subtype = detail?.subtype as string | undefined;
      setWizardMatchId(matchId || undefined);
      setWizardAutoFlow(flow || undefined);
      setWizardSubtype(subtype || undefined);
      setWizardOpen(true);
    };
    window.addEventListener('teamreel:open-quick-create', handler);
    return () => window.removeEventListener('teamreel:open-quick-create', handler);
  }, []);

  // ── "Mijn Team" path — always the user's OWN team, never last-visited ──
  const myOrg = myOrgSlug || orgSlug;
  const myClub = myClubSlugOrId || clubSlugOrId;
  const myTeam = myTeamSlugOrId || teamSlugOrId;

  const teamPath = myOrg && myClub && myTeam
    ? routes.team({ orgId: myOrg, clubId: myClub, projectId: myTeam })
    : myOrg && myClub
      ? routes.club({ orgId: myOrg, clubId: myClub })
      : routes.dashboard();

  // "Mijn Team" always navigates to the team hub (3-seg), NOT the season URL.
  // The hub auto-resolves the active season via TeamSeasonResolver.
  const myTeamPath = teamPath !== routes.dashboard()
    ? teamPath
    : '/directory?tab=clubs';

  // H1: Label is always "Mijn Team" regardless of role
  const hierarchyLabel = 'Mijn Team';

  // ── Tab definitions (excluding center + button) ─────────────────────
  const tabs = [
    { id: 'home', icon: Home, label: 'Home', path: routes.dashboard() },
    { id: 'season', icon: CalendarDays, label: hierarchyLabel, path: myTeamPath },
    // center + button is rendered separately
    { id: 'gallery', icon: Images, label: 'Studio', path: routes.studio() },
    { id: 'profile', icon: UserCircle, label: 'Profiel', path: routes.profile() },
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
      return ['/', routes.dashboard(), '/recents', '/favorites'].includes(currentPath);
    }

    if (tab.id === 'season') {
      // Active when viewing the user's own team OR any hierarchy path
      if (teamPath !== routes.dashboard()) {
        if (currentPath === teamPath || currentPath.startsWith(teamPath + '/')) return true;
      }
      // Fallback: directory page (when no team selected yet)
      if (currentPath.startsWith('/directory')) return true;
      // Any hierarchy (org/club/team/season) vanity path
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
        onClick={() => {
          haptic.light();
          if (!tab.path) return;
          // "Mijn Team": if already on the hub, reset to overview (strip ?tab=...)
          if (tab.id === 'season' && isActive(tab)) {
            const url = new URL(window.location.href);
            if (url.searchParams.has('tab')) {
              url.searchParams.delete('tab');
              navigate(`${url.pathname}${url.search}`, { replace: true });
            }
            return;
          }
          navigate(tab.path);
        }}
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
      <nav className={styles.nav} data-app-bottom-navbar="true">
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

      {/* CreateWizard — universal create flow via + button */}
      {wizardOpen && (
        <Suspense fallback={null}>
          <CreateWizard
            isOpen={wizardOpen}
            onClose={() => { setWizardOpen(false); setWizardMatchId(undefined); setWizardAutoFlow(undefined); setWizardSubtype(undefined); }}
            initialMatchId={wizardMatchId}
            initialFlow={wizardAutoFlow}
            initialSubtype={wizardSubtype}
            prefill={createPrefill}
          />
        </Suspense>
      )}
    </>
  );
});

export default MobileBottomNav;
