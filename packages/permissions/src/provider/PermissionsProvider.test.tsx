/**
 * Tests for PermissionsProvider component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { PermissionsProvider } from './PermissionsProvider';
import { usePermissions } from '../hooks/usePermissions';
import type { PermissionMap } from '../types';

// Mock dependencies
const mockFetchWithCSRF = vi.fn();
const mockUseAuth = vi.fn();
const mockUseMultiTenancyContext = vi.fn();

vi.mock('@django-core/api-client', () => ({
  fetchWithCSRF: (...args: unknown[]) => mockFetchWithCSRF(...args),
}));

vi.mock('@django-core/auth-ui', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@django-core/context-switcher', () => ({
  useContext: () => mockUseMultiTenancyContext(),
}));

/**
 * Test component that uses the permissions hook
 */
function TestComponent() {
  const { permissions, isLoading, error, hasPermission } = usePermissions();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <div data-testid="permissions">{JSON.stringify(permissions)}</div>
      <div data-testid="can-edit">{hasPermission('projects.edit') ? 'yes' : 'no'}</div>
      <div data-testid="can-delete">{hasPermission('projects.delete') ? 'yes' : 'no'}</div>
    </div>
  );
}

describe('PermissionsProvider', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockOrg = { id: 'org-456', name: 'Test Org' };
  const mockProject = { id: 'proj-789', name: 'Test Project' };

  const mockPermissions: PermissionMap = {
    global: ['system.view'],
    organizations: {
      'org-456': {
        name: 'Test Org',
        permissions: ['org.view'],
        projects: {
          'proj-789': {
            name: 'Test Project',
            permissions: ['projects.edit'],
          },
        },
      },
    },
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Default mock implementations
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    mockUseMultiTenancyContext.mockReturnValue({
      selectedOrganization: mockOrg,
      selectedProject: mockProject,
    });

    mockFetchWithCSRF.mockResolvedValue({
      ok: true,
      json: async () => mockPermissions,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Happy Path', () => {
    it('should fetch and provide permissions on mount', async () => {
      render(
        <PermissionsProvider>
          <TestComponent />
        </PermissionsProvider>
      );

      // Should show loading initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Wait for permissions to load
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should call API
      expect(mockFetchWithCSRF).toHaveBeenCalledWith(
        '/api/v1/permissions/current/',
        expect.objectContaining({
          method: 'GET',
        })
      );

      // Should render permissions
      const permissionsEl = screen.getByTestId('permissions');
      expect(permissionsEl.textContent).toContain('projects.edit');
    });

    it('should correctly check permissions using hasPermission', async () => {
      render(
        <PermissionsProvider>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // projects.edit is granted in project context
      expect(screen.getByTestId('can-edit').textContent).toBe('yes');

      // projects.delete is not granted
      expect(screen.getByTestId('can-delete').textContent).toBe('no');
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors', async () => {
      mockFetchWithCSRF.mockRejectedValue(new Error('Network error'));

      render(
        <PermissionsProvider>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Error: Network error')).toBeInTheDocument();
      });
    });

    it('should handle non-ok responses', async () => {
      mockFetchWithCSRF.mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized',
      });

      render(
        <PermissionsProvider>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
        expect(screen.getByText(/Unauthorized/)).toBeInTheDocument();
      });
    });

    it('should clear permissions on error (fail-closed)', async () => {
      mockFetchWithCSRF.mockRejectedValue(new Error('Server error'));

      render(
        <PermissionsProvider>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('permissions').textContent).toBe('null');
      });
    });
  });

  describe('Cache Behavior', () => {
    it('should cache permissions and reuse on remount', async () => {
      const { unmount } = render(
        <PermissionsProvider cacheTTL={5000}>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(mockFetchWithCSRF).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Remount - should use cache
      render(
        <PermissionsProvider cacheTTL={5000}>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should not fetch again (cache hit)
      expect(mockFetchWithCSRF).toHaveBeenCalledTimes(1);
    });

    it('should refetch when cache expires', async () => {
      const { unmount } = render(
        <PermissionsProvider cacheTTL={10}>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(mockFetchWithCSRF).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 20));

      // Remount - cache expired
      render(
        <PermissionsProvider cacheTTL={10}>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(mockFetchWithCSRF).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Context Switch Behavior', () => {
    it('should refetch when organization changes', async () => {
      const { rerender } = render(
        <PermissionsProvider>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(mockFetchWithCSRF).toHaveBeenCalledTimes(1);
      });

      // Change organization
      mockUseMultiTenancyContext.mockReturnValue({
        selectedOrganization: { id: 'org-999', name: 'New Org' },
        selectedProject: mockProject,
      });

      rerender(
        <PermissionsProvider>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(mockFetchWithCSRF).toHaveBeenCalledTimes(2);
      });
    });

    it('should refetch when project changes', async () => {
      const { rerender } = render(
        <PermissionsProvider>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(mockFetchWithCSRF).toHaveBeenCalledTimes(1);
      });

      // Change project
      mockUseMultiTenancyContext.mockReturnValue({
        selectedOrganization: mockOrg,
        selectedProject: { id: 'proj-999', name: 'New Project' },
      });

      rerender(
        <PermissionsProvider>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(mockFetchWithCSRF).toHaveBeenCalledTimes(2);
      });
    });

    it('should use cache when switching back to previous context', async () => {
      const { rerender } = render(
        <PermissionsProvider cacheTTL={5000}>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(mockFetchWithCSRF).toHaveBeenCalledTimes(1);
      });

      // Switch to new organization
      mockUseMultiTenancyContext.mockReturnValue({
        selectedOrganization: { id: 'org-999', name: 'New Org' },
        selectedProject: null,
      });

      rerender(
        <PermissionsProvider cacheTTL={5000}>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(mockFetchWithCSRF).toHaveBeenCalledTimes(2);
      });

      // Switch back to original organization
      mockUseMultiTenancyContext.mockReturnValue({
        selectedOrganization: mockOrg,
        selectedProject: mockProject,
      });

      rerender(
        <PermissionsProvider cacheTTL={5000}>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should use cache (no additional fetch)
      expect(mockFetchWithCSRF).toHaveBeenCalledTimes(2);
    });
  });

  describe('User Context', () => {
    it('should not fetch when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      render(
        <PermissionsProvider>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(mockFetchWithCSRF).not.toHaveBeenCalled();
      expect(screen.getByTestId('permissions').textContent).toBe('null');
    });

    it('should wait for auth to complete before fetching', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
      });

      const { rerender } = render(
        <PermissionsProvider>
          <TestComponent />
        </PermissionsProvider>
      );

      // Should not fetch while auth loading
      expect(mockFetchWithCSRF).not.toHaveBeenCalled();

      // Auth completes
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
      });

      rerender(
        <PermissionsProvider>
          <TestComponent />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(mockFetchWithCSRF).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('refetchPermissions', () => {
    it('should force refetch when called', async () => {
      function TestComponentWithRefetch() {
        const { refetchPermissions, isLoading } = usePermissions();
        return (
          <div>
            {isLoading ? <div>Loading...</div> : <div>Ready</div>}
            <button onClick={refetchPermissions}>Refetch</button>
          </div>
        );
      }

      render(
        <PermissionsProvider>
          <TestComponentWithRefetch />
        </PermissionsProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      expect(mockFetchWithCSRF).toHaveBeenCalledTimes(1);

      // Click refetch button
      const button = screen.getByText('Refetch');
      button.click();

      await waitFor(() => {
        expect(mockFetchWithCSRF).toHaveBeenCalledTimes(2);
      });
    });
  });
});
