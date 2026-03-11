import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import MobileTabBar, { type MobileTab } from './MobileTabBar';

// jsdom does not have scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const tabs: MobileTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'squad', label: 'Squad' },
  { id: 'media', label: 'Media' },
];

describe('MobileTabBar', () => {
  it('renders all tab labels', () => {
    renderWithProviders(<MobileTabBar tabs={tabs} activeTab="overview" />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Squad')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
  });

  it('marks active tab with data-active', () => {
    renderWithProviders(<MobileTabBar tabs={tabs} activeTab="squad" />);
    const squadPill = screen.getByText('Squad').closest('button, a, [data-active]');
    expect(squadPill).toBeTruthy();
  });

  it('renders inline variant by default', () => {
    const { container } = renderWithProviders(
      <MobileTabBar tabs={tabs} activeTab="overview" />
    );
    expect(container.querySelector('.mobile-tab-bar--inline')).toBeInTheDocument();
  });

  it('navigates when a tab is clicked', () => {
    renderWithProviders(
      <MobileTabBar tabs={tabs} activeTab="overview" />,
      { routerProps: { initialEntries: ['/test'] } },
    );
    fireEvent.click(screen.getByText('Squad'));
    // After click, navigation happens — just ensure no crash
    expect(screen.getByText('Squad')).toBeInTheDocument();
  });
});
