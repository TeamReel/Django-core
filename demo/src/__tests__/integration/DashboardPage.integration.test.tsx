/**
 * Integration test — DashboardPage
 *
 * Tests: welcome message → dashboard cards → role-based content.
 * All heavy dashboard cards mocked to prevent OOM.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import DashboardPage from '../../pages/DashboardPage';

vi.mock('@django-core/auth-ui', () => ({
  useAuth: () => ({
    user: { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
  }),
}));

// context switcher returns { context, organisations, ... }
vi.mock('@django-core/context-switcher', () => ({
  useContextSwitcher: () => ({
    context: {
      organisation: { name: 'FC Test', slug: 'fc-test' },
      project: { name: 'First Team' },
      isLoading: false,
      error: null,
    },
    organisations: [],
    projects: [],
    switchContext: vi.fn(),
    switchProject: vi.fn(),
    refresh: vi.fn(),
    isSwitching: false,
  }),
}));

// Mock dashboard barrel import (named exports)
vi.mock('../../components/dashboard', () => ({
  ActiveMatchCard: () => <div data-testid="active-match">Active Match</div>,
  SquadReadinessCard: () => <div data-testid="squad-readiness">Squad</div>,
  AIQueueCard: () => <div data-testid="ai-queue">AI Queue</div>,
  CreditsTrendCard: () => <div data-testid="credits">Credits</div>,
  OrgStatsCard: () => <div data-testid="org-stats">Org Stats</div>,
}));
vi.mock('../../components/dashboard/SmartActionsCard', () => ({
  SmartActionsCard: () => <div data-testid="smart-actions">Smart Actions</div>,
}));
vi.mock('../../components/ActivityFeed/ActivityFeed', () => ({
  ActivityFeed: () => <div data-testid="activity-feed">Activity Feed</div>,
}));
vi.mock('../../components/PermissionGuards', () => ({
  useUserRole: () => ({
    isOrgLevel: true,
    isMemberLevel: false,
    isTeamScope: false,
    isOrgAdmin: true,
    isStaff: false,
    isSuperAdmin: false,
  }),
}));
vi.mock('../../hooks/useCreditBalance', () => ({
  useCreditBalance: () => ({ balance: 100, lowBalanceAlert: false, loading: false }),
}));
vi.mock('@django-core/design-system', () => ({
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn(), Link: ({ to, children }: any) => <a href={to}>{children}</a> };
});

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

describe('DashboardPage integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders welcome message with user first name', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText(/Welkom, John/i)).toBeInTheDocument();
  });

  it('renders dashboard cards', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByTestId('active-match')).toBeInTheDocument();
    expect(screen.getByTestId('content-breakdown')).toBeInTheDocument();
  });

  it('renders activity feed', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
  });

  it('does not show low balance alert when balance is fine', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.queryByText(/Opwaarderen/i)).not.toBeInTheDocument();
  });
});
