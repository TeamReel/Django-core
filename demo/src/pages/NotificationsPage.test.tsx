import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';

vi.mock('@django-core/design-system', () => ({
  Alert: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children }: any) => <div>{children}</div>,
  PullToRefresh: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../components/ui/PageHeader', () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));

vi.mock('../providers/BackNavigationProvider', () => ({
  useSetBackNavigation: () => vi.fn(),
}));

vi.mock('@/api', () => ({
  api: { get: vi.fn().mockResolvedValue({ results: [] }) },
}));

vi.mock('../components/SwipeableCard', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

// Lazy import to ensure mocks are registered first
const { default: NotificationsPage } = await import('./NotificationsPage');

describe('NotificationsPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<NotificationsPage />);
  });
});
