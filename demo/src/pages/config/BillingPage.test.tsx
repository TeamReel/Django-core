import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import BillingPage from './BillingPage';

vi.mock('@django-core/design-system', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  Alert: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@django-core/page-templates', () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
  PageContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../providers/BackNavigationProvider', () => ({
  useSetBackNavigation: () => vi.fn(),
}));

describe('BillingPage', () => {
  it('renders title', () => {
    renderWithProviders(<BillingPage />);
    expect(screen.getByText('Billing & Licensing')).toBeInTheDocument();
  });

  it('renders planned features list', () => {
    renderWithProviders(<BillingPage />);
    expect(screen.getByText('Planned')).toBeInTheDocument();
  });
});
