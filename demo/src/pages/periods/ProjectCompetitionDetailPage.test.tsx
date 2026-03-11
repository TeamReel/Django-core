import { renderWithProviders } from '@/test';
import { ProjectCompetitionDetailPage } from './ProjectCompetitionDetailPage';

vi.mock('@django-core/design-system', () => ({
  Alert: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@django-core/page-templates', () => ({
  PageContent: ({ children }: any) => <div>{children}</div>,
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));

vi.mock('../../utils/periodPath', () => ({
  looksLikeUuid: () => true,
}));

vi.mock('../../components/MobileTabBar', () => ({
  default: () => <div>MobileTabBar</div>,
}));

vi.mock('../identity/PeriodDetailModal', () => ({ default: () => null }));
vi.mock('../identity/PeriodEditModal', () => ({ default: () => null }));
vi.mock('../identity/MatchCreateModal', () => ({ default: () => null }));
vi.mock('../identity/MatchEditModal', () => ({ default: () => null }));
vi.mock('../identity/MatchDetailModal', () => ({ default: () => null }));
vi.mock('../identity/AddMemberModal', () => ({ default: () => null }));
vi.mock('./ProjectSeasonMemberDetailPage', () => ({ default: () => null }));
vi.mock('./CompetitionMembershipDetailModal', () => ({ CompetitionMembershipDetailModal: () => null }));
vi.mock('./CompetitionMembershipEditModal', () => ({ CompetitionMembershipEditModal: () => null }));
vi.mock('./CompetitionHierarchyTab', () => ({ CompetitionHierarchyTab: () => <div>HierarchyTab</div> }));
vi.mock('./CompetitionContentTab', () => ({ CompetitionContentTab: () => <div>ContentTab</div> }));
vi.mock('./CompetitionOverviewTab', () => ({ CompetitionOverviewTab: () => <div>OverviewTab</div> }));
vi.mock('./CompetitionMatchesTable', () => ({ CompetitionMatchesTable: () => <div>MatchesTable</div> }));

vi.mock('./useCompetitionDetailData', () => ({
  useCompetitionDetailData: () => ({
    competition: null,
    season: null,
    project: null,
    organisation: null,
    isLoading: true,
    error: null,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
    refreshData: vi.fn(),
    modals: {},
    openModal: vi.fn(),
    closeModal: vi.fn(),
  }),
}));

describe('ProjectCompetitionDetailPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<ProjectCompetitionDetailPage />, {
      routerProps: { initialEntries: ['/projects/1/competitions/1'] },
    });
  });
});
