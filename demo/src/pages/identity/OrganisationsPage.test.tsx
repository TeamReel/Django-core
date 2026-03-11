import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { OrganisationsPage } from './OrganisationsPage';

vi.mock('@django-core/design-system', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Alert: ({ children }: any) => <div>{children}</div>,
  Card: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@django-core/page-templates', () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
  PageContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@django-core/auth-ui', () => ({
  useAuth: () => ({ user: { id: '1', email: 'test@test.com', is_superuser: false } }),
}));

vi.mock('@django-core/context-switcher', () => ({
  useContextSwitcher: () => ({
    context: { organisation: { id: '1', name: 'Demo Org', slug: 'demo' } },
  }),
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

vi.mock('../../components/ui/ConfirmDialog', () => ({
  useConfirm: () => ({ confirm: vi.fn(), ConfirmDialog: () => null }),
}));

vi.mock('./OrganisationDetailModal', () => ({ default: () => null }));
vi.mock('./OrganisationEditModal', () => ({ default: () => null }));
vi.mock('./OrganisationCreateModal', () => ({ default: () => null }));
vi.mock('@/api', () => ({ api: { get: vi.fn().mockResolvedValue({ results: [] }) } }));

describe('OrganisationsPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<OrganisationsPage />);
  });
});
