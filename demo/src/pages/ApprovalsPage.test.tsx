import { renderWithProviders } from '@/test';
import ApprovalsPage from './ApprovalsPage';

vi.mock('./ApprovalsPage/useApprovalsData', () => ({
  useApprovalsData: () => ({
    filter: 'all',
    setFilter: vi.fn(),
    isAdmin: false,
    isPlayer: false,
    isSupporter: false,
    contentType: 'all',
    setContentType: vi.fn(),
    toasts: [],
    pushToast: vi.fn(),
    dismissToast: vi.fn(),
    loading: false,
    aiLoading: false,
    videoLoading: false,
    error: null,
    aiError: null,
    videoError: null,
    actionError: null,
    filtered: [],
    visibleAiJobs: [],
    visibleVideoJobs: [],
    needsReviewJobs: [],
    contentTypeCounts: {},
    tabTitles: { all: { title: 'All', subtitle: '' } },
    handleApprove: vi.fn(),
    handleReject: vi.fn(),
    handleBulkApprove: vi.fn(),
    selectedWorkflow: null,
    setSelectedWorkflow: vi.fn(),
    refreshData: vi.fn(),
  }),
}));

vi.mock('./ApprovalsPage/ApprovalsPageHeader', () => ({
  ApprovalsPageHeader: () => <div>ApprovalsPageHeader</div>,
}));

vi.mock('./ApprovalsPage/ApprovalsToastContainer', () => ({
  ApprovalsToastContainer: () => null,
}));

vi.mock('./ApprovalsPage/ApprovalsPageContent', () => ({
  ApprovalsPageContent: () => <div>ApprovalsPageContent</div>,
}));

vi.mock('./ApprovalsPage/ApprovalsModals', () => ({
  ApprovalsModals: () => null,
}));

describe('ApprovalsPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<ApprovalsPage />);
  });
});
