/**
 * Tests for centralized permission helper
 *
 * Validates that permission checks work correctly for different roles
 */

import { describe, it, expect } from 'vitest';
import {
  canPerformAction,
  canCreateProject,
  canEditProject,
  canDeleteProject,
  canEditOrganisation,
  canDeleteOrganisation,
  canInviteMembers,
  canManageMembers,
} from '../utils/permissions';
import { Organisation } from '../types';

describe('Permission Helpers', () => {
  const adminOrg: Organisation = {
    id: 'org-1',
    name: 'Test Org',
    user_role: 'admin',
    is_active: true,
  };

  const memberOrg: Organisation = {
    id: 'org-2',
    name: 'Member Org',
    user_role: 'member',
    is_active: true,
  };

  const noRoleOrg: Organisation = {
    id: 'org-3',
    name: 'No Role Org',
    is_active: true,
  };

  describe('canPerformAction', () => {
    it('allows super admin to perform any action', () => {
      expect(
        canPerformAction('create', 'project', {
          currentOrganisation: memberOrg,
          isSuperAdmin: true,
        })
      ).toBe(true);

      expect(
        canPerformAction('delete', 'organisation', {
          currentOrganisation: memberOrg,
          isSuperAdmin: true,
        })
      ).toBe(true);
    });

    it('allows org admin to perform write actions', () => {
      expect(
        canPerformAction('create', 'project', {
          currentOrganisation: adminOrg,
          isSuperAdmin: false,
        })
      ).toBe(true);

      expect(
        canPerformAction('update', 'project', {
          currentOrganisation: adminOrg,
          isSuperAdmin: false,
        })
      ).toBe(true);

      expect(
        canPerformAction('delete', 'project', {
          currentOrganisation: adminOrg,
          isSuperAdmin: false,
        })
      ).toBe(true);
    });

    it('denies org member write actions', () => {
      expect(
        canPerformAction('create', 'project', {
          currentOrganisation: memberOrg,
          isSuperAdmin: false,
        })
      ).toBe(false);

      expect(
        canPerformAction('update', 'project', {
          currentOrganisation: memberOrg,
          isSuperAdmin: false,
        })
      ).toBe(false);

      expect(
        canPerformAction('delete', 'project', {
          currentOrganisation: memberOrg,
          isSuperAdmin: false,
        })
      ).toBe(false);
    });

    it('allows org member read actions', () => {
      expect(
        canPerformAction('read', 'project', {
          currentOrganisation: memberOrg,
          isSuperAdmin: false,
        })
      ).toBe(true);
    });

    it('denies actions when no organisation context', () => {
      expect(
        canPerformAction('create', 'project', {
          isSuperAdmin: false,
        })
      ).toBe(false);
    });

    it('denies actions when user has no role in organisation', () => {
      expect(
        canPerformAction('create', 'project', {
          currentOrganisation: noRoleOrg,
          isSuperAdmin: false,
        })
      ).toBe(false);
    });
  });

  describe('canCreateProject', () => {
    it('returns true for admin', () => {
      expect(
        canCreateProject({
          currentOrganisation: adminOrg,
          isSuperAdmin: false,
        })
      ).toBe(true);
    });

    it('returns false for member (including Coach role)', () => {
      expect(
        canCreateProject({
          currentOrganisation: memberOrg,
          isSuperAdmin: false,
        })
      ).toBe(false);
    });

    it('returns true for super admin', () => {
      expect(
        canCreateProject({
          currentOrganisation: memberOrg,
          isSuperAdmin: true,
        })
      ).toBe(true);
    });
  });

  describe('canEditProject', () => {
    it('returns true for admin', () => {
      expect(
        canEditProject({
          currentOrganisation: adminOrg,
          isSuperAdmin: false,
        })
      ).toBe(true);
    });

    it('returns false for member (including Coach role)', () => {
      expect(
        canEditProject({
          currentOrganisation: memberOrg,
          isSuperAdmin: false,
        })
      ).toBe(false);
    });
  });

  describe('canDeleteProject', () => {
    it('returns true for admin', () => {
      expect(
        canDeleteProject({
          currentOrganisation: adminOrg,
          isSuperAdmin: false,
        })
      ).toBe(true);
    });

    it('returns false for member (including Coach role)', () => {
      expect(
        canDeleteProject({
          currentOrganisation: memberOrg,
          isSuperAdmin: false,
        })
      ).toBe(false);
    });
  });

  describe('canEditOrganisation', () => {
    it('returns true for admin', () => {
      expect(
        canEditOrganisation({
          currentOrganisation: adminOrg,
          isSuperAdmin: false,
        })
      ).toBe(true);
    });

    it('returns false for member', () => {
      expect(
        canEditOrganisation({
          currentOrganisation: memberOrg,
          isSuperAdmin: false,
        })
      ).toBe(false);
    });
  });

  describe('canDeleteOrganisation', () => {
    it('returns true for admin', () => {
      expect(
        canDeleteOrganisation({
          currentOrganisation: adminOrg,
          isSuperAdmin: false,
        })
      ).toBe(true);
    });

    it('returns false for member', () => {
      expect(
        canDeleteOrganisation({
          currentOrganisation: memberOrg,
          isSuperAdmin: false,
        })
      ).toBe(false);
    });
  });

  describe('canInviteMembers', () => {
    it('returns true for admin', () => {
      expect(
        canInviteMembers({
          currentOrganisation: adminOrg,
          isSuperAdmin: false,
        })
      ).toBe(true);
    });

    it('returns false for member', () => {
      expect(
        canInviteMembers({
          currentOrganisation: memberOrg,
          isSuperAdmin: false,
        })
      ).toBe(false);
    });
  });

  describe('canManageMembers', () => {
    it('returns true for admin', () => {
      expect(
        canManageMembers({
          currentOrganisation: adminOrg,
          isSuperAdmin: false,
        })
      ).toBe(true);
    });

    it('returns false for member', () => {
      expect(
        canManageMembers({
          currentOrganisation: memberOrg,
          isSuperAdmin: false,
        })
      ).toBe(false);
    });
  });
});
