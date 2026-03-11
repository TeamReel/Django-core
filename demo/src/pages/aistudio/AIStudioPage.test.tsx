import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import AIStudioPage from './AIStudioPage';

vi.mock('@django-core/design-system', () => ({
  PullToRefresh: ({ children }: any) => <div>{children}</div>,
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('./useStudioData', () => ({
  useStudioData: () => ({
    contentItems: [],
    contentGroups: [],
    matchGroups: [],
    nonMatchGroup: null,
    loading: false,
    error: null,
    refresh: vi.fn(),
    videoJobs: [],
    activeJobs: [],
    recentCompletedJobs: [],
    videoJobsLoading: false,
    totalItems: 0,
    totalVideos: 0,
    totalImages: 0,
    refreshData: vi.fn(),
  }),
}));

vi.mock('./StudioCards', () => ({
  StudioContentCard: () => <div>StudioContentCard</div>,
  StudioPreviewModal: () => null,
  ViewAllSheet: () => null,
}));

vi.mock('./StudioSection', () => ({
  StudioSection: ({ title, children }: any) => <div><h2>{title}</h2>{children}</div>,
}));

vi.mock('./StudioJobComponents', () => ({
  VideoJobCard: () => <div>VideoJobCard</div>,
  ActiveJobsStrip: () => <div>ActiveJobsStrip</div>,
}));

describe('AIStudioPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<AIStudioPage />);
  });
});
