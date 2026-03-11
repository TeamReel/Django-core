import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { ProjectsPage } from './ProjectsPage';

vi.mock('@django-core/design-system', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Alert: ({ children }: any) => <div>{children}</div>,
  Card: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@django-core/page-templates', () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
  PageContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../components/Skeleton', () => ({
  SkeletonTablePage: () => <div>Loading...</div>,
}));

vi.mock('../../components/SmartEmptyState', () => ({
  default: ({ title }: any) => <div>{title}</div>,
}));

vi.mock('../work/WorkFilterBar', () => ({
  default: () => <div>WorkFilterBar</div>,
}));

vi.mock('./ProjectEditModal', () => ({ default: () => null }));
vi.mock('./ProjectDetailModal', () => ({ default: () => null }));

vi.mock('./useProjectsPageData', () => ({
  useProjectsPageData: () => ({
    orgId: '1',
    navigate: vi.fn(),
    organisations: [],
    resolvedOrg: null,
    currentOrgSlug: 'demo',
    currentOrgId: '1',
    displayOrgName: 'Demo Org',
    context: {},
    loading: false,
    error: null,
    successMessage: '',
    statusFilter: 'all',
    setStatusFilter: vi.fn(),
    selectedOrgId: '',
    setSelectedOrgId: vi.fn(),
    selectedClubId: '',
    setSelectedClubId: vi.fn(),
    selectedTeamId: '',
    setSelectedTeamId: vi.fn(),
    filterOrganisationOptions: [],
    clubs: [],
    teams: [],
    orgNavigationIndex: [],
    isSuperAdmin: false,
    userCanCreateProject: false,
    isEditModalOpen: false,
    setIsEditModalOpen: vi.fn(),
    selectedProject: null,
    isDetailModalOpen: false,
    setIsDetailModalOpen: vi.fn(),
    detailProject: null,
    isOrgSelectionModalOpen: false,
    setIsOrgSelectionModalOpen: vi.fn(),
    handleSaveProject: vi.fn(),
    breadcrumbItems: [],
    projects: [],
  }),
}));

vi.mock('./ProjectsTable', () => ({
  ProjectsTable: () => <div>ProjectsTable</div>,
  filterProjects: (p: any[]) => p,
}));

describe('ProjectsPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<ProjectsPage />);
  });

  it('renders page title', () => {
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });
});
