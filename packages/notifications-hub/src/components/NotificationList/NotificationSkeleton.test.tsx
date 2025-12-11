import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationSkeleton } from './NotificationSkeleton';

describe('NotificationSkeleton', () => {
  describe('Rendering', () => {
    it('should render default number of skeleton rows (3)', () => {
      const { container } = render(<NotificationSkeleton />);

      // Count skeleton rows (each has min-height 70px and aria-hidden)
      const skeletonRows = container.querySelectorAll('[aria-hidden="true"]');
      expect(skeletonRows).toHaveLength(3);
    });

    it('should render custom number of skeleton rows', () => {
      const { container } = render(<NotificationSkeleton rows={5} />);

      const skeletonRows = container.querySelectorAll('[aria-hidden="true"]');
      expect(skeletonRows).toHaveLength(5);
    });

    it('should render single skeleton row', () => {
      const { container } = render(<NotificationSkeleton rows={1} />);

      const skeletonRows = container.querySelectorAll('[aria-hidden="true"]');
      expect(skeletonRows).toHaveLength(1);
    });
  });

  describe('Structure', () => {
    it('should render skeleton matching notification structure (icon, title, message, timestamp)', () => {
      const { container } = render(<NotificationSkeleton rows={1} />);

      const skeletonRow = container.querySelector('[aria-hidden="true"]');
      expect(skeletonRow).toBeInTheDocument();

      // Check for icon skeleton (circle)
      const iconSkeleton = skeletonRow?.querySelector('div[style*="border-radius: 50%"]');
      expect(iconSkeleton).toBeInTheDocument();
      expect(iconSkeleton).toHaveStyle({ width: '24px', height: '24px' });

      // Check for content skeletons (title, message, timestamp)
      const contentSkeletons = skeletonRow?.querySelectorAll('div[style*="border-radius: 4px"]');
      expect(contentSkeletons).toBeDefined();
      expect(contentSkeletons!.length).toBeGreaterThanOrEqual(3); // title, message, timestamp
    });

    it('should have consistent gap between rows', () => {
      const { container } = render(<NotificationSkeleton rows={3} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ gap: '8px' });
    });
  });

  describe('Accessibility', () => {
    it('should hide skeleton from screen readers with aria-hidden', () => {
      const { container } = render(<NotificationSkeleton rows={2} />);

      const skeletonRows = container.querySelectorAll('[aria-hidden="true"]');
      expect(skeletonRows).toHaveLength(2);

      skeletonRows.forEach(row => {
        expect(row).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Styling', () => {
    it('should use placeholder background colors', () => {
      const { container } = render(<NotificationSkeleton rows={1} />);

      const skeletonRow = container.querySelector('[aria-hidden="true"]') as HTMLElement;
      expect(skeletonRow).toHaveStyle({ backgroundColor: '#f5f5f5' });
    });

    it('should have minimum height matching NotificationItem (70px)', () => {
      const { container } = render(<NotificationSkeleton rows={1} />);

      const skeletonRow = container.querySelector('[aria-hidden="true"]') as HTMLElement;
      expect(skeletonRow).toHaveStyle({ minHeight: '70px' });
    });
  });
});
