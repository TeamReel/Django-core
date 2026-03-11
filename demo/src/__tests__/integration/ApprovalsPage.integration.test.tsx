/**
 * Integration test — ApprovalsPage
 *
 * Tests: render page → filter tabs → workflow content.
 * Hook is fully mocked to avoid API calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';

vi.mock('../../pages/ApprovalsPage/useApprovalsData', () => ({
  useApprovalsData: () => ({
    filter: 'all',
    isAdmin: true,
    isPlayer: false,
    isSupporter: false,
    contentType: 'all',
    setContentType: vi.fn(),
    toasts: [],
    pushToast: vi.fn(),
    modalJob: null,
    setModalJob: vi.fn(),
    modalVideoJob: null,
    setModalVideoJob: vi.fn(),
    videoFollowUp: null,
    setVideoFollowUp: vi.fn(),
    photoCompositeFollowUp: null,
    setPhotoCompositeFollowUp: vi.fn(),
    resolvedModalJob: null,
    loading: false,
    aiLoading: false,
    videoLoading: false,
    error: null,
    aiError: null,
    videoError: null,
    actionError: null,
    setActionError: vi.fn(),
    filtered: [],
    visibleAiJobs: [],
    visibleVideoJobs: [],
    needsReviewJobs: [],
    contentTypeCounts: { all: 0 },
    tabTitles: {
      all: { title: 'All', subtitle: '0 items' },
      review: { title: 'Review', subtitle: '0 items' },
      active: { title: 'Active', subtitle: '0 items' },
      completed: { title: 'Completed', subtitle: '0 items' },
      rejected: { title: 'Rejected', subtitle: '0 items' },
      ai_queue: { title: 'AI Queue', subtitle: '0 items' },
      video: { title: 'Video', subtitle: '0 items' },
    },
    openModal: vi.fn(),
    handleModalAction: vi.fn(),
    handleTransitionComplete: vi.fn(),
    handleSwipeApproveAi: vi.fn(),
    handleSwipeRejectAi: vi.fn(),
    handleSwipeApproveVideo: vi.fn(),
    handleSwipeRejectVideo: vi.fn(),
    cancelVideoJob: vi.fn(),
    retryVideoJob: vi.fn(),
    approveVideoJob: vi.fn(),
    rejectVideoJob: vi.fn(),
    refreshAll: vi.fn(),
    refreshAiJobs: vi.fn(),
    refreshVideoJobs: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn(), useSearchParams: () => [new URLSearchParams(), vi.fn()] };
});

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

let ApprovalsPage: React.ComponentType;

beforeAll(async () => {
  const mod = await import('../../pages/ApprovalsPage/index');
  ApprovalsPage = mod.default;
});

describe('ApprovalsPage integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders the page', () => {
    renderWithProviders(<ApprovalsPage />);
    expect(document.body.textContent!.length).toBeGreaterThan(0);
  });

  it('renders filter tabs', () => {
    renderWithProviders(<ApprovalsPage />);
    // Multiple tabs should be present
    expect(screen.queryAllByRole('tab').length).toBeGreaterThan(0);
  });

  it('renders without error', () => {
    const { container } = renderWithProviders(<ApprovalsPage />);
    expect(container.querySelector('[class*="error"]')).not.toBeTruthy();
  });
});
