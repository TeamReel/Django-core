import { renderWithProviders } from '@/test';

vi.mock('@django-core/design-system', () => ({
  PullToRefresh: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@django-core/page-templates', () => ({
  PageContent: ({ children }: any) => <div>{children}</div>,
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));

vi.mock('@django-core/context-switcher', () => ({
  useContextSwitcher: () => ({
    context: { organisation: { id: '1', name: 'Demo Org' } },
  }),
}));

vi.mock('../../hooks/useVideoJobs', () => ({
  useVideoJobs: () => ({
    jobs: [],
    isLoading: false,
    error: null,
    refreshData: vi.fn(),
  }),
  getJobStatusDisplay: () => ({ label: '', color: '' }),
  getJobTypeDisplay: () => ({ label: '', icon: '' }),
}));

// Lazy import
const mod = await import('./VideoQueuePage');
const VideoQueuePage = mod.default ?? mod.VideoQueuePage;

describe('VideoQueuePage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<VideoQueuePage />);
  });
});
