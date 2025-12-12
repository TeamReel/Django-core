/**
 * Tests for PermissionGate component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PermissionGate } from './PermissionGate';
import { PermissionsProvider } from '../provider/PermissionsProvider';
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

describe('PermissionGate', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockOrg = { id: 'org-456', name: 'Test Org' };
  const mockProject = { id: 'proj-789', name: 'Test Project' };

  const mockPermissions: PermissionMap = {
    global: ['system.view'],
    organizations: {
      'org-456': {
        name: 'Test Org',
        permissions: ['org.view', 'org.edit'],
        projects: {
          'proj-789': {
            name: 'Test Project',
            permissions: ['projects.edit', 'projects.view'],
          },
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

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

  describe('Hide Mode (Default)', () => {
    it('should render children when permission is granted', async () => {
      render(
        <PermissionsProvider>
          <PermissionGate permission="projects.edit">
            <button>Edit Project</button>
          </PermissionGate>
        </PermissionsProvider>
      );

      await vi.waitFor(() => {
        expect(screen.getByText('Edit Project')).toBeInTheDocument();
      });
    });

    it('should return null when permission is denied', async () => {
      render(
        <PermissionsProvider>
          <PermissionGate permission="projects.delete">
            <button>Delete Project</button>
          </PermissionGate>
        </PermissionsProvider>
      );

      await vi.waitFor(() => {
        expect(screen.queryByText('Delete Project')).not.toBeInTheDocument();
      });
    });

    it('should render fallback when permission is denied', async () => {
      render(
        <PermissionsProvider>
          <PermissionGate
            permission="projects.delete"
            fallback={<div>Permission Denied</div>}
          >
            <button>Delete Project</button>
          </PermissionGate>
        </PermissionsProvider>
      );

      await vi.waitFor(() => {
        expect(screen.getByText('Permission Denied')).toBeInTheDocument();
        expect(screen.queryByText('Delete Project')).not.toBeInTheDocument();
      });
    });
  });

  describe('Disable Mode', () => {
    it('should pass disabled prop when permission is denied', async () => {
      render(
        <PermissionsProvider>
          <PermissionGate permission="projects.delete" mode="disable">
            <button>Delete Project</button>
          </PermissionGate>
        </PermissionsProvider>
      );

      await vi.waitFor(() => {
        const button = screen.getByText('Delete Project') as HTMLButtonElement;
        expect(button).toBeInTheDocument();
        expect(button.disabled).toBe(true);
      });
    });

    it('should not disable children when permission is granted', async () => {
      render(
        <PermissionsProvider>
          <PermissionGate permission="projects.edit" mode="disable">
            <button>Edit Project</button>
          </PermissionGate>
        </PermissionsProvider>
      );

      await vi.waitFor(() => {
        const button = screen.getByText('Edit Project') as HTMLButtonElement;
        expect(button).toBeInTheDocument();
        expect(button.disabled).not.toBe(true);
      });
    });
  });

  describe('Multiple Permissions (AND Logic)', () => {
    it('should grant access when all permissions are granted', async () => {
      render(
        <PermissionsProvider>
          <PermissionGate permission={['projects.edit', 'projects.view']}>
            <button>Edit and View</button>
          </PermissionGate>
        </PermissionsProvider>
      );

      await vi.waitFor(() => {
        expect(screen.getByText('Edit and View')).toBeInTheDocument();
      });
    });

    it('should deny access when any permission is denied', async () => {
      render(
        <PermissionsProvider>
          <PermissionGate permission={['projects.edit', 'projects.delete']}>
            <button>Edit and Delete</button>
          </PermissionGate>
        </PermissionsProvider>
      );

      await vi.waitFor(() => {
        expect(screen.queryByText('Edit and Delete')).not.toBeInTheDocument();
      });
    });
  });

  describe('Explicit Context', () => {
    it('should check permission in explicit context', async () => {
      render(
        <PermissionsProvider>
          <PermissionGate
            permission="org.edit"
            organizationId="org-456"
          >
            <button>Edit Org</button>
          </PermissionGate>
        </PermissionsProvider>
      );

      await vi.waitFor(() => {
        expect(screen.getByText('Edit Org')).toBeInTheDocument();
      });
    });

    it('should deny permission in wrong context', async () => {
      render(
        <PermissionsProvider>
          <PermissionGate
            permission="projects.edit"
            organizationId="org-456"
            projectId="proj-999"
          >
            <button>Edit Wrong Project</button>
          </PermissionGate>
        </PermissionsProvider>
      );

      await vi.waitFor(() => {
        expect(screen.queryByText('Edit Wrong Project')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading component when provided', () => {
      mockFetchWithCSRF.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <PermissionsProvider>
          <PermissionGate
            permission="projects.edit"
            loadingComponent={<div>Loading permissions...</div>}
          >
            <button>Edit Project</button>
          </PermissionGate>
        </PermissionsProvider>
      );

      expect(screen.getByText('Loading permissions...')).toBeInTheDocument();
      expect(screen.queryByText('Edit Project')).not.toBeInTheDocument();
    });

    it('should not show loading when loadingComponent not provided', () => {
      mockFetchWithCSRF.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <PermissionsProvider>
          <PermissionGate permission="projects.edit">
            <button>Edit Project</button>
          </PermissionGate>
        </PermissionsProvider>
      );

      // Should fail-closed (render nothing)
      expect(screen.queryByText('Edit Project')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty permission array', async () => {
      render(
        <PermissionsProvider>
          <PermissionGate permission={[]}>
            <button>Empty Permissions</button>
          </PermissionGate>
        </PermissionsProvider>
      );

      await vi.waitFor(() => {
        // Empty array means all granted (vacuous truth)
        expect(screen.getByText('Empty Permissions')).toBeInTheDocument();
      });
    });

    it('should handle multiple children in disable mode', async () => {
      render(
        <PermissionsProvider>
          <PermissionGate permission="projects.delete" mode="disable">
            <button>Delete</button>
            <button>Archive</button>
          </PermissionGate>
        </PermissionsProvider>
      );

      await vi.waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(2);
        buttons.forEach((button: Element) => {
          expect((button as HTMLButtonElement).disabled).toBe(true);
        });
      });
    });
  });
});
