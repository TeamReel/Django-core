import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { PermissionsPage } from './PermissionsPage';

vi.mock('@django-core/design-system', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Alert: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@django-core/page-templates', () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
  PageContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../providers/BackNavigationProvider', () => ({
  useSetBackNavigation: () => vi.fn(),
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

vi.mock('../../api', () => ({
  api: { get: vi.fn().mockResolvedValue({ results: [] }) },
}));

vi.mock('./permissionsData', () => ({
  roleColumns: ['viewer', 'member', 'admin'],
  expectedPermissionKeys: [],
  permissionMatrix: [],
  formatPermissionLabel: (s: string) => s,
  permissionDescriptionFor: () => '',
  normalizeRoleKey: (s: string) => s,
}));

vi.mock('./PermissionsHierarchyTab', () => ({
  PermissionsHierarchyTab: () => <div>HierarchyTab</div>,
}));

describe('PermissionsPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<PermissionsPage />);
  });
});
