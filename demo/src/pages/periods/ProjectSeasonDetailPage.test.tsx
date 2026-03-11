import { renderWithProviders } from '@/test';
import { ProjectSeasonDetailPage } from './ProjectSeasonDetailPage';

vi.mock('@django-core/design-system', () => ({
  Alert: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../components/MobileTabBar', () => ({
  default: () => <div>MobileTabBar</div>,
}));

vi.mock('../../providers/SeasonProvider', () => ({
  isSeasonPeriod: () => true,
}));

vi.mock('../../providers/BackNavigationProvider', () => ({
  useSetBackNavigation: () => vi.fn(),
}));

vi.mock('./useSeasonDetailPageData', () => ({
  useSeasonDetailPageData: () => ({
    season: null,
    project: null,
    organisation: null,
    club: null,
    isLoading: true,
    error: null,
    activeTab: 'overview',
    navigateToTab: vi.fn(),
    navigate: vi.fn(),
    user: { id: '1' },
    org: null,
    resolvedSeasonId: '1',
    seasonsBasePath: '/projects/1/seasons',
    members: [],
    setMembers: vi.fn(),
    matches: [],
    setMatches: vi.fn(),
    competitions: [],
    setCompetitions: vi.fn(),
    loading: true,
    toasts: [],
    pushToast: vi.fn(),
    dismissToast: vi.fn(),
    seasonWalletOptions: [],
    createModalOrganisations: [],
    createModalClubs: [],
    createModalTeams: [],
    refreshData: vi.fn(),
  }),
}));

vi.mock('./SeasonDetailModals', () => ({ default: () => null }));
vi.mock('./SeasonOverviewTab', () => ({ default: () => <div>OverviewTab</div> }));
vi.mock('./SeasonContentTab', () => ({ default: () => <div>ContentTab</div> }));
vi.mock('./SeasonSquadTab', () => ({ default: () => <div>SquadTab</div> }));
vi.mock('./SeasonMediaTab', () => ({ default: () => <div>MediaTab</div> }));
vi.mock('./SeasonCompetitionsTab', () => ({ default: () => <div>CompetitionsTab</div> }));
vi.mock('./SeasonMatchesTab', () => ({ default: () => <div>MatchesTab</div> }));
vi.mock('./SeasonAssetsSettingsTab', () => ({ default: () => <div>AssetsTab</div> }));

describe('ProjectSeasonDetailPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<ProjectSeasonDetailPage />, {
      routerProps: { initialEntries: ['/projects/1/seasons/1'] },
    });
  });
});
