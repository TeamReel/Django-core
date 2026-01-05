/**
 * @django-core/permissions
 *
 * Frontend permissions package for django-core platform.
 *
 * This package provides:
 * - React context provider for permissions management
 * - Hooks for checking permissions
 * - Components for declarative permission checks
 * - Utilities for hierarchical permission resolution
 *
 * @module @django-core/permissions
 */

// Types
export type {
  PermissionCode,
  PermissionScope,
  ProjectPermissions,
  OrganizationPermissions,
  PermissionMap,
  CheckPermissionOptions,
  PermissionCheckResult,
} from './types';

// Utilities
export {
  checkPermission,
  checkAllPermissions,
  checkAnyPermission,
} from './utils/checkPermission';

// Provider and Context
export type { PermissionsContextValue } from './provider/PermissionsContext';
export { PermissionsContext } from './provider/PermissionsContext';
export type { PermissionsProviderProps } from './provider/PermissionsProvider';
export { PermissionsProvider } from './provider/PermissionsProvider';

// Hooks
export { usePermissions } from './hooks/usePermissions';

// Components
export type { PermissionGateProps } from './components/PermissionGate';
export { PermissionGate } from './components/PermissionGate';
export { PermissionMatrix } from './components/PermissionMatrix';
export type { PermissionMatrixProps } from './components/PermissionMatrix';
export { ActivityFeed } from './components/ActivityFeed';
export type { ActivityEvent, ActivityEventType } from './components/ActivityFeed';
export { ResendInviteButton } from './components/ResendInviteButton';
