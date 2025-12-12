/**
 * Centralized mock setup for workspace packages
 *
 * This file exports mock implementations that can be used by vi.mock()
 * Must be imported before the actual packages in test files.
 */

import { vi } from 'vitest';

// Mock implementations
export const mockFetchWithCSRF = vi.fn();
export const mockUseAuth = vi.fn();
export const mockUseMultiTenancyContext = vi.fn();

// Default return values
export const defaultAuthState = {
  user: { id: 'user-123', email: 'test@example.com' },
  isLoading: false,
};

export const defaultContextState = {
  selectedOrganization: { id: 'org-456', name: 'Test Org' },
  selectedProject: { id: 'proj-789', name: 'Test Project' },
};

export const defaultPermissions = {
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

/**
 * Reset all mocks to default state
 */
export function resetMocks() {
  vi.clearAllMocks();

  mockUseAuth.mockReturnValue(defaultAuthState);
  mockUseMultiTenancyContext.mockReturnValue(defaultContextState);
  mockFetchWithCSRF.mockResolvedValue({
    ok: true,
    json: async () => defaultPermissions,
  });
}
