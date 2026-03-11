import { renderWithProviders } from '@/test';
import { MembershipsPage } from './MembershipsPage';

vi.mock('@django-core/design-system', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  Alert: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@django-core/page-templates', () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
  PageContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../providers/BackNavigationProvider', () => ({
  useSetBackNavigation: () => vi.fn(),
}));

vi.mock('@django-core/auth-ui', () => ({
  useAuth: () => ({ user: { id: '1', email: 'test@test.com' } }),
}));

vi.mock('@django-core/context-switcher', () => ({
  useContextSwitcher: () => ({
    context: { organisation: { id: '1', name: 'Demo Org' } },
  }),
}));

vi.mock('@/api', () => ({
  api: { get: vi.fn().mockResolvedValue({ results: [] }) },
}));

describe('MembershipsPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<MembershipsPage />);
  });
});
