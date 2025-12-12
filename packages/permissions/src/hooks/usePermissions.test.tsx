/**
 * Tests for usePermissions hook
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import type { PermissionMap } from '../types';

// Import components and mocked dependencies
import { usePermissions } from './usePermissions';
import { PermissionsProvider } from '../provider/PermissionsProvider';
import { fetchWithCSRF } from '@django-core/api-client';
import { useAuth } from '@django-core/auth-ui';
import { useContext as useMultiTenancyContext } from '@django-core/context-switcher';

// Get typed mock references
const mockFetchWithCSRF = vi.mocked(fetchWithCSRF);
const mockUseAuth = vi.mocked(useAuth);
const mockUseMultiTenancyContext = vi.mocked(useMultiTenancyContext);

describe('usePermissions', () => {
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

  describe('With Provider', () => {
    it('should return permissions context', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PermissionsProvider>{children}</PermissionsProvider>
      );

      const { result } = renderHook(() => usePermissions(), { wrapper });

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.permissions).toBeNull();

      // Wait for permissions to load
      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.permissions).toEqual(mockPermissions);
      expect(result.current.error).toBeNull();
    });

    it('should provide hasPermission function', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PermissionsProvider>{children}</PermissionsProvider>
      );

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Check project permission (should be granted)
      expect(result.current.hasPermission('projects.edit')).toBe(true);

      // Check non-existent permission (should be denied)
      expect(result.current.hasPermission('projects.delete')).toBe(false);
    });

    it('should provide refetchPermissions function', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PermissionsProvider>{children}</PermissionsProvider>
      );

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchWithCSRF).toHaveBeenCalledTimes(1);

      // Call refetch
      await result.current.refetchPermissions();

      expect(mockFetchWithCSRF).toHaveBeenCalledTimes(2);
    });

    it('should allow checking permissions with explicit context', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PermissionsProvider>{children}</PermissionsProvider>
      );

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Check with explicit context
      const canEdit = result.current.hasPermission('projects.edit', {
        organizationId: 'org-456',
        projectId: 'proj-789',
      });

      expect(canEdit).toBe(true);

      // Check with wrong context
      const canEditWrongProject = result.current.hasPermission('projects.edit', {
        organizationId: 'org-456',
        projectId: 'proj-999',
      });

      expect(canEditWrongProject).toBe(false);
    });
  });

  describe('Without Provider (Fail-Closed)', () => {
    it('should return fail-closed defaults when no provider', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.permissions).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should deny all permissions when no provider', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission('projects.edit')).toBe(false);
      expect(result.current.hasPermission('system.view')).toBe(false);
    });

    it('should provide no-op refetchPermissions when no provider', async () => {
      const { result } = renderHook(() => usePermissions());

      // Should not throw
      await expect(result.current.refetchPermissions()).resolves.toBeUndefined();
    });

    it('should log warning in development when no provider', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Set NODE_ENV to development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      renderHook(() => usePermissions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hook used outside PermissionsProvider')
      );

      // Restore
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });
});
