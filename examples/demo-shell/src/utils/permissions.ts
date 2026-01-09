/**
 * Centralized Permission Helpers
 *
 * Provides consistent role-based access control checks across the frontend.
 * Maps membership roles and permission context to UI capabilities.
 */

import { Organisation } from '../types';

/**
 * Actions that can be performed on resources
 */
export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'invite'
  | 'assign_roles';

/**
 * Resource types in the system
 */
export type Resource =
  | 'organisation'
  | 'project'
  | 'user'
  | 'member';

/**
 * Context for permission checks
 */
export interface PermissionContext {
  currentOrganisation?: Organisation;
  isSuperAdmin?: boolean;
  currentUserId?: number;
}

/**
 * Central permission check function
 *
 * Maps organisation membership roles to specific action capabilities.
 *
 * Role hierarchy (within an organisation):
 * - admin: Can create, update, delete organisations and projects
 * - member: Can view organisations and projects, but cannot modify
 * - viewer: Can only view (future role)
 * - (other roles like "coach" map to read-only member permissions)
 *
 * @param action - The action being performed
 * @param resource - The resource type
 * @param context - Permission context including current org and user roles
 * @returns true if the action is permitted, false otherwise
 */
export function canPerformAction(
  action: Action,
  resource: Resource,
  context: PermissionContext
): boolean {
  const { currentOrganisation, isSuperAdmin } = context;

  // Super admins can do anything
  if (isSuperAdmin) {
    return true;
  }

  // No organisation context = no org-scoped permissions
  if (!currentOrganisation) {
    return false;
  }

  // Get the user's role in the current organisation
  const userRole = currentOrganisation.user_role;

  // No role = no permissions
  if (!userRole) {
    return false;
  }

  // Map roles to permissions
  // Only 'admin' can perform write operations
  // All other roles (member, coach, etc.) are read-only
  const isOrgAdmin = userRole === 'admin';

  // Read operations are allowed for all authenticated org members
  if (action === 'read') {
    return true;
  }

  // Write operations require admin role
  if (action === 'create' || action === 'update' || action === 'delete' || action === 'invite' || action === 'assign_roles') {
    return isOrgAdmin;
  }

  // Default deny
  return false;
}

/**
 * Check if user can create projects in the current organisation
 */
export function canCreateProject(context: PermissionContext): boolean {
  return canPerformAction('create', 'project', context);
}

/**
 * Check if user can edit projects in the current organisation
 */
export function canEditProject(context: PermissionContext): boolean {
  return canPerformAction('update', 'project', context);
}

/**
 * Check if user can delete projects in the current organisation
 */
export function canDeleteProject(context: PermissionContext): boolean {
  return canPerformAction('delete', 'project', context);
}

/**
 * Check if user can edit organisations
 */
export function canEditOrganisation(context: PermissionContext): boolean {
  return canPerformAction('update', 'organisation', context);
}

/**
 * Check if user can delete organisations
 */
export function canDeleteOrganisation(context: PermissionContext): boolean {
  return canPerformAction('delete', 'organisation', context);
}

/**
 * Check if user can invite members to the current organisation
 */
export function canInviteMembers(context: PermissionContext): boolean {
  return canPerformAction('invite', 'member', context);
}

/**
 * Check if user can manage members in the current organisation
 */
export function canManageMembers(context: PermissionContext): boolean {
  return canPerformAction('update', 'member', context);
}

/**
 * Check if user can view other users
 *
 * Privacy rules:
 * - Super admin: Can view all users
 * - Org admin: Can view all users in their org
 * - Player/member: Can ONLY view their own user record
 *
 * @param targetUserId - The ID of the user being viewed
 * @param context - Permission context
 * @returns true if the user can view the target user, false otherwise
 */
export function canViewUser(targetUserId: number, context: PermissionContext): boolean {
  const { currentOrganisation, isSuperAdmin, currentUserId } = context;

  // Super admins can view all users
  if (isSuperAdmin) {
    return true;
  }

  // Org admins can view all users in their org
  if (currentOrganisation?.user_role === 'admin') {
    return true;
  }

  // All other roles (member, player, coach, etc.) can only view themselves
  return targetUserId === currentUserId;
}

/**
 * Check if user can view the users list
 *
 * Everyone can access the users page, but non-admins will only see themselves.
 * This is enforced at the API level and in the UI filtering.
 */
export function canAccessUsersPage(): boolean {
  return true;  // All authenticated users can access, filtering happens server-side
}
