import { renderWithProviders } from '@/test';
import ClubDetailPage from './ClubDetailPage';

vi.mock('../../api', () => ({
  organisationsApi: { list: vi.fn().mockResolvedValue({ results: [] }) },
  projectsApi: { list: vi.fn().mockResolvedValue({ results: [] }) },
}));

vi.mock('../../utils/apiEnvelope', () => ({
  unwrapEnvelope: (d: any) => d?.results ?? d,
}));

vi.mock('./ClubOrganisationDetailPage', () => ({
  default: () => <div>ClubOrganisationDetailPage</div>,
}));

describe('ClubDetailPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<ClubDetailPage />, { routerProps: { initialEntries: ['/clubs/test-club'] } });
  });
});
