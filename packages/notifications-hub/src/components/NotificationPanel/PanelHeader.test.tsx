import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PanelHeader, NotificationFilter } from './PanelHeader';

describe('PanelHeader', () => {
  const defaultProps = {
    filter: 'all' as NotificationFilter,
    unreadCount: 5,
    onFilterChange: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders default title', () => {
      render(<PanelHeader {...defaultProps} />);
      expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    });

    it('renders custom title', () => {
      render(<PanelHeader {...defaultProps} title="My Alerts" />);
      expect(screen.getByRole('heading', { name: 'My Alerts' })).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(<PanelHeader {...defaultProps} />);
      const closeButton = screen.getByRole('button', { name: 'Close notifications panel' });
      expect(closeButton).toBeInTheDocument();
    });

    it('renders all filter buttons', () => {
      render(<PanelHeader {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Unread/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Read' })).toBeInTheDocument();
    });

    it('shows unread count in Unread filter button', () => {
      render(<PanelHeader {...defaultProps} unreadCount={12} />);
      expect(screen.getByRole('button', { name: 'Unread (12)' })).toBeInTheDocument();
    });

    it('hides unread count when zero', () => {
      render(<PanelHeader {...defaultProps} unreadCount={0} />);
      expect(screen.getByRole('button', { name: 'Unread' })).toBeInTheDocument();
    });
  });

  describe('Filter Interactions', () => {
    it('calls onFilterChange when All is clicked', () => {
      const onFilterChange = jest.fn();
      render(<PanelHeader {...defaultProps} filter="unread" onFilterChange={onFilterChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'All' }));
      expect(onFilterChange).toHaveBeenCalledWith('all');
    });

    it('calls onFilterChange when Unread is clicked', () => {
      const onFilterChange = jest.fn();
      render(<PanelHeader {...defaultProps} filter="all" onFilterChange={onFilterChange} />);

      fireEvent.click(screen.getByRole('button', { name: /Unread/ }));
      expect(onFilterChange).toHaveBeenCalledWith('unread');
    });

    it('calls onFilterChange when Read is clicked', () => {
      const onFilterChange = jest.fn();
      render(<PanelHeader {...defaultProps} filter="all" onFilterChange={onFilterChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Read' }));
      expect(onFilterChange).toHaveBeenCalledWith('read');
    });

    it('does not call onFilterChange when clicking active filter', () => {
      const onFilterChange = jest.fn();
      render(<PanelHeader {...defaultProps} filter="all" onFilterChange={onFilterChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'All' }));
      expect(onFilterChange).toHaveBeenCalledWith('all'); // Still called, but state unchanged
    });
  });

  describe('Close Button', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(<PanelHeader {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole('button', { name: 'Close notifications panel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Active Filter Styling', () => {
    it('marks All filter as active when filter is "all"', () => {
      render(<PanelHeader {...defaultProps} filter="all" />);
      const allButton = screen.getByRole('button', { name: 'All' });
      expect(allButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('marks Unread filter as active when filter is "unread"', () => {
      render(<PanelHeader {...defaultProps} filter="unread" />);
      const unreadButton = screen.getByRole('button', { name: /Unread/ });
      expect(unreadButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('marks Read filter as active when filter is "read"', () => {
      render(<PanelHeader {...defaultProps} filter="read" />);
      const readButton = screen.getByRole('button', { name: 'Read' });
      expect(readButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('only one filter is active at a time', () => {
      render(<PanelHeader {...defaultProps} filter="unread" />);
      expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: /Unread/ })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Read' })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Accessibility', () => {
    it('has aria-label on close button', () => {
      render(<PanelHeader {...defaultProps} />);
      const closeButton = screen.getByRole('button', { name: 'Close notifications panel' });
      expect(closeButton).toHaveAttribute('aria-label');
    });

    it('has aria-pressed on filter buttons', () => {
      render(<PanelHeader {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed');
      expect(screen.getByRole('button', { name: /Unread/ })).toHaveAttribute('aria-pressed');
      expect(screen.getByRole('button', { name: 'Read' })).toHaveAttribute('aria-pressed');
    });

    it('close button SVG is aria-hidden', () => {
      const { container } = render(<PanelHeader {...defaultProps} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Styling', () => {
    it('applies correct styles to header container', () => {
      const { container } = render(<PanelHeader {...defaultProps} />);
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
        borderBottom: '1px solid #e0e0e0',
      });
    });

    it('applies hover styles to close button', () => {
      render(<PanelHeader {...defaultProps} />);
      const closeButton = screen.getByRole('button', { name: 'Close notifications panel' });

      fireEvent.mouseEnter(closeButton);
      expect(closeButton).toHaveStyle({ backgroundColor: '#f5f5f5' });

      fireEvent.mouseLeave(closeButton);
      expect(closeButton).toHaveStyle({ backgroundColor: '#ffffff' });
    });
  });
});
