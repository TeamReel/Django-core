import { renderWithProviders } from '@/test';
import HierarchyMatchDetailPage from './MatchDetailPage';

vi.mock('../../components/MobileTabBar', () => ({ default: () => null }));
vi.mock('../../hooks/useBrandProfile', () => ({ getAssetUrl: () => '' }));
vi.mock('../../utils/activeContext', () => ({
  setActiveContext: vi.fn(),
  getActiveContext: () => null,
}));

vi.mock('./match-detail', () => ({
  MatchOverviewTab: () => <div>OverviewTab</div>,
  MatchContentTab: () => <div>ContentTab</div>,
  MatchLineupTab: () => <div>LineupTab</div>,
}));

vi.mock('../identity/MatchDetailModal', () => ({ default: () => null }));
vi.mock('../identity/MatchEditModal', () => ({ default: () => null }));
vi.mock('../identity/ContentGenerationModal', () => ({ default: () => null }));

vi.mock('../../providers/BackNavigationProvider', () => ({
  useSetBackNavigation: () => vi.fn(),
}));

vi.mock('./MatchDetailModals', () => ({
  ContentPreviewModal: () => null,
  SavedAssetPreviewModal: () => null,
  ToastNotifications: () => null,
}));

vi.mock('./useMatchDetailData', () => ({
  useMatchDetailData: () => ({
    match: null,
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

describe('MatchDetailPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<HierarchyMatchDetailPage />, {
      routerProps: { initialEntries: ['/matches/1'] },
    });
  });
});
