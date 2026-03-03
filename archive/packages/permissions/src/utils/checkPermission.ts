/**
 * Pure utility function for checking permissions in a hierarchical ACL system.
 *
 * This is a framework-agnostic function that can be used in any JavaScript/TypeScript
 * environment, not just React. It implements the permission resolution order:
 * PROJECT → ORGANIZATION → GLOBAL
 *
 * @module utils/checkPermission
 */

import type {
  PermissionCode,
  PermissionMap,
  CheckPermissionOptions,
} from '../types';

/**
 * Check if a user has a specific permission based on hierarchical ACL rules.
 *
 * Resolution order (fail-closed):
 * 1. If projectId provided: check project-level permissions
 * 2. If organizationId provided: check organization-level permissions
 * 3. Check global permissions
 * 4. If permission not found at any level: return false
 *
 * @param permissions - The complete permission map from /api/permissions/current/
 * @param code - The permission code to check (e.g., "projects.view")
 * @param options - Optional context with organizationId and/or projectId
 * @returns true if permission is granted, false otherwise (fail-closed)
 *
 * @example
 * ```ts
 * const permissions = {
 *   global: ["system.read_audit"],
 *   organizations: {
 *     "org-123": {
 *       name: "Acme Corp",
 *       permissions: ["organization.view"],
 *       projects: {
 *         "proj-456": {
 *           name: "Website",
 *           permissions: ["project.edit"]
 *         }
 *       }
 *     }
 *   }
 * };
 *
 * // Check project permission
 * checkPermission(permissions, "project.edit", {
 *   organizationId: "org-123",
 *   projectId: "proj-456"
 * }); // true
 *
 * // Check organization permission
 * checkPermission(permissions, "organization.view", {
 *   organizationId: "org-123"
 * }); // true
 *
 * // Check global permission
 * checkPermission(permissions, "system.read_audit"); // true
 *
 * // Permission not found - fail closed
 * checkPermission(permissions, "unknown.permission"); // false
 * ```
 */
export function checkPermission(
  permissions: PermissionMap | null | undefined,
  code: PermissionCode,
  options?: CheckPermissionOptions
): boolean {
  // Fail closed if permissions not loaded
  if (!permissions) {
    return false;
  }

  const { organizationId, projectId } = options || {};

  // 1. Check project-level permissions (most specific)
  if (projectId && organizationId) {
    const org = permissions.organizations[organizationId];
    if (org?.projects[projectId]?.permissions.includes(code)) {
      return true;
    }
  }

  // 2. Check organization-level permissions
  if (organizationId) {
    const org = permissions.organizations[organizationId];
    if (org?.permissions.includes(code)) {
      return true;
    }
  }

  // 3. Check global permissions (least specific, but applies everywhere)
  if (permissions.global.includes(code)) {
    return true;
  }

  // 4. Fail closed - permission not found at any level
  return false;
}

/**
 * Check multiple permissions with AND logic (all must be granted).
 *
 * @param permissions - The complete permission map
 * @param codes - Array of permission codes to check
 * @param options - Optional context with organizationId and/or projectId
 * @returns true only if ALL permissions are granted
 *
 * @example
 * ```ts
 * checkAllPermissions(permissions, [
 *   "project.view",
 *   "project.edit"
 * ], { organizationId: "org-123", projectId: "proj-456" });
 * ```
 */
export function checkAllPermissions(
  permissions: PermissionMap | null | undefined,
  codes: PermissionCode[],
  options?: CheckPermissionOptions
): boolean {
  return codes.every((code) => checkPermission(permissions, code, options));
}

/**
 * Check multiple permissions with OR logic (at least one must be granted).
 *
 * @param permissions - The complete permission map
 * @param codes - Array of permission codes to check
 * @param options - Optional context with organizationId and/or projectId
 * @returns true if ANY permission is granted
 *
 * @example
 * ```ts
 * checkAnyPermission(permissions, [
 *   "project.view",
 *   "organization.view"
 * ], { organizationId: "org-123" });
 * ```
 */
export function checkAnyPermission(
  permissions: PermissionMap | null | undefined,
  codes: PermissionCode[],
  options?: CheckPermissionOptions
): boolean {
  return codes.some((code) => checkPermission(permissions, code, options));
}
