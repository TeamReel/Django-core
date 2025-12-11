import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UnreadBadge } from './UnreadBadge';
import { useUnreadCount } from '../../hooks/useUnreadCount';

// Mock the useUnreadCount hook
jest.mock('../../hooks/useUnreadCount');

const mockUseUnreadCount = useUnreadCount as jest.MockedFunction<typeof useUnreadCount>;

describe('UnreadBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Count Variant', () => {
    it('displays count when count > 0', () => {
      mockUseUnreadCount.mockReturnValue({ count: 5, loading: false });

      render(<UnreadBadge variant="count" />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('displays "99+" when count exceeds max (default 99)', () => {
      mockUseUnreadCount.mockReturnValue({ count: 150, loading: false });

      render(<UnreadBadge variant="count" />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('displays custom max with "+" when count exceeds custom max', () => {
      mockUseUnreadCount.mockReturnValue({ count: 25, loading: false });

      render(<UnreadBadge variant="count" max={10} />);

      expect(screen.getByText('10+')).toBeInTheDocument();
    });

    it('displays exact count when count equals max', () => {
      mockUseUnreadCount.mockReturnValue({ count: 99, loading: false });

      render(<UnreadBadge variant="count" max={99} />);

      expect(screen.getByText('99')).toBeInTheDocument();
    });

    it('displays count when count is exactly max + 1', () => {
      mockUseUnreadCount.mockReturnValue({ count: 100, loading: false });

      render(<UnreadBadge variant="count" max={99} />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  describe('Dot Variant', () => {
    it('displays dot when count > 0', () => {
      mockUseUnreadCount.mockReturnValue({ count: 5, loading: false });

      const { container } = render(<UnreadBadge variant="dot" />);

      // Dot badge should have aria-label but no visible text
      const badge = screen.getByLabelText('5 unread notifications');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('');
    });

    it('has aria-label with singular "notification" when count is 1', () => {
      mockUseUnreadCount.mockReturnValue({ count: 1, loading: false });

      render(<UnreadBadge variant="dot" />);

      const badge = screen.getByLabelText('1 unread notification');
      expect(badge).toBeInTheDocument();
    });

    it('has aria-label with plural "notifications" when count > 1', () => {
      mockUseUnreadCount.mockReturnValue({ count: 3, loading: false });

      render(<UnreadBadge variant="dot" />);

      const badge = screen.getByLabelText('3 unread notifications');
      expect(badge).toBeInTheDocument();
    });

    it('displays dot with fixed size styles', () => {
      mockUseUnreadCount.mockReturnValue({ count: 5, loading: false });

      render(<UnreadBadge variant="dot" />);

      const badge = screen.getByLabelText('5 unread notifications');
      expect(badge).toHaveStyle({
        width: '8px',
        height: '8px',
        padding: '0',
        minHeight: '8px',
      });
    });
  });

  describe('Hide When Zero', () => {
    it('hides badge when count is 0 and showZero is false (default)', () => {
      mockUseUnreadCount.mockReturnValue({ count: 0, loading: false });

      const { container } = render(<UnreadBadge variant="count" />);

      expect(container.firstChild).toBeNull();
    });

    it('shows badge when count is 0 and showZero is true', () => {
      mockUseUnreadCount.mockReturnValue({ count: 0, loading: false });

      render(<UnreadBadge variant="count" showZero />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('hides dot variant when count is 0 and showZero is false', () => {
      mockUseUnreadCount.mockReturnValue({ count: 0, loading: false });

      const { container } = render(<UnreadBadge variant="dot" showZero={false} />);

      expect(container.firstChild).toBeNull();
    });

    it('shows dot variant when count is 0 and showZero is true', () => {
      mockUseUnreadCount.mockReturnValue({ count: 0, loading: false });

      render(<UnreadBadge variant="dot" showZero />);

      const badge = screen.getByLabelText('0 unread notifications');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('displays loading indicator when loading is true', () => {
      mockUseUnreadCount.mockReturnValue({ count: 0, loading: true });

      render(<UnreadBadge variant="count" />);

      expect(screen.getByText('...')).toBeInTheDocument();
    });

    it('displays loading indicator for dot variant', () => {
      mockUseUnreadCount.mockReturnValue({ count: 0, loading: true });

      render(<UnreadBadge variant="dot" />);

      expect(screen.getByText('...')).toBeInTheDocument();
    });

    it('shows loading state even when count is 0 and showZero is false', () => {
      mockUseUnreadCount.mockReturnValue({ count: 0, loading: true });

      render(<UnreadBadge variant="count" showZero={false} />);

      expect(screen.getByText('...')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      mockUseUnreadCount.mockReturnValue({ count: 5, loading: false });

      const { container } = render(
        <UnreadBadge variant="count" className="custom-badge" />
      );

      const badge = container.querySelector('.custom-badge');
      expect(badge).toBeInTheDocument();
    });

    it('applies custom className to dot variant', () => {
      mockUseUnreadCount.mockReturnValue({ count: 5, loading: false });

      const { container } = render(
        <UnreadBadge variant="dot" className="custom-dot" />
      );

      const badge = container.querySelector('.custom-dot');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Props Defaults', () => {
    it('uses default variant="count" when not specified', () => {
      mockUseUnreadCount.mockReturnValue({ count: 5, loading: false });

      render(<UnreadBadge />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('uses default max=99 when not specified', () => {
      mockUseUnreadCount.mockReturnValue({ count: 150, loading: false });

      render(<UnreadBadge />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('uses default showZero=false when not specified', () => {
      mockUseUnreadCount.mockReturnValue({ count: 0, loading: false });

      const { container } = render(<UnreadBadge />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('handles negative count (treats as 0)', () => {
      mockUseUnreadCount.mockReturnValue({ count: -1, loading: false });

      const { container } = render(<UnreadBadge variant="count" />);

      // Negative count should be treated as 0 and hidden by default
      expect(container.firstChild).toBeNull();
    });

    it('handles very large counts', () => {
      mockUseUnreadCount.mockReturnValue({ count: 999999, loading: false });

      render(<UnreadBadge variant="count" max={99} />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('handles max=0', () => {
      mockUseUnreadCount.mockReturnValue({ count: 1, loading: false });

      render(<UnreadBadge variant="count" max={0} />);

      // Any count > 0 should show "0+"
      expect(screen.getByText('0+')).toBeInTheDocument();
    });

    it('handles max=1', () => {
      mockUseUnreadCount.mockReturnValue({ count: 2, loading: false });

      render(<UnreadBadge variant="count" max={1} />);

      expect(screen.getByText('1+')).toBeInTheDocument();
    });
  });
});
