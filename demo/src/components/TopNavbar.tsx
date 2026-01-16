/**
 * TopNavbar - Docker-style mega menu navigation
 *
 * Architecture:
 * - Single shared mega menu panel anchored to navbar container (not per-item dropdowns)
 * - Panel is positioned absolutely, centered, with max-width constraint
 * - Multi-column grid layout (2-3 columns based on item count)
 *
 * Behavior:
 * - Desktop: Dropdowns open on hover with 200ms delay before closing
 * - Mobile/Touch: Dropdowns open on tap/click (mega menu hidden on mobile)
 * - Keyboard: Tab to navigate, Enter/Space to open, ESC to close
 * - Accessibility: Proper ARIA attributes (aria-haspopup, aria-expanded, aria-controls)
 * - Theme: Uses theme variables for consistent light/dark mode support
 *
 * Hover mechanism:
 * - Mouse enter trigger → open immediately, show mega panel for that group
 * - Mouse leave trigger → close after 200ms (allows moving to panel)
 * - Mouse enter mega panel → cancel close timer (keep open)
 * - Mouse leave mega panel → close after 200ms
 * - Only one mega panel visible at a time
 * - Hover disabled on touch devices
 */
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useSignOut } from '@django-core/auth-ui';
import { useTheme } from '@django-core/theme-system';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useUserRole } from './PermissionGuards';
import ProfileAvatarDropdown from './ProfileAvatarDropdown';
import { SearchBar } from './SearchBar';
import { fetchAllPages } from '../utils/fetchAllPages';
import { periodPathKey } from '../utils/periodPath';

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

interface NavItem {
  path: string;
  label: string;
  description?: string;
  icon?: string;
}

interface NotificationResponse {
  count: number;
  results: Array<{
    id: string;
    is_read: boolean;
  }>;
}

const navGroups: NavGroup[] = [
  {
    id: 'directory',
    label: 'Directory',
    items: [
      { path: '/directory', label: 'Directory', description: 'Central directory of all entities', icon: '📂' },
      { path: '/directory?tab=federations', label: 'Federations', description: 'Land/federation organisations (e.g., KNVB)', icon: '🏢' },
      { path: '/directory?tab=clubs', label: 'Clubs', description: 'Root projects (parent_project = null)', icon: '🏟️' },
      { path: '/directory?tab=teams', label: 'Teams', description: 'Child projects (parent_project != null)', icon: '⚽' },
      { path: '/directory?tab=seasons', label: 'Seasons', description: 'Team-scoped periods (parent_period = null)', icon: '🗓️' },
      { path: '/directory?tab=competitions', label: 'Competitions', description: 'Child periods under seasons', icon: '🏆' },
      { path: '/directory?tab=matches', label: 'Matches', description: 'Match activities (filter by team)', icon: '🎯' },
      { path: '/directory?tab=users', label: 'Users', description: 'Directory of members/players/staff', icon: '👥' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { path: '/content', label: 'Library', description: 'Generated content archive', icon: '🖼️' },
      { path: '/studio/create', label: 'AI Studio', description: 'Create content from activities', icon: '✨' },
      { path: '/notifications', label: 'Notifications', description: 'Updates and system messages', icon: '🔔' },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    items: [
      { path: '/credits', label: 'Pricing & Credits', description: 'Balance and transactions', icon: '💳' },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    items: [
      { path: '/docs', label: 'Guides', description: 'How-to and integration guides', icon: '📚' },
      { path: '/deployment', label: 'Deployment', description: 'Release and environment notes', icon: '🚀' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      { path: '/permissions', label: 'Permissions', description: 'Role-based access control', icon: '🔐' },
      { path: '/flags', label: 'Feature Flags', description: 'Feature toggles per organisation', icon: '🚩' },
      { path: '/security', label: 'Security', description: 'Access logs and events', icon: '🔒' },
      { path: '/integration-status', label: 'Integration Status', description: 'Module health overview', icon: '🔄' },
      { path: '/health', label: 'Health Check', description: 'System uptime and status', icon: '❤️' },
      { path: '/observability', label: 'Metrics', description: 'Performance monitoring', icon: '📊' },
      { path: '/usage-events', label: 'Usage Events', description: 'Analytics and tracking', icon: '📈' },
      { path: '/demo/performance', label: 'Cache Performance', description: 'Redis metrics', icon: '⚡' },
      { path: '/routing-logs', label: 'Notification Routing', description: 'Delivery decisions', icon: '🔀' },
      { path: '/api-docs', label: 'API Documentation', description: 'OpenAPI/Swagger specs', icon: '🔌' },
      { path: '/docs', label: 'Guides', description: 'Integration guides', icon: '📚' },
      { path: '/design-system', label: 'Design System', description: 'UI components library', icon: '🎨' },
      { path: '/theme', label: 'Theme Demo', description: 'Light/dark mode showcase', icon: '🎭' },
      { path: '/constitution', label: 'Constitution', description: 'Core principles', icon: '📜' },
      { path: '/deployment', label: 'Deployment', description: 'Release guides', icon: '🚀' },
    ],
  },
];

export default function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { signOut, loading: signOutLoading } = useSignOut();
  const { mode, setTheme } = useTheme();
  const { context } = useContextSwitcher();
  const debugLog = (...args: unknown[]) => {
    if (import.meta.env.DEV) console.log(...args);
  };
  const themeToggleEnabled = useFeatureFlag('dark_mode', true); // Theme toggle feature flag (resolved with org overrides)
  const [themeToggleGlobalEnabled, setThemeToggleGlobalEnabled] = useState<boolean>(true); // Global flag value (for superadmins)
  const { isSystemAdmin, isLandAdmin, isOrgAdmin, hasOrgRole } = useUserRole();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState<'EN' | 'NL' | 'DE' | 'IT' | 'FR'>('EN');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [myCreditsBalance, setMyCreditsBalance] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const orgIdForMyBalance = String((context as any)?.organisation?.id || '').trim();
  const currentUserId = (user as any)?.id;
  const myCreditsNumber = useMemo(() => {
    if (myCreditsBalance == null) return null;
    const n = Number(myCreditsBalance);
    return Number.isFinite(n) ? n : null;
  }, [myCreditsBalance]);
  const formattedCredits = useMemo(() => {
    if (myCreditsBalance == null) return null;
    const n = Number(myCreditsBalance);
    if (!Number.isFinite(n)) return String(myCreditsBalance);
    const rounded = Math.round(n);
    if (Math.abs(n - rounded) < 0.001) return String(rounded);
    return n.toFixed(2);
  }, [myCreditsBalance]);
  const creditsBadgeColor = useMemo(() => {
    if (myCreditsNumber == null) return '#6b7280'; // gray
    if (myCreditsNumber < 0) return '#dc3545'; // red
    if (myCreditsNumber === 0) return '#2563eb'; // blue
    return '#16a34a'; // green
  }, [myCreditsNumber]);
  const creditsTooltip = useMemo(() => {
    if (myCreditsBalance == null) return 'My balance';
    return `Credits: ${String(myCreditsBalance)}`;
  }, [myCreditsBalance]);

  type AppProjectRow = {
    id: string | number;
    name: string;
    slug: string;
    updated_at?: string;
    parent_id?: string | number | null;
    parent_name?: string | null;
  };

  type AppPeriodRow = {
    id: string;
    name?: string;
    start_date?: string | null;
    end_date?: string | null;
  };

  type AppSelection = {
    orgSlug: string;
    clubSlugOrId: string | null;
    teamSlugOrId: string | null;
    teamIdForApi: string | null;
    seasonSlugOrId: string | null;
    seasonIdForApi: string | null;
    competitionSlugOrId: string | null;
    competitionIdForApi: string | null;
    matchId: string | null;
  };

  const [appSelection, setAppSelection] = useState<AppSelection>({
    orgSlug: '',
    clubSlugOrId: null,
    teamSlugOrId: null,
    teamIdForApi: null,
    seasonSlugOrId: null,
    seasonIdForApi: null,
    competitionSlugOrId: null,
    competitionIdForApi: null,
    matchId: null,
  });

  const APP_LAST_CTX_KEY = 'demo_app_last_context_v1';

  const readLastAppContext = () => {
    try {
      const raw = localStorage.getItem(APP_LAST_CTX_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed as {
        orgSlug?: string;
        clubSlugOrId?: string;
        teamSlugOrId?: string;
        seasonSlugOrId?: string;
        competitionSlugOrId?: string;
        matchId?: string;
        ts?: number;
      };
    } catch {
      return null;
    }
  };

  const writeLastAppContext = (next: {
    orgSlug: string;
    clubSlugOrId?: string;
    teamSlugOrId?: string;
    seasonSlugOrId?: string;
    competitionSlugOrId?: string;
    matchId?: string;
  }) => {
    try {
      localStorage.setItem(
        APP_LAST_CTX_KEY,
        JSON.stringify({
          ...next,
          ts: Date.now(),
        })
      );
    } catch {
      // ignore
    }
  };

  // Track last visited club/team/season so the App menu can pick a stable "most recent" default.
  useEffect(() => {
    const path = location.pathname;

    const reservedRootSegments = new Set([
      '',
      'dashboard',
      'login',
      'register',
      'directory',
      'organisations',
      'projects',
      'matches',
      'health',
      'studio',
      'content',
      'notifications',
      'usage-events',
      'settings',
    ]);

    const vanityMatch = path.match(/^\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/);
    const vanityCompetition = path.match(/^\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/);
    const vanitySeason = path.match(/^\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/);
    const isVanity = (m: RegExpMatchArray | null) => Boolean(m && !reservedRootSegments.has(String(m[1] || '')));

    const hierarchyMatchTeam = path.match(
      /^\/organisations\/([^/]+)\/projects\/([^/]+)\/teams\/([^/]+)\/seasons\/([^/]+)\/competitions\/([^/]+)\/matches\/([^/]+)/
    );
    const hierarchyMatch = path.match(
      /^\/organisations\/([^/]+)\/projects\/([^/]+)\/seasons\/([^/]+)\/competitions\/([^/]+)\/matches\/([^/]+)/
    );
    const legacyMatch = path.match(/^\/matches\/([^/]+)/);

    const competitionTeamMatch = path.match(
      /^\/organisations\/([^/]+)\/projects\/([^/]+)\/teams\/([^/]+)\/seasons\/([^/]+)\/competitions\/([^/]+)/
    );
    const competitionMatch = path.match(
      /^\/organisations\/([^/]+)\/projects\/([^/]+)\/seasons\/([^/]+)\/competitions\/([^/]+)/
    );

    if (isVanity(vanityMatch)) {
      writeLastAppContext({
        orgSlug: vanityMatch![1],
        clubSlugOrId: vanityMatch![2],
        teamSlugOrId: vanityMatch![3],
        seasonSlugOrId: vanityMatch![4],
        competitionSlugOrId: vanityMatch![5],
        matchId: vanityMatch![6],
      });
      return;
    }

    if (isVanity(vanityCompetition)) {
      writeLastAppContext({
        orgSlug: vanityCompetition![1],
        clubSlugOrId: vanityCompetition![2],
        teamSlugOrId: vanityCompetition![3],
        seasonSlugOrId: vanityCompetition![4],
        competitionSlugOrId: vanityCompetition![5],
      });
      return;
    }

    if (isVanity(vanitySeason)) {
      writeLastAppContext({
        orgSlug: vanitySeason![1],
        clubSlugOrId: vanitySeason![2],
        teamSlugOrId: vanitySeason![3],
        seasonSlugOrId: vanitySeason![4],
      });
      return;
    }

    if (hierarchyMatchTeam) {
      writeLastAppContext({
        orgSlug: hierarchyMatchTeam[1],
        clubSlugOrId: hierarchyMatchTeam[2],
        teamSlugOrId: hierarchyMatchTeam[3],
        seasonSlugOrId: hierarchyMatchTeam[4],
        competitionSlugOrId: hierarchyMatchTeam[5],
        matchId: hierarchyMatchTeam[6],
      });
      return;
    }

    if (hierarchyMatch) {
      writeLastAppContext({
        orgSlug: hierarchyMatch[1],
        teamSlugOrId: hierarchyMatch[2],
        seasonSlugOrId: hierarchyMatch[3],
        competitionSlugOrId: hierarchyMatch[4],
        matchId: hierarchyMatch[5],
      });
      return;
    }

    if (competitionTeamMatch) {
      writeLastAppContext({
        orgSlug: competitionTeamMatch[1],
        clubSlugOrId: competitionTeamMatch[2],
        teamSlugOrId: competitionTeamMatch[3],
        seasonSlugOrId: competitionTeamMatch[4],
        competitionSlugOrId: competitionTeamMatch[5],
      });
      return;
    }

    if (competitionMatch) {
      writeLastAppContext({
        orgSlug: competitionMatch[1],
        teamSlugOrId: competitionMatch[2],
        seasonSlugOrId: competitionMatch[3],
        competitionSlugOrId: competitionMatch[4],
      });
      return;
    }

    if (legacyMatch) {
      const last = readLastAppContext();
      if (last?.orgSlug) {
        writeLastAppContext({
          orgSlug: String(last.orgSlug),
          clubSlugOrId: last.clubSlugOrId,
          teamSlugOrId: last.teamSlugOrId,
          seasonSlugOrId: last.seasonSlugOrId,
          competitionSlugOrId: last.competitionSlugOrId,
          matchId: legacyMatch[1],
        });
      }
      return;
    }

    const seasonTeamMatch = path.match(
      /^\/organisations\/([^/]+)\/projects\/([^/]+)\/teams\/([^/]+)\/seasons\/([^/]+)/
    );
    const teamMatch = path.match(
      /^\/organisations\/([^/]+)\/projects\/([^/]+)\/teams\/([^/]+)/
    );
    const clubMatch = path.match(
      /^\/organisations\/([^/]+)\/projects\/([^/]+)/
    );

    if (seasonTeamMatch) {
      writeLastAppContext({
        orgSlug: seasonTeamMatch[1],
        clubSlugOrId: seasonTeamMatch[2],
        teamSlugOrId: seasonTeamMatch[3],
        seasonSlugOrId: seasonTeamMatch[4],
      });
      return;
    }
    if (teamMatch) {
      writeLastAppContext({
        orgSlug: teamMatch[1],
        clubSlugOrId: teamMatch[2],
        teamSlugOrId: teamMatch[3],
      });
      return;
    }
    if (clubMatch) {
      writeLastAppContext({
        orgSlug: clubMatch[1],
        clubSlugOrId: clubMatch[2],
      });
    }
  }, [location.pathname]);

  // Resolve best-fit club/team/season for App menu based on the logged-in user's accessible projects.
  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    const isUuid = (value: unknown) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
    const isNumericId = (value: unknown) => /^\d+$/.test(String(value ?? '').trim());

    const pickBestByUpdatedOrName = (items: AppProjectRow[]): AppProjectRow | null => {
      const list = [...items];
      list.sort((a, b) => {
        const da = a.updated_at ? Date.parse(a.updated_at) : NaN;
        const db = b.updated_at ? Date.parse(b.updated_at) : NaN;
        const hasDa = Number.isFinite(da);
        const hasDb = Number.isFinite(db);
        if (hasDa && hasDb && da !== db) return db - da;
        if (hasDa && !hasDb) return -1;
        if (!hasDa && hasDb) return 1;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
      return list[0] || null;
    };

    const pickMostRecentSeason = (periods: AppPeriodRow[]): AppPeriodRow | null => {
      const list = [...periods];
      list.sort((a, b) => {
        const ea = a.end_date ? Date.parse(a.end_date) : NaN;
        const eb = b.end_date ? Date.parse(b.end_date) : NaN;
        const sa = a.start_date ? Date.parse(a.start_date) : NaN;
        const sb = b.start_date ? Date.parse(b.start_date) : NaN;
        const hasE = Number.isFinite(ea) && Number.isFinite(eb);
        if (hasE && ea !== eb) return eb - ea;
        const hasS = Number.isFinite(sa) && Number.isFinite(sb);
        if (hasS && sa !== sb) return sb - sa;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
      return list[0] || null;
    };

    const compute = async () => {
      if (!user) return;

      const path = location.pathname;
      const seasonTeamMatch = path.match(
        /^\/organisations\/([^/]+)\/projects\/([^/]+)\/teams\/([^/]+)\/seasons\/([^/]+)/
      );
      const seasonMatch = path.match(
        /^\/organisations\/([^/]+)\/projects\/([^/]+)\/seasons\/([^/]+)/
      );
      const teamMatch = path.match(
        /^\/organisations\/([^/]+)\/projects\/([^/]+)\/teams\/([^/]+)/
      );
      const clubMatch = path.match(
        /^\/organisations\/([^/]+)\/projects\/([^/]+)/
      );

      const orgFromPath = seasonTeamMatch?.[1] || seasonMatch?.[1] || teamMatch?.[1] || clubMatch?.[1] || null;
      const orgFromPathStr = String(orgFromPath || '');

      const contextOrgSlug = String((context as any)?.organisation?.slug || '');
      const contextOrgId = String((context as any)?.organisation?.id || '');

      const orgSlug =
        (orgFromPathStr && !isNumericId(orgFromPathStr) && !isUuid(orgFromPathStr))
          ? orgFromPathStr
          : (contextOrgSlug || orgFromPathStr || contextOrgId || '');

      if (!orgSlug) return;

      // If we're already on a canonical team/season route, prefer that immediately.
      if (seasonTeamMatch) {
        setAppSelection({
          orgSlug,
          clubSlugOrId: seasonTeamMatch[2],
          teamSlugOrId: seasonTeamMatch[3],
          teamIdForApi: null,
          seasonSlugOrId: seasonTeamMatch[4],
          seasonIdForApi: null,
          competitionSlugOrId: null,
          competitionIdForApi: null,
          matchId: null,
        });
        return;
      }
      if (teamMatch) {
        setAppSelection({
          orgSlug,
          clubSlugOrId: teamMatch[2],
          teamSlugOrId: teamMatch[3],
          teamIdForApi: null,
          seasonSlugOrId: null,
          seasonIdForApi: null,
          competitionSlugOrId: null,
          competitionIdForApi: null,
          matchId: null,
        });
        return;
      }
      if (clubMatch) {
        setAppSelection({
          orgSlug,
          clubSlugOrId: clubMatch[2],
          teamSlugOrId: null,
          teamIdForApi: null,
          seasonSlugOrId: null,
          seasonIdForApi: null,
          competitionSlugOrId: null,
          competitionIdForApi: null,
          matchId: null,
        });
        // continue resolving best team/season below (club-only path is not enough)
      }

      const last = readLastAppContext();

      // Fetch accessible clubs + teams for this organisation.
      const [clubs, teams] = await Promise.all([
        fetchAllPages<AppProjectRow>(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=500&parent_project__isnull=true`,
          { credentials: 'include' },
          { ttlMs: 120_000 }
        ),
        fetchAllPages<AppProjectRow>(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=2000&parent_project__isnull=false`,
          { credentials: 'include' },
          { ttlMs: 120_000 }
        ),
      ]);

      const clubsById = new Map<string, AppProjectRow>();
      const clubsBySlug = new Map<string, AppProjectRow>();
      for (const c of clubs || []) {
        clubsById.set(String(c.id), c);
        clubsBySlug.set(String(c.slug || ''), c);
      }

      let selectedTeam: AppProjectRow | null = null;

      // 1) Prefer last visited team (if it belongs to this org).
      if (last?.orgSlug && String(last.orgSlug) === String(orgSlug) && last.teamSlugOrId) {
        selectedTeam = (teams || []).find((t) => String(t.slug) === String(last.teamSlugOrId)) || null;
      }

      // 2) Else fall back to "most recent" (updated_at) then alphabetic.
      if (!selectedTeam) {
        selectedTeam = pickBestByUpdatedOrName(teams || []);
      }

      // Select club from team parent when possible, else last visited club, else alphabetic.
      let selectedClub: AppProjectRow | null = null;
      if (selectedTeam?.parent_id !== null && selectedTeam?.parent_id !== undefined) {
        selectedClub = clubsById.get(String(selectedTeam.parent_id)) || null;
      }
      if (!selectedClub && last?.orgSlug && String(last.orgSlug) === String(orgSlug) && last.clubSlugOrId) {
        selectedClub = clubsBySlug.get(String(last.clubSlugOrId)) || null;
      }
      if (!selectedClub) {
        const clubsSorted = [...(clubs || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        selectedClub = clubsSorted[0] || null;
      }

      // Resolve a best season for selected team.
      let selectedSeasonId: string | null = null;
      let selectedSeasonKey: string | null = null;
      if (selectedTeam) {
        try {
          const seasons = await fetchAllPages<AppPeriodRow>(
            `${apiBaseUrl}/api/v1/periods/?page_size=250&project_id=${encodeURIComponent(String(selectedTeam.id))}&type=season`,
            { credentials: 'include' },
            { ttlMs: 120_000, cacheKey: `GET:seasons:${orgSlug}:${selectedTeam.id}` }
          );

          // Prefer last visited season in this org.
          if (last?.orgSlug && String(last.orgSlug) === String(orgSlug) && last.seasonSlugOrId) {
            const match = (seasons || []).find((p) => {
              const key = periodPathKey(p);
              return key && String(key) === String(last.seasonSlugOrId);
            });
            if (match) {
              selectedSeasonId = String(match.id);
              selectedSeasonKey = periodPathKey(match) || String(match.id);
            }
          }

          if (!selectedSeasonKey) {
            const best = pickMostRecentSeason(seasons || []);
            if (best) {
              selectedSeasonId = String(best.id);
              selectedSeasonKey = periodPathKey(best) || String(best.id);
            }
          }
        } catch {
          // ignore
        }
      }

      // Resolve a best match for selected team+season.
      let selectedMatchId: string | null = null;
      if (last?.orgSlug && String(last.orgSlug) === String(orgSlug) && last.matchId) {
        selectedMatchId = String(last.matchId);
      }

      // Resolve a best match for selected competition.
      let selectedCompetitionSlugOrId: string | null = null;
      if (last?.orgSlug && String(last.orgSlug) === String(orgSlug) && last.competitionSlugOrId) {
        selectedCompetitionSlugOrId = String(last.competitionSlugOrId);
      }

      if (!selectedMatchId && selectedTeam?.id && selectedSeasonId) {
        try {
          const matches = await fetchAllPages<any>(
            `${apiBaseUrl}/api/v1/activities/?page_size=5&project_id=${encodeURIComponent(String(selectedTeam.id))}&period_id=${encodeURIComponent(String(selectedSeasonId))}&include_descendants=true&activity_type=match&ordering=-start_time`,
            { credentials: 'include' },
            { ttlMs: 30_000, cacheKey: `GET:matches:season:${orgSlug}:${selectedTeam.id}:${selectedSeasonId}` }
          );
          const bestMatch = (matches || [])[0];
          if (bestMatch?.id) selectedMatchId = String(bestMatch.id);
          if (!selectedCompetitionSlugOrId) {
            const compId = String(bestMatch?.period_id || bestMatch?.period?.id || bestMatch?.period || '').trim();
            if (compId) selectedCompetitionSlugOrId = compId;
          }
        } catch {
          // ignore
        }
      }

      setAppSelection({
        orgSlug,
        clubSlugOrId: selectedClub ? String(selectedClub.slug || selectedClub.id) : null,
        teamSlugOrId: selectedTeam ? String(selectedTeam.slug || selectedTeam.id) : null,
        teamIdForApi: selectedTeam ? String(selectedTeam.id) : null,
        seasonSlugOrId: selectedSeasonKey,
        seasonIdForApi: selectedSeasonId,
        competitionSlugOrId: selectedCompetitionSlugOrId,
        competitionIdForApi: selectedCompetitionSlugOrId,
        matchId: selectedMatchId,
      });
    };

    compute();
  }, [context, location.pathname, user]);

  const appNavGroup = useMemo<NavGroup>(() => {
    const orgSlug =
      appSelection.orgSlug ||
      String((context as any)?.organisation?.slug || (context as any)?.organisation?.id || '');
    const clubSlugOrId = appSelection.clubSlugOrId;
    const teamSlugOrId = appSelection.teamSlugOrId;
    const seasonSlugOrId = appSelection.seasonSlugOrId;
    const competitionSlugOrId = appSelection.competitionSlugOrId;
    const matchId = appSelection.matchId;

    // IMPORTANT: The "App" dropdown must never route to directory-tab redirects.
    // - /organisations                  -> redirects to /directory?tab=federations
    // - /organisations/:orgId/projects   -> redirects to /directory?tab=clubs
    // So we always fall back "up" to the nearest available *detail* route.
    const federationPath = orgSlug ? `/${orgSlug}` : '/dashboard';

    const clubPath = orgSlug && clubSlugOrId
      ? `/${orgSlug}/${clubSlugOrId}`
      : federationPath;

    // If clubId is unknown, fall back to an organisations-based detail route (not a directory-tab redirect).
    const teamPath = orgSlug && clubSlugOrId && teamSlugOrId
      ? `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}`
      : (orgSlug && teamSlugOrId
        ? `/organisations/${orgSlug}/projects/${teamSlugOrId}`
        : clubPath);

    const seasonPath = orgSlug && clubSlugOrId && teamSlugOrId && seasonSlugOrId
      ? `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}/${seasonSlugOrId}`
      : teamPath;

    const competitionPath = orgSlug && clubSlugOrId && teamSlugOrId && seasonSlugOrId && competitionSlugOrId
      ? `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}/${seasonSlugOrId}/${competitionSlugOrId}`
      : seasonPath;

    const matchPath = matchId && orgSlug && clubSlugOrId && teamSlugOrId && seasonSlugOrId && competitionSlugOrId
      ? `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}/${seasonSlugOrId}/${competitionSlugOrId}/${matchId}`
      : (matchId ? `/matches/${matchId}` : competitionPath);

    return {
      id: 'app',
      label: 'App',
      items: [
        { path: federationPath, label: 'Federation', description: 'Current federation (organisation)', icon: '🏢' },
        { path: clubPath, label: 'Club', description: 'Your club (best match)', icon: '🏟️' },
        { path: teamPath, label: 'Team', description: 'Your team (best match)', icon: '⚽' },
        { path: seasonPath, label: 'Season', description: 'Your season (best match)', icon: '🗓️' },
        { path: competitionPath, label: 'Competition', description: 'Your competition (best match)', icon: '🏆' },
        { path: matchPath, label: 'Match', description: 'Your match (best match)', icon: '🎯' },
      ],
    };
  }, [appSelection, context]);

  // Docker-style hover timers
  const hoverTimerRef = useRef<Record<string, NodeJS.Timeout>>({});
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDropdownHoveredRef = useRef(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const currentThemeMode = mode || 'light';

  // Detect touch device
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('touchstart', checkTouch, { once: true });
  }, []);

  // Docker-style hover handlers
  const handleMouseEnterTrigger = useCallback((groupId: string) => {
    if (isTouchDevice) return; // Disable hover on touch devices

    // Clear any pending close timer
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    // Open immediately on hover
    setOpenDropdown(groupId);
  }, [isTouchDevice]);

  const handleMouseLeaveTrigger = useCallback((groupId: string) => {
    if (isTouchDevice) return;

    // If we are already hovering the dropdown (due to overlap), don't close
    if (isDropdownHoveredRef.current) {
      return;
    }

    // Delay closing to allow moving to dropdown panel
    closeTimerRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 300); // Increased from 200ms to 300ms
  }, [isTouchDevice]);

  const handleMouseEnterDropdown = useCallback((groupId: string) => {
    if (isTouchDevice) return;
    isDropdownHoveredRef.current = true;

    // Cancel close timer when entering dropdown
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [isTouchDevice]);

  const handleMouseLeaveDropdown = useCallback((groupId: string) => {
    if (isTouchDevice) return;
    isDropdownHoveredRef.current = false;

    // Close after delay when leaving dropdown
    closeTimerRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 200);
  }, [isTouchDevice]);

  // Click handler for touch devices
  const handleClickTrigger = useCallback((groupId: string, e: React.MouseEvent) => {
    if (!isTouchDevice) return; // Only handle clicks on touch devices

    e.preventDefault();
    setOpenDropdown(prev => prev === groupId ? null : groupId);
  }, [isTouchDevice]);

  // Keyboard handler
  const handleKeyDown = useCallback((groupId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpenDropdown(prev => prev === groupId ? null : groupId);
    } else if (e.key === 'Escape') {
      setOpenDropdown(null);
    }
  }, []);

  // For superadmins: Fetch the global flag value (not resolved with org overrides)
  useEffect(() => {
    if (!isSystemAdmin) return; // Only for superadmins

    const fetchGlobalFlag = async () => {
      try {
        // Fetch flags without org context to get global values
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${baseUrl}/api/v1/settings/feature-flags/resolve-all/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const flags = data.data?.results || data.results || data.data || data || [];
          const themeFlag = flags.find((f: any) => f.key === 'dark_mode');

          if (themeFlag) {
            // For superadmins, ONLY use global_value (ignore resolved/org overrides)
            const globalValue = themeFlag.global_value !== null && themeFlag.global_value !== undefined
              ? themeFlag.global_value
              : true; // Default to true if no global value found
            debugLog('[TopNavbar] Global dark_mode flag for superadmin:', globalValue, 'raw:', themeFlag);
            setThemeToggleGlobalEnabled(globalValue);
          }
        }
      } catch (err) {
        console.error('[TopNavbar] Error fetching global flag:', err);
      }
    };

    fetchGlobalFlag();

    // Listen for feature flag changes
    const handleFlagChange = () => {
      debugLog('[TopNavbar] Feature flags changed, refetching global flag');
      fetchGlobalFlag();
    };

    window.addEventListener('storage', handleFlagChange);
    window.addEventListener('featureFlagsChanged' as any, handleFlagChange);

    return () => {
      window.removeEventListener('storage', handleFlagChange);
      window.removeEventListener('featureFlagsChanged' as any, handleFlagChange);
    };
  }, [isSystemAdmin]);

  // Load language from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('demo_language') as 'EN' | 'NL' | 'DE';
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  const handleLanguageChange = (lang: 'EN' | 'NL' | 'DE' | 'IT' | 'FR') => {
    debugLog('Language change clicked:', lang);
    setLanguage(lang);
    localStorage.setItem('demo_language', lang);
    setLanguageMenuOpen(false);
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    debugLog('Language changed event dispatched');
  };

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setTheme({ mode: newMode });
  };

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        debugLog('[TopNavbar] Fetching notifications from:', `${apiBaseUrl}/api/v1/user-notifications/`);
        const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data: NotificationResponse = await response.json();
          debugLog('[TopNavbar] Notifications API response:', data);

          // Handle B13 envelope structure
          const notifications = data.results
            || (data as any).data?.results
            || (data as any).data?.data
            || (data as any).data
            || [];
          debugLog('[TopNavbar] Parsed notifications:', notifications);

          const unread = Array.isArray(notifications)
            ? notifications.filter(n => !n.is_read).length
            : 0;
          debugLog('[TopNavbar] Unread count:', unread);
          setUnreadCount(unread);
        } else {
          console.error('[TopNavbar] Notifications API error:', response.status, response.statusText);
        }
      } catch (err) {
        console.error('Failed to fetch notification count:', err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);

    const handleNotificationChange = () => fetchUnreadCount();
    window.addEventListener('notificationChanged', handleNotificationChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationChanged', handleNotificationChange);
    };
  }, [user]);

  // Fetch current user's credits (within selected organisation)
  useEffect(() => {
    if (!user) {
      setMyCreditsBalance(null);
      return;
    }
    if (!orgIdForMyBalance) {
      setMyCreditsBalance(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const fetchBalance = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(
          `${apiBaseUrl}/api/v1/transactions/organizations/${encodeURIComponent(orgIdForMyBalance)}/balance/me/`,
          { credentials: 'include', signal: controller.signal }
        );
        if (!response.ok) return;
        const raw = await response.json();
        const data = (raw as any)?.data ?? raw;
        const v = (data as any)?.current_balance;
        if (!cancelled) setMyCreditsBalance(v != null ? String(v) : null);
      } catch {
        // ignore
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
  }, [orgIdForMyBalance, user]);

  // Filter based on permissions (keep Admin grouped; only show what the user can access)
  const isAdmin = isSystemAdmin || isLandAdmin;
  const navGroupsWithApp = useMemo(() => [appNavGroup, ...navGroups], [appNavGroup]);

  const filteredNavGroups = navGroupsWithApp.map(group => {
    const items = group.items.filter(item => {
      // Admin group: superadmin or land admin only
      if (group.id === 'admin') {
        return isAdmin;
      }

      // Users/Credits/Audit are tenant admin pages (org/club/team admins + superadmin)
      if (['/credits', '/audit', '/users'].includes(item.path)) {
        return isSystemAdmin || isOrgAdmin;
      }

      // Support docs/deployment are admin-only routes
      if (['/docs', '/deployment'].includes(item.path)) {
        return isAdmin;
      }

      // App pages: everyone
      return true;
    });

    return { ...group, items };
  }).filter(group => group.items.length > 0);

  // Add Dashboard as a standalone item
  const dashboardItem = { path: '/dashboard', label: 'Dashboard', icon: '🏠' };

  const isItemActive = (path: string): boolean => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isGroupActive = (group: NavGroup): boolean => {
    return group.items.some(item => isItemActive(item.path));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside both trigger containers AND mega menu panel
      if (openDropdown && !target.closest('.nav-dropdown-container') && !target.closest('#mega-menu-panel')) {
        setOpenDropdown(null);
      }
      if (languageMenuOpen && !target.closest('.language-menu-container')) {
        setLanguageMenuOpen(false);
      }
    };

    if (openDropdown || languageMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown, languageMenuOpen]);

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      Object.values(hoverTimerRef.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Get column count based on item count (Docker-style)
  const getColumnCount = (itemCount: number): number => {
    if (itemCount <= 6) return 1; // Single column for small menus
    if (itemCount <= 14) return 2; // Two columns for medium menus
    return 3; // Three columns for large menus
  };

  // Get the active group for mega menu
  const activeGroup = openDropdown ? filteredNavGroups.find(g => g.id === openDropdown) : null;

  return (
    <div style={{ height: '57px', position: 'relative', zIndex: 500 }}>
      <nav style={{
        backgroundColor: 'var(--app-surface)',
        borderBottom: '1px solid var(--app-border)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 500,
        overflow: 'visible',
      }}>
        <div style={{
          maxWidth: '100%',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          height: '56px',
        }}>
          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--app-text)',
              padding: '8px',
              marginRight: '8px',
            }}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>

          {/* Left side: Navigation items */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flex: 1,
            flexWrap: 'nowrap',
            height: '100%',
          }} className="desktop-nav">
            {/* Dashboard link */}
            <Link
              to={dashboardItem.path}
              title={dashboardItem.label}
              aria-label={dashboardItem.label}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                textDecoration: 'none',
                color: isItemActive(dashboardItem.path) ? '#2563eb' : 'var(--app-text)',
                backgroundColor: isItemActive(dashboardItem.path) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                fontWeight: isItemActive(dashboardItem.path) ? 600 : 500,
                fontSize: '14px',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '16px' }}>{dashboardItem.icon}</span>
            </Link>

            {/* Group triggers */}
            {filteredNavGroups.map(group => {
              const isActive = isGroupActive(group);
              const isOpen = openDropdown === group.id;

              return (
                <div
                  key={group.id}
                  className="nav-dropdown-container"
                  style={{
                    position: 'relative',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <button
                    onClick={(e) => handleClickTrigger(group.id, e)}
                    onKeyDown={(e) => handleKeyDown(group.id, e)}
                    onMouseEnter={() => handleMouseEnterTrigger(group.id)}
                    onMouseLeave={() => {
                      handleMouseLeaveTrigger(group.id);
                    }}
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    aria-controls={`mega-menu-panel`}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      color: isActive ? '#2563eb' : 'var(--app-text)',
                      backgroundColor: isActive || isOpen ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{group.label}</span>
                    <span style={{ fontSize: '10px', transition: 'transform 0.2s' }}>{isOpen ? '▴' : '▾'}</span>
                  </button>

                  {/* Mega Menu Panel for this group */}
                  {isOpen && (
                    <div
                      id={`mega-menu-panel-${group.id}`}
                      role="menu"
                      onMouseEnter={() => handleMouseEnterDropdown(group.id)}
                      onMouseLeave={() => handleMouseLeaveDropdown(group.id)}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% - 10px)', // Overlap by 10px
                        left: '0',
                        paddingTop: '10px', // Push content down
                        minWidth: '600px',
                        zIndex: 100,
                      }}
                    >
                      <div style={{
                        backgroundColor: 'var(--app-surface)',
                        border: '1px solid var(--app-border)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                        padding: '20px',
                      }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${getColumnCount(group.items.length)}, minmax(0, 1fr))`,
                          columnGap: '40px',
                          rowGap: '10px',
                        }}
                      >
                        {group.items.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            role="menuitem"
                            onClick={() => setOpenDropdown(null)}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                              padding: '10px 12px',
                              textDecoration: 'none',
                              color: isItemActive(item.path) ? '#2563eb' : 'var(--app-text)',
                              backgroundColor: isItemActive(item.path) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                              borderRadius: '10px',
                              transition: 'background-color 0.15s',
                              pointerEvents: 'auto',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              if (!isItemActive(item.path)) {
                                e.currentTarget.style.backgroundColor = 'var(--app-surface-2)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isItemActive(item.path)) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            {item.icon && <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>{item.icon}</span>}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                              <span style={{
                                fontSize: '14px',
                                fontWeight: isItemActive(item.path) ? 600 : 500,
                                lineHeight: '1.3',
                              }}>
                                {item.label}
                              </span>
                              {item.description && (
                                <span style={{
                                  fontSize: '12px',
                                  color: 'var(--app-muted-text)',
                                  lineHeight: '1.3',
                                }}>
                                  {item.description}
                                </span>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right side: User controls */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Search Bar */}
            <div
              className="nav-search-container"
              style={{
                flex: '1 1 360px',
                minWidth: '220px',
                maxWidth: '560px',
              }}
            >
              <SearchBar placeholder="Search..." />
            </div>

            {/* Theme Toggle - for superadmin: check global flag only, for others: check resolved flag (with org overrides) */}
            {(isSystemAdmin ? themeToggleGlobalEnabled : themeToggleEnabled) && (
              <button
                onClick={toggleTheme}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--app-text)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '20px',
                  position: 'relative',
                  zIndex: 1000,
                  pointerEvents: 'auto',
                  color: 'var(--app-text)',
                }}
                title={`Switch to ${currentThemeMode === 'light' ? 'dark' : 'light'} mode`}
                aria-label={`Switch to ${currentThemeMode === 'light' ? 'dark' : 'light'} mode`}
              >
                ◐
              </button>
            )}

            {/* Language Switcher */}
            <div className="language-menu-container" style={{ position: 'relative' }}>
              <button
                onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--app-border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--app-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                aria-label="Select language"
              >
                🌐 {language} <span style={{ fontSize: '10px' }}>{languageMenuOpen ? '▴' : '▾'}</span>
              </button>

              {languageMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: 'var(--app-surface)',
                  border: '1px solid var(--app-border)',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  minWidth: '120px',
                  zIndex: 1000,
                }}>
                  {(['EN', 'NL', 'DE', 'IT', 'FR'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 16px',
                        textAlign: 'left',
                        border: 'none',
                        backgroundColor: language === lang ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        color: language === lang ? 'var(--app-link)' : 'var(--app-text)',
                        fontWeight: language === lang ? 600 : 400,
                        fontSize: '14px',
                        cursor: 'pointer',
                        borderBottom: lang !== 'FR' ? '1px solid var(--app-border)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (language !== lang) {
                          e.currentTarget.style.backgroundColor = 'var(--app-surface-secondary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (language !== lang) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Icon */}
            <button
              onClick={() => navigate('/notifications')}
              style={{
                position: 'relative',
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '20px'
              }}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Credits / Transactions Icon */}
            {user ? (
              <button
                className="nav-credits-button"
                onClick={() => {
                  const id = Number(currentUserId);
                  if (!Number.isFinite(id)) return;
                  navigate(`/users/${id}?tab=balance`);
                }}
                style={{
                  position: 'relative',
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: 'var(--app-text)',
                }}
                title={creditsTooltip}
                aria-label="My balance"
              >
                🪙
                {formattedCredits != null && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      backgroundColor: creditsBadgeColor,
                      color: 'white',
                      borderRadius: '10px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                    }}
                  >
                    {formattedCredits}
                  </span>
                )}
              </button>
            ) : null}

            {/* Profile Avatar Dropdown */}
            <ProfileAvatarDropdown />
          </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link
                to="/login"
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: 'var(--app-text)',
                  border: '1px solid var(--app-border)',
                }}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: 'white',
                  backgroundColor: '#2563eb',
                  border: '1px solid #2563eb',
                }}
              >
                Register
              </Link>
            </div>
          )}
      </div>

      <style>{`
        .nav-search-container {
          transition: max-width 160ms ease, flex-basis 160ms ease;
        }
        .nav-search-container:focus-within {
          max-width: 820px !important;
          flex-basis: 640px;
        }
        @media (max-width: 1024px) {
          .mobile-menu-button {
            display: block !important;
          }
          .desktop-nav {
            display: none !important;
          }
          .desktop-only {
            display: none !important;
          }
          .nav-credits-button {
            display: none !important;
          }
          #mega-menu-panel {
            display: none !important;
          }
          .nav-search-container {
            width: auto !important;
            flex: 1;
            min-width: 120px;
            max-width: none !important;
          }
        }
        @media (max-width: 480px) {
          .language-menu-container {
            display: none !important;
          }
          .hide-on-mobile {
            display: none !important;
          }
          .nav-search-container {
            min-width: 120px;
          }
        }
      `}</style>
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '48px',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--app-surface)',
          borderTop: '1px solid var(--app-border)',
          overflowY: 'auto',
          zIndex: 999,
          padding: '16px',
        }}>
          {/* Dashboard */}
          <Link
            to={dashboardItem.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              marginBottom: '8px',
              borderRadius: '6px',
              textDecoration: 'none',
              color: isItemActive(dashboardItem.path) ? '#2563eb' : 'var(--app-text)',
              backgroundColor: isItemActive(dashboardItem.path) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              fontWeight: isItemActive(dashboardItem.path) ? 600 : 500,
            }}
          >
            <span>{dashboardItem.icon}</span>
            <span>{dashboardItem.label}</span>
          </Link>

          {/* Groups */}
          {filteredNavGroups.map(group => (
            <div key={group.id} style={{ marginBottom: '16px' }}>
              <div style={{
                padding: '8px 12px',
                fontWeight: 600,
                color: 'var(--app-text)',
                fontSize: '14px',
                opacity: 0.7,
              }}>
                {group.label}
              </div>
              {group.items.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    marginLeft: '12px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: isItemActive(item.path) ? '#2563eb' : 'var(--app-text)',
                    backgroundColor: isItemActive(item.path) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    fontWeight: isItemActive(item.path) ? 600 : 400,
                    fontSize: '14px',
                  }}
                >
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}

          {/* Mobile User Controls */}
          {user && (
            <div style={{ borderTop: '1px solid var(--app-border)', marginTop: '16px', paddingTop: '16px', padding: '16px' }}>
              <ProfileAvatarDropdown />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
