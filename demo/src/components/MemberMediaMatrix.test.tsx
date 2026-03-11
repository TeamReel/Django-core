import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { MemberMediaMatrix } from './MemberMediaMatrix';

// Mock dependencies
vi.mock('../utils/mediaHelpers', () => ({
  memberHasMedia: vi.fn(() => false),
  countFilledMediaSlots: vi.fn(() => 0),
}));

vi.mock('../constants/mediaSlots', () => ({
  MEDIA_SLOTS: [
    { id: 'portrait', label: 'Portrait', icon: 'portrait' },
    { id: 'action', label: 'Action', icon: 'action' },
  ],
}));

vi.mock('./SlotIcon', () => ({
  default: ({ name }: { name: string }) => <span data-testid={`slot-icon-${name}`} />,
}));

vi.mock('./SmartEmptyState', () => ({
  default: () => <div data-testid="empty-state">No members</div>,
}));

import { countFilledMediaSlots } from '../utils/mediaHelpers';

describe('MemberMediaMatrix', () => {
  const members = [
    { id: 'm1', user: { name: 'Alice', first_name: 'Alice', last_name: 'A' } },
    { id: 'm2', user: { name: 'Bob', first_name: 'Bob', last_name: 'B' } },
  ];

  it('renders title', () => {
    renderWithProviders(
      <MemberMediaMatrix members={members} membersLoading={false} />,
    );
    expect(screen.getByText('Media Completion Matrix')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    renderWithProviders(
      <MemberMediaMatrix members={members} membersLoading={false} title="Squad Media" />,
    );
    expect(screen.getByText('Squad Media')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderWithProviders(
      <MemberMediaMatrix members={[]} membersLoading={true} />,
    );
    expect(screen.getByText(/loading squad media/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    renderWithProviders(
      <MemberMediaMatrix members={[]} membersLoading={false} membersError="Failed to load" />,
    );
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows empty state when no members', () => {
    renderWithProviders(
      <MemberMediaMatrix members={[]} membersLoading={false} />,
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('renders member names in the table', () => {
    renderWithProviders(
      <MemberMediaMatrix members={members} membersLoading={false} />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders column headers for media slots', () => {
    renderWithProviders(
      <MemberMediaMatrix members={members} membersLoading={false} />,
    );
    expect(screen.getAllByText('Portrait').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Action').length).toBeGreaterThanOrEqual(1);
  });

  it('shows completion badge', () => {
    vi.mocked(countFilledMediaSlots).mockReturnValue(2);
    renderWithProviders(
      <MemberMediaMatrix members={members} membersLoading={false} />,
    );
    // 2 complete out of 2 (both members have countFilledMediaSlots = 2, MEDIA_SLOTS.length = 2)
    expect(screen.getByText('2 / 2 Complete')).toBeInTheDocument();
  });

  it('renders member links when memberDetailHref provided', () => {
    renderWithProviders(
      <MemberMediaMatrix
        members={members}
        membersLoading={false}
        memberDetailHref={(id) => `/members/${id}`}
      />,
    );
    const link = screen.getByText('Alice').closest('a');
    expect(link).toHaveAttribute('href', '/members/m1');
  });
});
