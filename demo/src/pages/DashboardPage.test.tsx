import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import DashboardPage from './DashboardPage';

vi.mock('@django-core/auth-ui', () => ({
  useAuth: vi.fn(() => ({ user: { first_name: 'Test', email: 'test@test.com' } })),
}));

vi.mock('@django-core/context-switcher', () => ({
  useContextSwitcher: () => ({
    context: {
      organisation: { id: '1', name: 'Demo Org', slug: 'demo' },
      project: { id: '1', name: 'Demo Team' },
    },
  }),
}));

vi.mock('@django-core/design-system', () => ({
  PullToRefresh: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../components/PermissionGuards', () => ({
  useUserRole: () => ({ role: 'admin', isAdmin: true }),
}));

vi.mock('../hooks/useCreditBalance', () => ({
  useCreditBalance: () => ({ balance: 100, threshold: 10 }),
}));

vi.mock('../components/dashboard', () => ({
  ActiveMatchCard: () => <div>ActiveMatchCard</div>,
  SquadReadinessCard: () => <div>SquadReadinessCard</div>,
  AIQueueCard: () => <div>AIQueueCard</div>,
  CreditsTrendCard: () => <div>CreditsTrendCard</div>,
  OrgStatsCard: () => <div>OrgStatsCard</div>,
}));

vi.mock('../components/dashboard/SmartActionsCard', () => ({
  SmartActionsCard: () => <div>SmartActionsCard</div>,
}));

vi.mock('../components/ActivityFeed/ActivityFeed', () => ({
  ActivityFeed: () => <div>ActivityFeed</div>,
}));

describe('DashboardPage', () => {
  it('renders welcome message with user name', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText(/Welkom, Test/)).toBeInTheDocument();
  });

  it('renders dashboard cards', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('ActiveMatchCard')).toBeInTheDocument();
    expect(screen.getByText('SmartActionsCard')).toBeInTheDocument();
  });

  it('renders activity feed', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('ActivityFeed')).toBeInTheDocument();
  });
});
