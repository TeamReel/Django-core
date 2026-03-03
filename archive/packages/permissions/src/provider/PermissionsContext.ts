/**
 * Permissions context for React applications.
 *
 * This module provides the React context and provider for managing hierarchical
 * permissions with automatic integration into F02 (auth) and F03 (context switcher).
 *
 * @module provider/PermissionsContext
 */

import React, { createContext } from 'react';
import type { PermissionMap, PermissionCode, CheckPermissionOptions } from '../types';

/**
 * Permissions context value interface
 */
export interface PermissionsContextValue {
  /** Current permissions map (null if not loaded) */
  permissions: PermissionMap | null;

  /** Loading state */
  isLoading: boolean;

  /** Error state (null if no error) */
  error: Error | null;

  /**
   * Check if user has a specific permission
   * @param code - Permission code to check
   * @param options - Optional context (organizationId, projectId)
   */
  hasPermission: (code: PermissionCode, options?: CheckPermissionOptions) => boolean;

  /**
   * Manually refetch permissions from the backend
   */
  refetchPermissions: () => Promise<void>;
}

/**
 * Permissions React context
 */
export const PermissionsContext = createContext<PermissionsContextValue | null>(null);

PermissionsContext.displayName = 'PermissionsContext';
