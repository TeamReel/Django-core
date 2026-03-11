import { renderWithProviders } from '@/test';
import TeamDetailPage from './TeamDetailPage';

vi.mock('../../api', () => ({
  organisationsApi: { list: vi.fn().mockResolvedValue({ results: [] }) },
  projectsApi: { list: vi.fn().mockResolvedValue({ results: [] }) },
}));

vi.mock('../../utils/apiEnvelope', () => ({
  unwrapEnvelope: (d: any) => d?.results ?? d,
}));

vi.mock('./TeamOrganisationDetailPage', () => ({
  default: () => <div>TeamOrganisationDetailPage</div>,
}));

describe('TeamDetailPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<TeamDetailPage />, { routerProps: { initialEntries: ['/teams/test-team'] } });
  });
});
