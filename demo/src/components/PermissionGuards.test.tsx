import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { AdminOnlyRoute, OrgAdminRoute, useUserRole } from './PermissionGuards';

// Mock the auth hook
vi.mock('@django-core/auth-ui', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@django-core/auth-ui';
const mockUseAuth = vi.mocked(useAuth);

describe('PermissionGuards', () => {
  describe('AdminOnlyRoute', () => {
    it('renders children for superuser', () => {
      mockUseAuth.mockReturnValue({
        user: { is_superuser: true, role: 'superadmin', organisations: [] },
        isLoading: false,
      } as ReturnType<typeof useAuth>);

      renderWithProviders(
        <AdminOnlyRoute>
          <div>Admin content</div>
        </AdminOnlyRoute>
      );
      expect(screen.getByText('Admin content')).toBeInTheDocument();
    });

    it('redirects when user is not admin', () => {
      mockUseAuth.mockReturnValue({
        user: { is_superuser: false, role: 'player', organisations: [] },
        isLoading: false,
      } as ReturnType<typeof useAuth>);

      renderWithProviders(
        <AdminOnlyRoute>
          <div>Admin content</div>
        </AdminOnlyRoute>,
        { routerProps: { initialEntries: ['/admin'] } },
      );
      expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    });

    it('redirects when user is null', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
      } as ReturnType<typeof useAuth>);

      renderWithProviders(
        <AdminOnlyRoute>
          <div>Secret</div>
        </AdminOnlyRoute>,
        { routerProps: { initialEntries: ['/admin'] } },
      );
      expect(screen.queryByText('Secret')).not.toBeInTheDocument();
    });

    it('shows loading skeleton when isLoading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
      } as ReturnType<typeof useAuth>);

      const { container } = renderWithProviders(
        <AdminOnlyRoute>
          <div>Content</div>
        </AdminOnlyRoute>
      );
      // Should render SkeletonDashboard while loading
      expect(container.firstChild).toBeTruthy();
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });
});
