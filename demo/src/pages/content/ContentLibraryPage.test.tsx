import { renderWithProviders } from '@/test';

vi.mock('@django-core/design-system', () => ({
  Stack: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  Alert: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@django-core/context-switcher', () => ({
  useContextSwitcher: () => ({
    context: { organisation: { id: '1', name: 'Demo Org' }, project: { id: '1', name: 'Demo Team' } },
  }),
}));

vi.mock('@django-core/auth-ui', () => ({
  useAuth: () => ({ user: { id: '1' } }),
}));

vi.mock('../../components/MobileTabBar', () => ({ default: () => null }));
vi.mock('../../components/MobileFilterSheet', () => ({ default: () => null }));
vi.mock('../../hooks/useAppSelection', () => ({ useAppSelection: () => ({}) }));
vi.mock('../../hooks/useBrandProfile', () => ({ getAssetUrl: () => '' }));

vi.mock('./contentLibraryTypes', () => ({
  CONTENT_TYPE_FILTERS: [],
  CONTENT_CATEGORIES: [],
  LEVEL_LABELS: {},
  getAssetTypeLabel: () => '',
}));

vi.mock('./ContentCard', () => ({
  ContentCard: () => <div>ContentCard</div>,
  FilterChip: () => null,
  EmptyState: () => <div>EmptyState</div>,
  ContentPreviewModal: () => null,
}));

vi.mock('./GalleryCreateContentButton', () => ({
  GalleryCreateContentButton: () => null,
}));

vi.mock('./GalleryMatchTimeline', () => ({
  GalleryMatchTimeline: () => null,
}));

vi.mock('./useContentLibraryData', () => ({
  useContentLibraryData: () => ({
    contentItems: [],
    filteredContent: [],
    loading: false,
    error: null,
    organisations: [],
    clubs: [],
    filteredTeams: [],
    seasons: [],
    matches: [],
    selectedOrgId: '',
    setSelectedOrgId: vi.fn(),
    selectedClubId: '',
    setSelectedClubId: vi.fn(),
    selectedTeamId: '',
    setSelectedTeamId: vi.fn(),
    categoryFilter: 'all',
    setCategoryFilter: vi.fn(),
    subtypeFilter: 'all',
    setSubtypeFilter: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    sortBy: 'date',
    setSortBy: vi.fn(),
    categoryCounts: {},
    subtypeCounts: {},
    setContentItems: vi.fn(),
    activeTab: 'all',
    setActiveTab: vi.fn(),
    typeFilter: 'all',
    setTypeFilter: vi.fn(),
  }),
}));

// Lazy import to ensure mocks are registered first
const { default: ContentLibraryPage } = await import('./ContentLibraryPage');

describe('ContentLibraryPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<ContentLibraryPage />);
  });
});
