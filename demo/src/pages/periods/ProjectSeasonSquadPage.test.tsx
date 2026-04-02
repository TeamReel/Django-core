import { renderWithProviders } from '@/test';
import ProjectSeasonSquadPage from './ProjectSeasonSquadPage';

vi.mock('@django-core/design-system', () => ({
  Alert: ({ children }: any) => <div>{children}</div>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Card: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@django-core/page-templates', () => ({
  BreadcrumbContextSwitcher: () => null,
  PageContent: ({ children }: any) => <div>{children}</div>,
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));

vi.mock('../../components/Skeleton', () => ({
  SkeletonList: () => <div>Loading...</div>,
}));

vi.mock('../../components/SmartEmptyState', () => ({
  default: ({ title }: any) => <div>{title}</div>,
}));

vi.mock('../../shims/design-system', () => ({
  Table: Object.assign(
    ({ children }: any) => <table>{children}</table>,
    {
      Head: ({ children }: any) => <thead>{children}</thead>,
      Body: ({ children }: any) => <tbody>{children}</tbody>,
      Row: ({ children }: any) => <tr>{children}</tr>,
      Cell: ({ children }: any) => <td>{children}</td>,
      HeaderCell: ({ children }: any) => <th>{children}</th>,
    },
  ),
}));

vi.mock('../identity/PeriodEditModal', () => ({ default: () => null }));
vi.mock('../../utils/periodPath', () => ({ periodPathKey: () => 'seasons' }));

vi.mock('./useSquadPageData', () => ({
  useSquadPageData: () => ({
    members: [],
    seasonsForSwitcher: [],
    resolvedSeasonId: '1',
    loading: false,
    error: null,
    season: null,
    project: null,
    organisation: null,
    clubProject: null,
    seasonKeyOrId: '1',
    orgSlugOrId: 'demo',
    clubSlugOrId: '',
    isTeamRoute: false,
    seasonsBasePath: '/projects/1/seasons',
    effectiveSeasonId: '1',
    navigate: vi.fn(),
    userCanEditProject: false,
    userCanDeleteProject: false,
    refreshData: vi.fn(),
  }),
}));

vi.mock('@/components/MemberRoleEditModal', () => ({
  MemberRoleEditModal: () => null,
  readFunctionalRoles: () => [],
}));

describe('ProjectSeasonSquadPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<ProjectSeasonSquadPage />, {
      routerProps: { initialEntries: ['/projects/1/seasons/1/squad'] },
    });
  });
});
