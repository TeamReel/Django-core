import { routes } from '../routes';

/* ─── Types ─────────────────────────────────────────────────── */

export interface NotificationResponse {
  count: number;
  results: Array<{
    id: string;
    is_read: boolean;
    title?: string;
    message?: string;
    content?: string;
    action_url?: string | null;
    created_at?: string;
  }>;
}

export interface PhotoCompositeFollowUpInfo {
  membershipId: string;
  projectId: string;
  approvedImageUrl: string;
  memberName: string;
  backgroundUrl?: string;
}

export interface TopNavbarProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  isMobile?: boolean;
  /** Callback to receive the openSearch function reference */
  onOpenSearchRef?: (openSearch: () => void) => void;
}

/* ─── Constants ─────────────────────────────────────────────── */

export const CREATE_MENU_ITEMS = [
  { label: 'Content Library', path: routes.content(), hint: 'Create content for match/season' },
  { label: 'AI Studio', path: '/studio/create', hint: 'Generate content (AI)' },
  { label: 'Match', path: routes.directory({ tab: 'matches' }) + '&create=match', hint: 'Create a new match' },
  { label: 'Competition', path: routes.directory({ tab: 'competitions' }), hint: 'Go to competitions list' },
  { label: 'Season', path: routes.directory({ tab: 'seasons' }), hint: 'Go to seasons list' },
  { label: 'Team', path: routes.directory({ tab: 'teams' }), hint: 'Go to teams list' },
  { label: 'Club', path: routes.directory({ tab: 'clubs' }), hint: 'Go to clubs list' },
  { label: 'Federation', path: routes.orgCreate(), hint: 'Create a new federation' },
] as const;

/* ─── Pure helpers ──────────────────────────────────────────── */

export function isPlatformRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/health') ||
    pathname.startsWith('/cache-performance') ||
    pathname.startsWith('/flags') ||
    pathname.startsWith('/integration') ||
    pathname.startsWith('/design-system') ||
    pathname.startsWith('/observability') ||
    pathname.startsWith('/security') ||
    pathname.startsWith('/constitution') ||
    pathname.startsWith('/api-docs') ||
    pathname.startsWith('/platform')
  );
}

export function checkIsNonAppRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === routes.dashboard() ||
    pathname.startsWith(`${routes.dashboard()}/`) ||
    pathname === '/directory' ||
    pathname.startsWith('/directory/') ||
    pathname === '/apps' ||
    pathname === '/content' ||
    pathname === '/settings' ||
    pathname === '/medialib' ||
    pathname.startsWith('/medialib/') ||
    pathname === '/studio' ||
    pathname.startsWith('/studio/') ||
    pathname === '/content-templates' ||
    pathname.startsWith('/content-templates/') ||
    pathname === '/preferences' ||
    pathname.startsWith('/preferences/') ||
    pathname === '/permissions' ||
    pathname.startsWith('/permissions/') ||
    pathname === '/docs' ||
    pathname.startsWith('/docs/') ||
    pathname === '/recents' ||
    pathname === '/favorites' ||
    pathname === '/approvals' ||
    pathname.startsWith('/approvals/') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    isPlatformRoute(pathname)
  );
}
