import { render, screen, fireEvent, act } from '@testing-library/react';
import MobileFilterSheet from './MobileFilterSheet';

// Mock useHapticFeedback
vi.mock('../hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ light: vi.fn(), medium: vi.fn(), heavy: vi.fn() }),
}));

describe('MobileFilterSheet', () => {
  beforeEach(() => {
    // Start with desktop viewport
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    window.dispatchEvent(new Event('resize'));
  });

  it('renders children inline on desktop', () => {
    render(
      <MobileFilterSheet>
        <select><option>Season 1</option></select>
      </MobileFilterSheet>
    );
    expect(screen.getByText('Season 1')).toBeInTheDocument();
    // No filter button on desktop
    expect(screen.queryByText('Filters')).not.toBeInTheDocument();
  });

  it('shows filter button on mobile', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 });
    window.dispatchEvent(new Event('resize'));

    render(
      <MobileFilterSheet>
        <select><option>Season 1</option></select>
      </MobileFilterSheet>
    );

    // On mobile, a Filters button is shown
    expect(screen.getAllByText('Filters').length).toBeGreaterThanOrEqual(1);
  });
});
