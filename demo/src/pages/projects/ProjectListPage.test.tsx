import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import ProjectListPage from './ProjectListPage';

vi.mock('../../components/SmartEmptyState', () => ({
  default: ({ title }: any) => <div>{title}</div>,
}));

vi.mock('../../api', () => ({
  organisationsApi: {
    retrieve: vi.fn().mockResolvedValue({ name: 'Demo Org' }),
    list: vi.fn().mockResolvedValue({ results: [] }),
  },
}));

describe('ProjectListPage', () => {
  it('renders title', () => {
    renderWithProviders(<ProjectListPage />, {
      routerProps: { initialEntries: ['/organisations/1/projects'] },
    });
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    renderWithProviders(<ProjectListPage />, {
      routerProps: { initialEntries: ['/organisations/1/projects'] },
    });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
