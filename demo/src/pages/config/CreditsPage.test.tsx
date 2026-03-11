import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { CreditsPage } from './CreditsPage';

vi.mock('@django-core/design-system', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  Alert: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@django-core/page-templates', () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
  PageContent: ({ children }: any) => <div>{children}</div>,
  BreadcrumbContextSwitcher: () => null,
}));

vi.mock('../../providers/BackNavigationProvider', () => ({
  useSetBackNavigation: () => vi.fn(),
}));

vi.mock('./credits/useCreditsData', () => ({
  useCreditsData: () => ({
    balanceData: null,
    transactions: [],
    isLoading: false,
    error: null,
    activeTab: 'balance',
    setActiveTab: vi.fn(),
    refreshData: vi.fn(),
  }),
}));

vi.mock('./credits/CreditsBalanceTab', () => ({
  CreditsBalanceTab: () => <div>BalanceTab</div>,
}));

vi.mock('./credits/CreditsTransactionsTab', () => ({
  CreditsTransactionsTab: () => <div>TransactionsTab</div>,
}));

describe('CreditsPage', () => {
  it('renders title', () => {
    renderWithProviders(<CreditsPage />);
    expect(screen.getByText('Credits')).toBeInTheDocument();
  });
});
