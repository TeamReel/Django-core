import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { ActivityFeed } from './ActivityFeed';

// Mock useActivities
vi.mock('../../hooks/useActivities', () => ({
  useActivities: vi.fn(),
}));

// Mock formatRelativeTime and getDateUrgency
vi.mock('../../utils/relativeTime', () => ({
  formatRelativeTime: vi.fn(() => 'in 2 days'),
  getDateUrgency: vi.fn(() => 'upcoming'),
}));

vi.mock('../Skeleton', () => ({
  SkeletonList: () => <div data-testid="skeleton-list" />,
}));

import { useActivities } from '../../hooks/useActivities';
const mockUseActivities = vi.mocked(useActivities);

const futureDate = new Date(Date.now() + 86400000 * 3).toISOString();

const mockActivities = [
  {
    id: 'a1',
    title: 'vs FC Utrecht',
    activity_type: 'League Match',
    start_time: futureDate,
    location: 'Stadium',
    project: { name: 'Ajax Amsterdam' },
    period: { name: 'League Competition - Ajax' },
  },
  {
    id: 'a2',
    title: '@ PSV Eindhoven',
    activity_type: 'Cup Match',
    start_time: futureDate,
    location: 'Away',
    project: { name: 'Ajax Amsterdam' },
    period: { name: 'KNVB Cup' },
  },
];

describe('ActivityFeed', () => {
  beforeEach(() => {
    mockUseActivities.mockReturnValue({
      activities: mockActivities,
      loading: false,
      error: null,
    } as ReturnType<typeof useActivities>);
  });

  it('renders title', () => {
    renderWithProviders(<ActivityFeed />);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    renderWithProviders(<ActivityFeed title="Upcoming Matches" />);
    expect(screen.getByText('Upcoming Matches')).toBeInTheDocument();
  });

  it('renders activity items', () => {
    renderWithProviders(<ActivityFeed />);
    expect(screen.getByText(/Ajax Amsterdam vs FC Utrecht/)).toBeInTheDocument();
    expect(screen.getByText(/Ajax Amsterdam @ PSV Eindhoven/)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseActivities.mockReturnValue({
      activities: [],
      loading: true,
      error: null,
    } as ReturnType<typeof useActivities>);

    renderWithProviders(<ActivityFeed />);
    expect(screen.getByTestId('skeleton-list')).toBeInTheDocument();
  });

  it('returns null on error', () => {
    mockUseActivities.mockReturnValue({
      activities: [],
      loading: false,
      error: 'Network error',
    } as ReturnType<typeof useActivities>);

    const { container } = renderWithProviders(<ActivityFeed />);
    expect(container.innerHTML).toBe('');
  });

  it('shows empty message when no activities match filter', () => {
    mockUseActivities.mockReturnValue({
      activities: [],
      loading: false,
      error: null,
    } as ReturnType<typeof useActivities>);

    renderWithProviders(<ActivityFeed />);
    expect(screen.getByText(/no activities found/i)).toBeInTheDocument();
  });

  it('renders filter buttons', () => {
    renderWithProviders(<ActivityFeed />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getAllByText(/League/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Cup/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders activity type badges', () => {
    renderWithProviders(<ActivityFeed />);
    expect(screen.getByText('League Match')).toBeInTheDocument();
    expect(screen.getByText('Cup Match')).toBeInTheDocument();
  });
});
