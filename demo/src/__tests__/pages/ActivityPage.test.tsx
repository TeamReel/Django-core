/**
 * ActivityPage tests (F17)
 *
 * Tests: role gate, loading state, empty state, error state, filter bar, item rendering.
 * API and role hooks are mocked — no real network calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test';
import ActivityPage from '../../pages/ActivityPage';
import type { ActivityLogItem } from '@/types/api';

/* ── Mocks ─────────────────────────────────────────────────────── */

const mockUseActivityFeed = vi.fn();

vi.mock('@/hooks/useActivityFeed', () => ({
  useActivityFeed: (...args: unknown[]) => mockUseActivityFeed(...args),
}));

const mockUseUserRole = vi.fn();

vi.mock('../../components/PermissionGuards', () => ({
  useUserRole: () => mockUseUserRole(),
}));

vi.mock('@django-core/context-switcher', () => ({
  useContextSwitcher: () => ({
    context: {
      organisation: { id: 'org-1', name: 'FC Test' },
    },
  }),
}));

vi.mock('../../providers/BackNavigationProvider', () => ({
  useSetBackNavigation: vi.fn(),
}));

vi.mock('../../components/ui/PageHeader', () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

/* ── Helpers ───────────────────────────────────────────────────── */

function buildItem(overrides: Partial<ActivityLogItem> = {}): ActivityLogItem {
  return {
    id: 'evt-1',
    verb: 'content.created',
    actor_id: 'u-1',
    actor_email: 'coach@club.nl',
    organisation_id: 'org-1',
    target_type: 'content',
    target_object_id: 'c-1',
    created_at: new Date().toISOString(),
    metadata: {},
    ...overrides,
  };
}

function defaultFeedReturn(overrides: Record<string, unknown> = {}) {
  return {
    items: [],
    groups: [],
    loading: false,
    loadingMore: false,
    error: null,
    hasMore: false,
    loadMore: vi.fn(),
    refresh: vi.fn(),
    unreadCount: 0,
    markRead: vi.fn(),
    ...overrides,
  };
}

function adminRole() {
  return {
    isOrgAdmin: true,
    isCoach: false,
    isLandAdmin: false,
    isSystemAdmin: false,
    isPlayer: false,
    isSupporter: false,
    hasOrgRole: true,
  };
}

function playerRole() {
  return {
    isOrgAdmin: false,
    isCoach: false,
    isLandAdmin: false,
    isSystemAdmin: false,
    isPlayer: true,
    isSupporter: false,
    hasOrgRole: false,
  };
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe('ActivityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUserRole.mockReturnValue(adminRole());
    mockUseActivityFeed.mockReturnValue(defaultFeedReturn());
  });

  it('renders page header', () => {
    renderWithProviders(<ActivityPage />);
    expect(screen.getByText('Activiteit')).toBeInTheDocument();
  });

  it('renders filter bar with all category buttons', () => {
    renderWithProviders(<ActivityPage />);
    const toolbar = screen.getByRole('toolbar');
    expect(within(toolbar).getByText('Alles')).toBeInTheDocument();
    expect(within(toolbar).getByText('Content')).toBeInTheDocument();
    expect(within(toolbar).getByText('Leden')).toBeInTheDocument();
    expect(within(toolbar).getByText('Wedstrijden')).toBeInTheDocument();
    expect(within(toolbar).getByText('Seizoenen')).toBeInTheDocument();
  });

  it('defaults to "Alles" filter as active', () => {
    renderWithProviders(<ActivityPage />);
    const allesBtn = screen.getByRole('button', { name: 'Alles' });
    expect(allesBtn).toHaveAttribute('aria-pressed', 'true');
  });

  /* ── Role gate ──────────────────────────────────────────────── */

  it('redirects non-admin/coach users to dashboard', () => {
    mockUseUserRole.mockReturnValue(playerRole());
    renderWithProviders(<ActivityPage />, {
      routerProps: { initialEntries: ['/activity'] },
    });
    // Navigate component redirects — page content should not render
    expect(screen.queryByText('Activiteit')).not.toBeInTheDocument();
  });

  /* ── Loading state ──────────────────────────────────────────── */

  it('shows loading skeletons when loading', () => {
    mockUseActivityFeed.mockReturnValue(defaultFeedReturn({ loading: true }));
    const { container } = renderWithProviders(<ActivityPage />);
    // Skeletons render as divs with skeleton class
    const skeletons = container.querySelectorAll('[class*="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  /* ── Empty state ────────────────────────────────────────────── */

  it('shows empty state when no items', () => {
    renderWithProviders(<ActivityPage />);
    expect(screen.getByText('Nog geen activiteit')).toBeInTheDocument();
  });

  /* ── Error state ────────────────────────────────────────────── */

  it('shows error state with retry button', async () => {
    const refreshFn = vi.fn();
    mockUseActivityFeed.mockReturnValue(
      defaultFeedReturn({ error: 'Network error', refresh: refreshFn }),
    );

    renderWithProviders(<ActivityPage />);
    expect(screen.getByText('Kon activiteiten niet laden')).toBeInTheDocument();

    const retryBtn = screen.getByText('Opnieuw proberen');
    await userEvent.setup().click(retryBtn);
    expect(refreshFn).toHaveBeenCalled();
  });

  /* ── Items rendering ────────────────────────────────────────── */

  it('renders activity items grouped by day', () => {
    const items = [
      buildItem({ id: 'evt-1', verb: 'content.created', actor_email: 'alice@club.nl' }),
      buildItem({ id: 'evt-2', verb: 'member.added', actor_email: 'bob@club.nl' }),
    ];
    mockUseActivityFeed.mockReturnValue(defaultFeedReturn({ items }));

    renderWithProviders(<ActivityPage />);

    expect(screen.getByText('Vandaag')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  /* ── Load more ──────────────────────────────────────────────── */

  it('shows load more button when hasMore is true', async () => {
    const loadMoreFn = vi.fn();
    mockUseActivityFeed.mockReturnValue(
      defaultFeedReturn({
        items: [buildItem()],
        hasMore: true,
        loadMore: loadMoreFn,
      }),
    );

    renderWithProviders(<ActivityPage />);

    const btn = screen.getByText('Meer laden');
    await userEvent.setup().click(btn);
    expect(loadMoreFn).toHaveBeenCalled();
  });

  /* ── Filter switching ───────────────────────────────────────── */

  it('switches category filter', async () => {
    const items = [
      buildItem({ id: 'evt-1', verb: 'content.created' }),
      buildItem({ id: 'evt-2', verb: 'member.added' }),
    ];
    mockUseActivityFeed.mockReturnValue(defaultFeedReturn({ items }));

    const user = userEvent.setup();
    renderWithProviders(<ActivityPage />);

    // Click "Content" filter
    const contentBtn = screen.getByRole('button', { name: 'Content' });
    await user.click(contentBtn);

    expect(contentBtn).toHaveAttribute('aria-pressed', 'true');
  });
});
