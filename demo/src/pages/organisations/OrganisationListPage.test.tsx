import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import OrganisationListPage from './OrganisationListPage';

vi.mock('../../components/SmartEmptyState', () => ({
  default: ({ title }: any) => <div>{title}</div>,
}));

vi.mock('../../api', () => ({
  organisationsApi: {
    list: vi.fn().mockResolvedValue({ results: [] }),
  },
}));

describe('OrganisationListPage', () => {
  it('renders title', () => {
    renderWithProviders(<OrganisationListPage />);
    expect(screen.getByText('Organisations')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    renderWithProviders(<OrganisationListPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
