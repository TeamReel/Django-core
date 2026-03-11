import { renderWithProviders } from '@/test';
import { ProfilePage } from './ProfilePage';

vi.mock('@django-core/design-system', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Alert: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@django-core/page-templates', () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
  PageContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../components/AppShell', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../api', () => ({
  api: { get: vi.fn().mockResolvedValue({ id: '1', first_name: 'Test', last_name: 'User', email: 'test@test.com' }) },
  ApiError: class ApiError extends Error {},
}));

describe('ProfilePage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<ProfilePage />);
  });
});
