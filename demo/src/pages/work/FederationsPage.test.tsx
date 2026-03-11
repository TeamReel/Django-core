import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import FederationsPage from './FederationsPage';

vi.mock('@django-core/page-templates', () => ({
  PageContent: ({ children }: any) => <div>{children}</div>,
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));

vi.mock('../identity/directory/FederationsList', () => ({
  FederationsList: () => <div>FederationsList</div>,
}));

describe('FederationsPage', () => {
  it('renders title', () => {
    renderWithProviders(<FederationsPage />);
    expect(screen.getByText('Federations')).toBeInTheDocument();
  });
});
