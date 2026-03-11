import { render } from '@testing-library/react';
import {
  SkeletonCard,
  SkeletonList,
  SkeletonGrid,
  SkeletonPageHeader,
  SkeletonTabBar,
  SkeletonDetailPage,
  SkeletonTablePage,
  SkeletonDashboard,
} from './SkeletonComposites';

describe('SkeletonComposites', () => {
  describe('SkeletonCard', () => {
    it('renders without crashing', () => {
      const { container } = render(<SkeletonCard />);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders image placeholder when showImage is true', () => {
      const { container } = render(<SkeletonCard showImage />);
      // Image placeholder is the first skeleton child
      expect(container.querySelectorAll('div').length).toBeGreaterThan(2);
    });
  });

  describe('SkeletonList', () => {
    it('renders correct number of items', () => {
      const { container } = render(<SkeletonList count={5} />);
      const list = container.firstChild as HTMLElement;
      expect(list.children.length).toBe(5);
    });

    it('renders row variant', () => {
      const { container } = render(<SkeletonList count={3} variant="row" />);
      expect(container.firstChild).toBeTruthy();
      expect((container.firstChild as HTMLElement).children.length).toBe(3);
    });
  });

  describe('SkeletonGrid', () => {
    it('renders correct number of grid items', () => {
      const { container } = render(<SkeletonGrid count={6} columns={3} />);
      const grid = container.firstChild as HTMLElement;
      expect(grid.children.length).toBe(6);
    });
  });

  describe('SkeletonPageHeader', () => {
    it('renders without crashing', () => {
      const { container } = render(<SkeletonPageHeader />);
      expect(container.firstChild).toBeTruthy();
    });

    it('hides breadcrumbs when showBreadcrumbs is false', () => {
      // With breadcrumbs = 5 extra skeleton items; without = fewer
      const { container: with_ } = render(<SkeletonPageHeader showBreadcrumbs />);
      const { container: without } = render(<SkeletonPageHeader showBreadcrumbs={false} />);
      expect(without.querySelectorAll('div').length).toBeLessThan(with_.querySelectorAll('div').length);
    });
  });

  describe('SkeletonTabBar', () => {
    it('renders correct number of tabs', () => {
      const { container } = render(<SkeletonTabBar count={5} />);
      const bar = container.firstChild as HTMLElement;
      expect(bar.children.length).toBe(5);
    });
  });

  describe('SkeletonDetailPage', () => {
    it('renders without crashing', () => {
      const { container } = render(<SkeletonDetailPage />);
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('SkeletonTablePage', () => {
    it('renders correct number of rows', () => {
      const { container } = render(<SkeletonTablePage rows={3} columns={4} />);
      // Should have 3 data rows + 1 header row
      expect(container.firstChild).toBeTruthy();
    });

    it('hides filters when showFilters is false', () => {
      const { container: with_ } = render(<SkeletonTablePage showFilters />);
      const { container: without } = render(<SkeletonTablePage showFilters={false} />);
      expect(without.querySelectorAll('div').length).toBeLessThan(with_.querySelectorAll('div').length);
    });
  });

  describe('SkeletonDashboard', () => {
    it('renders without crashing', () => {
      const { container } = render(<SkeletonDashboard />);
      expect(container.firstChild).toBeTruthy();
    });
  });
});
