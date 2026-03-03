import { describe, it, expect } from 'vitest';
import {
  checkPermission,
  checkAllPermissions,
  checkAnyPermission,
} from './checkPermission';
import type { PermissionMap } from '../types';

describe('checkPermission', () => {
  const mockPermissions: PermissionMap = {
    global: ['system.read_audit', 'system.view_logs'],
    organizations: {
      'org-123': {
        name: 'Acme Corp',
        permissions: ['organization.view', 'organization.edit', 'billing.read'],
        projects: {
          'proj-456': {
            name: 'Website Project',
            permissions: ['project.view', 'project.edit'],
          },
          'proj-789': {
            name: 'Mobile App',
            permissions: ['project.view'],
          },
        },
      },
      'org-999': {
        name: 'Other Corp',
        permissions: ['organization.view'],
        projects: {},
      },
    },
  };

  describe('global permissions', () => {
    it('should grant global permission when present', () => {
      expect(checkPermission(mockPermissions, 'system.read_audit')).toBe(true);
      expect(checkPermission(mockPermissions, 'system.view_logs')).toBe(true);
    });

    it('should deny global permission when not present', () => {
      expect(checkPermission(mockPermissions, 'system.delete_all')).toBe(false);
    });

    it('should grant global permission regardless of context', () => {
      expect(
        checkPermission(mockPermissions, 'system.read_audit', {
          organizationId: 'org-123',
        })
      ).toBe(true);

      expect(
        checkPermission(mockPermissions, 'system.read_audit', {
          organizationId: 'org-123',
          projectId: 'proj-456',
        })
      ).toBe(true);
    });
  });

  describe('organization permissions', () => {
    it('should grant organization permission when present', () => {
      expect(
        checkPermission(mockPermissions, 'organization.view', {
          organizationId: 'org-123',
        })
      ).toBe(true);

      expect(
        checkPermission(mockPermissions, 'organization.edit', {
          organizationId: 'org-123',
        })
      ).toBe(true);
    });

    it('should deny organization permission for wrong organization', () => {
      expect(
        checkPermission(mockPermissions, 'organization.edit', {
          organizationId: 'org-999',
        })
      ).toBe(false);
    });

    it('should deny organization permission when organization not found', () => {
      expect(
        checkPermission(mockPermissions, 'organization.view', {
          organizationId: 'nonexistent',
        })
      ).toBe(false);
    });

    it('should grant org permission even when projectId provided', () => {
      expect(
        checkPermission(mockPermissions, 'billing.read', {
          organizationId: 'org-123',
          projectId: 'proj-456',
        })
      ).toBe(true);
    });
  });

  describe('project permissions', () => {
    it('should grant project permission when present', () => {
      expect(
        checkPermission(mockPermissions, 'project.edit', {
          organizationId: 'org-123',
          projectId: 'proj-456',
        })
      ).toBe(true);
    });

    it('should deny project permission for wrong project', () => {
      expect(
        checkPermission(mockPermissions, 'project.edit', {
          organizationId: 'org-123',
          projectId: 'proj-789',
        })
      ).toBe(false);
    });

    it('should deny project permission when project not found', () => {
      expect(
        checkPermission(mockPermissions, 'project.view', {
          organizationId: 'org-123',
          projectId: 'nonexistent',
        })
      ).toBe(false);
    });

    it('should deny project permission when organization not found', () => {
      expect(
        checkPermission(mockPermissions, 'project.view', {
          organizationId: 'nonexistent',
          projectId: 'proj-456',
        })
      ).toBe(false);
    });

    it('should require both organizationId and projectId for project check', () => {
      // Only projectId provided - should not check project level
      expect(
        checkPermission(mockPermissions, 'project.edit', {
          projectId: 'proj-456',
        })
      ).toBe(false);
    });
  });

  describe('hierarchical resolution', () => {
    it('should check project → organization → global in order', () => {
      // Permission exists at all three levels (global)
      expect(
        checkPermission(mockPermissions, 'system.read_audit', {
          organizationId: 'org-123',
          projectId: 'proj-456',
        })
      ).toBe(true);

      // Permission exists at organization level only
      expect(
        checkPermission(mockPermissions, 'billing.read', {
          organizationId: 'org-123',
          projectId: 'proj-456',
        })
      ).toBe(true);

      // Permission exists at project level only
      expect(
        checkPermission(mockPermissions, 'project.edit', {
          organizationId: 'org-123',
          projectId: 'proj-456',
        })
      ).toBe(true);
    });
  });

  describe('fail-closed behavior', () => {
    it('should deny when permissions is null', () => {
      expect(checkPermission(null, 'any.permission')).toBe(false);
    });

    it('should deny when permissions is undefined', () => {
      expect(checkPermission(undefined, 'any.permission')).toBe(false);
    });

    it('should deny when permission not found anywhere', () => {
      expect(checkPermission(mockPermissions, 'nonexistent.permission')).toBe(
        false
      );
    });

    it('should deny when permissions map is empty', () => {
      const emptyPermissions: PermissionMap = {
        global: [],
        organizations: {},
      };
      expect(checkPermission(emptyPermissions, 'any.permission')).toBe(false);
    });
  });

  describe('checkAllPermissions', () => {
    it('should return true when all permissions granted', () => {
      expect(
        checkAllPermissions(mockPermissions, [
          'system.read_audit',
          'system.view_logs',
        ])
      ).toBe(true);

      expect(
        checkAllPermissions(
          mockPermissions,
          ['organization.view', 'organization.edit'],
          { organizationId: 'org-123' }
        )
      ).toBe(true);
    });

    it('should return false when any permission denied', () => {
      expect(
        checkAllPermissions(mockPermissions, [
          'system.read_audit',
          'nonexistent.permission',
        ])
      ).toBe(false);

      expect(
        checkAllPermissions(
          mockPermissions,
          ['organization.view', 'organization.delete'],
          { organizationId: 'org-123' }
        )
      ).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(checkAllPermissions(mockPermissions, [])).toBe(true);
    });

    it('should fail closed when permissions is null', () => {
      expect(checkAllPermissions(null, ['any.permission'])).toBe(false);
    });
  });

  describe('checkAnyPermission', () => {
    it('should return true when at least one permission granted', () => {
      expect(
        checkAnyPermission(mockPermissions, [
          'system.read_audit',
          'nonexistent.permission',
        ])
      ).toBe(true);

      expect(
        checkAnyPermission(
          mockPermissions,
          ['organization.delete', 'organization.view'],
          { organizationId: 'org-123' }
        )
      ).toBe(true);
    });

    it('should return false when no permissions granted', () => {
      expect(
        checkAnyPermission(mockPermissions, [
          'nonexistent.permission1',
          'nonexistent.permission2',
        ])
      ).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(checkAnyPermission(mockPermissions, [])).toBe(false);
    });

    it('should fail closed when permissions is null', () => {
      expect(checkAnyPermission(null, ['any.permission'])).toBe(false);
    });
  });
});
