/**
 * Core types for the permissions system.
 *
 * This module defines the TypeScript interfaces and types that represent
 * the hierarchical permission structure returned by the backend.
 */

/**
 * Permission code in the format "module.action"
 * Examples: "projects.view", "organization.edit", "billing.read"
 */
export type PermissionCode = string;

/**
 * Permission scope levels in the hierarchical ACL system
 */
export type PermissionScope = 'GLOBAL' | 'ORGANIZATION' | 'PROJECT';

/**
 * Project-level permissions structure
 */
export interface ProjectPermissions {
  /** Project display name */
  name: string;
  /** List of permission codes granted for this project */
  permissions: PermissionCode[];
}

/**
 * Organization-level permissions structure with nested projects
 */
export interface OrganizationPermissions {
  /** Organization display name */
  name: string;
  /** List of permission codes granted for this organization */
  permissions: PermissionCode[];
  /** Nested project permissions indexed by project ID */
  projects: Record<string, ProjectPermissions>;
}

/**
 * Complete permission map matching the /api/permissions/current/ response
 *
 * This represents the hierarchical permission structure:
 * - global: System-wide permissions
 * - organizations: Per-organization permissions with nested projects
 */
export interface PermissionMap {
  /** Global (system-wide) permissions */
  global: PermissionCode[];
  /** Organization permissions indexed by organization ID */
  organizations: Record<string, OrganizationPermissions>;
}

/**
 * Options for checking permissions with contextual scope
 */
export interface CheckPermissionOptions {
  /** Organization ID for organization-scoped permission checks */
  organizationId?: string;
  /** Project ID for project-scoped permission checks */
  projectId?: string;
}

/**
 * Permission check result with additional context
 */
export interface PermissionCheckResult {
  /** Whether the permission is granted */
  granted: boolean;
  /** The scope where the permission was found (if granted) */
  scope?: PermissionScope;
  /** Reason for denial (if not granted) */
  reason?: string;
}
