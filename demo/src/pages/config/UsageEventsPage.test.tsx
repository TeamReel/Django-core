import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { UsageEventsPage } from './UsageEventsPage';

vi.mock('@django-core/page-templates', () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
  PageContent: ({ children }: any) => <div>{children}</div>,
  BreadcrumbContextSwitcher: () => null,
}));

vi.mock('@django-core/design-system', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  Alert: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('../../shims/design-system', () => ({
  Table: Object.assign(
    ({ children }: any) => <table>{children}</table>,
    {
      Head: ({ children }: any) => <thead>{children}</thead>,
      Body: ({ children }: any) => <tbody>{children}</tbody>,
      Row: ({ children }: any) => <tr>{children}</tr>,
      Cell: ({ children }: any) => <td>{children}</td>,
      HeaderCell: ({ children }: any) => <th>{children}</th>,
    },
  ),
}));

vi.mock('./useUsageEvents', () => ({
  useUsageEvents: () => ({
    events: [],
    filteredEvents: [],
    isLoading: false,
    error: null,
    filters: {},
    setFilters: vi.fn(),
    selectedEvent: null,
    setSelectedEvent: vi.fn(),
  }),
  formatTimestamp: (d: string) => d,
}));

vi.mock('./UsageEventsFilters', () => ({ UsageEventsFilters: () => null }));
vi.mock('./UsageEventDetailModal', () => ({ UsageEventDetailModal: () => null }));

describe('UsageEventsPage', () => {
  it('renders title', () => {
    renderWithProviders(<UsageEventsPage />);
    expect(screen.getByText('Usage Events')).toBeInTheDocument();
  });
});
