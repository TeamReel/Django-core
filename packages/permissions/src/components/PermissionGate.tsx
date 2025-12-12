/**
 * PermissionGate component for declarative permission checks.
 *
 * This component:
 * - Checks one or more permissions
 * - Supports "hide" mode (return null/fallback if denied)
 * - Supports "disable" mode (pass disabled prop to children)
 * - Works with current context (F02/F03) or explicit context
 *
 * @module components/PermissionGate
 */

import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import type { PermissionCode, CheckPermissionOptions } from '../types';

/**
 * Props for PermissionGate component
 */
export interface PermissionGateProps {
  /**
   * Permission code(s) to check.
   * If array, all permissions must be granted (AND logic).
   */
  permission: PermissionCode | PermissionCode[];

  /**
   * Mode for handling denied permissions:
   * - "hide": Return null or fallback component if denied
   * - "disable": Render children but pass disabled=true prop
   *
   * @default "hide"
   */
  mode?: 'hide' | 'disable';

  /**
   * Fallback content to render when permission is denied (only for "hide" mode).
   * If not provided, returns null.
   */
  fallback?: React.ReactNode;

  /**
   * Children to render when permission is granted.
   */
  children: React.ReactNode;

  /**
   * Explicit organization ID for permission check.
   * If not provided, uses current organization from F03 context.
   */
  organizationId?: string;

  /**
   * Explicit project ID for permission check.
   * If not provided, uses current project from F03 context.
   */
  projectId?: string;

  /**
   * Loading state component.
   * If provided, shown while permissions are loading.
   */
  loadingComponent?: React.ReactNode;
}

/**
 * PermissionGate component
 *
 * @example Hide content when permission is denied
 * ```tsx
 * <PermissionGate permission="projects.edit">
 *   <EditButton />
 * </PermissionGate>
 * ```
 *
 * @example Show fallback when permission is denied
 * ```tsx
 * <PermissionGate
 *   permission="projects.edit"
 *   fallback={<ViewOnlyBadge />}
 * >
 *   <EditButton />
 * </PermissionGate>
 * ```
 *
 * @example Disable button when permission is denied
 * ```tsx
 * <PermissionGate permission="projects.delete" mode="disable">
 *   <button>Delete Project</button>
 * </PermissionGate>
 * ```
 *
 * @example Check multiple permissions (AND logic)
 * ```tsx
 * <PermissionGate permission={['projects.edit', 'projects.publish']}>
 *   <PublishButton />
 * </PermissionGate>
 * ```
 *
 * @example Check permission in explicit context
 * ```tsx
 * <PermissionGate
 *   permission="projects.edit"
 *   organizationId="org-123"
 *   projectId="proj-456"
 * >
 *   <EditButton />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permission,
  mode = 'hide',
  fallback = null,
  children,
  organizationId,
  projectId,
  loadingComponent = null,
}: PermissionGateProps) {
  const { hasPermission, isLoading } = usePermissions();

  // Show loading component if provided
  if (isLoading && loadingComponent) {
    return <>{loadingComponent}</>;
  }

  // Build options for permission check
  const options: CheckPermissionOptions | undefined =
    organizationId || projectId
      ? {
          organizationId,
          projectId,
        }
      : undefined;

  // Check permission(s)
  const isGranted = Array.isArray(permission)
    ? permission.every((code) => hasPermission(code, options))
    : hasPermission(permission, options);

  // Handle denied permissions
  if (!isGranted) {
    if (mode === 'hide') {
      return <>{fallback}</>;
    }

    if (mode === 'disable') {
      // Clone children and add disabled prop
      return (
        <>
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, { disabled: true } as any);
            }
            return child;
          })}
        </>
      );
    }
  }

  // Permission granted - render children
  return <>{children}</>;
}
