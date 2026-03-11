import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { AuditLogPage } from './AuditLogPage';

vi.mock('@django-core/design-system', () => ({
  Input: (props: any) => <input {...props} />,
  Badge: ({ children }: any) => <span>{children}</span>,
  Card: ({ children }: any) => <div>{children}</div>,
  Alert: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@django-core/page-templates', () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
  PageContent: ({ children }: any) => <div>{children}</div>,
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

vi.mock('./useAuditLogData', () => ({
  useAuditLogData: () => ({
    events: [],
    isLoading: false,
    error: null,
    searchQuery: '',
    setSearchQuery: vi.fn(),
    typeFilter: 'all',
    setTypeFilter: vi.fn(),
    filteredEvents: [],
    selectedEvent: null,
    setSelectedEvent: vi.fn(),
  }),
  eventTypeColorMap: {},
  getEventOutcome: () => 'success',
}));

vi.mock('./AuditLogDetailModal', () => ({
  AuditLogDetailModal: () => null,
}));

describe('AuditLogPage', () => {
  it('renders title', () => {
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
  });
});
