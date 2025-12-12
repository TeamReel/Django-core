/**
 * Hook to access the permissions context.
 *
 * This hook provides:
 * - Current permissions map
 * - Loading and error states
 * - hasPermission function for permission checks
 * - refetchPermissions for manual refresh
 *
 * **Fail-closed behavior**: If used outside a PermissionsProvider,
 * returns safe defaults (no permissions, not loading, no error).
 *
 * @module hooks/usePermissions
 */

import { useContext } from 'react';
import { PermissionsContext } from '../provider/PermissionsContext';
import type { PermissionsContextValue } from '../provider/PermissionsContext';

/**
 * Access the permissions context
 *
 * @returns Permissions context value
 * @throws {Error} Warning logged in development if used outside provider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { hasPermission, isLoading } = usePermissions();
 *
 *   if (isLoading) {
 *     return <Spinner />;
 *   }
 *
 *   if (hasPermission('projects.edit')) {
 *     return <EditButton />;
 *   }
 *
 *   return null;
 * }
 * ```
 *
 * @example With explicit context
 * ```tsx
 * function MyComponent() {
 *   const { hasPermission } = usePermissions();
 *
 *   // Check permission in specific context
 *   const canEdit = hasPermission('projects.edit', {
 *     organizationId: 'org-123',
 *     projectId: 'proj-456',
 *   });
 *
 *   return canEdit ? <EditButton /> : null;
 * }
 * ```
 */
export function usePermissions(): PermissionsContextValue {
  const context = useContext(PermissionsContext);

  if (!context) {
    // Fail closed - log warning in development and return safe defaults
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.warn(
        '[usePermissions] Hook used outside PermissionsProvider. ' +
        'Returning safe defaults (no permissions granted). ' +
        'Wrap your component tree with <PermissionsProvider>.'
      );
    }

    // Define fail-closed functions (defined outside return for better coverage detection)
    const failClosedHasPermission = (): boolean => false;

    const failClosedRefetch = async (): Promise<void> => {
      console.warn('[usePermissions] refetchPermissions called outside provider');
    };

    // Return fail-closed defaults
    return {
      permissions: null,
      isLoading: false,
      error: null,
      hasPermission: failClosedHasPermission,
      refetchPermissions: failClosedRefetch,
    };
  }

  return context;
}
