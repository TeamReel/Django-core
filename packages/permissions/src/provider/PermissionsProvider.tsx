/**
 * Permissions Provider component with hybrid caching strategy.
 *
 * This provider:
 * - Integrates with F02 (AuthProvider) for user context
 * - Integrates with F03 (ContextSwitcher) for organization/project context
 * - Fetches permissions from /api/permissions/current/
 * - Implements per-context caching with 5-minute TTL
 * - Auto-refetches on context switch to new context
 * - Reuses cache when switching back to recent context
 *
 * @module provider/PermissionsProvider
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { PermissionsContext } from './PermissionsContext';
import { checkPermission } from '../utils/checkPermission';
import type { PermissionMap, PermissionCode, CheckPermissionOptions } from '../types';

// Note: These imports will be available from workspace dependencies
// @ts-ignore - Workspace dependencies
import { useAuth } from '@django-core/auth-ui';
// @ts-ignore - Workspace dependencies
import { useContext as useMultiTenancyContext } from '@django-core/context-switcher';
// @ts-ignore - Workspace dependencies
import { fetchWithCSRF } from '@django-core/api-client';

/**
 * Cache entry with TTL
 */
interface CacheEntry {
  permissions: PermissionMap;
  timestamp: number;
}

/**
 * Cache key for permissions
 */
interface CacheKey {
  userId: string;
  organizationId?: string;
  projectId?: string;
}

/**
 * Props for PermissionsProvider
 */
export interface PermissionsProviderProps {
  children: React.ReactNode;
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL?: number;
}

// In-memory cache (per-session, client-side only)
const permissionsCache = new Map<string, CacheEntry>();

/**
 * Generate cache key from context
 */
function getCacheKey(key: CacheKey): string {
  const parts = [key.userId];
  if (key.organizationId) parts.push(key.organizationId);
  if (key.projectId) parts.push(key.projectId);
  return parts.join(':');
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid(entry: CacheEntry | undefined, ttl: number): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttl;
}

/**
 * PermissionsProvider component
 *
 * @example
 * ```tsx
 * import { AuthProvider } from '@django-core/auth';
 * import { ContextProvider } from '@django-core/context-switcher';
 * import { PermissionsProvider } from '@django-core/permissions';
 *
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <ContextProvider>
 *         <PermissionsProvider>
 *           <YourApp />
 *         </PermissionsProvider>
 *       </ContextProvider>
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export function PermissionsProvider({
  children,
  cacheTTL = 5 * 60 * 1000, // 5 minutes default
}: PermissionsProviderProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { selectedOrganization, selectedProject } = useMultiTenancyContext();

  const [permissions, setPermissions] = useState<PermissionMap | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch permissions from backend
   */
  const fetchPermissions = useCallback(async (): Promise<PermissionMap | null> => {
    if (!user?.id) {
      return null;
    }

    try {
      const response = await fetchWithCSRF('/api/v1/permissions/current/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch permissions: ${response.statusText}`);
      }

      const data: PermissionMap = await response.json();
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error fetching permissions');
    }
  }, [user?.id]);

  /**
   * Load permissions with caching
   */
  const loadPermissions = useCallback(async (forceRefetch = false) => {
    if (!user?.id) {
      setPermissions(null);
      return;
    }

    const cacheKey = getCacheKey({
      userId: user.id,
      organizationId: selectedOrganization?.id,
      projectId: selectedProject?.id,
    });

    // Check cache first (unless force refetch)
    if (!forceRefetch) {
      const cachedEntry = permissionsCache.get(cacheKey);
      if (isCacheValid(cachedEntry, cacheTTL) && cachedEntry) {
        setPermissions(cachedEntry.permissions);
        setError(null);
        return;
      }
    }

    // Fetch from backend
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchPermissions();
      if (data) {
        // Update cache
        permissionsCache.set(cacheKey, {
          permissions: data,
          timestamp: Date.now(),
        });
        setPermissions(data);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);

      // Fail closed - clear permissions on error
      setPermissions(null);

      // Log error in development
      if (process.env.NODE_ENV === 'development') {
        console.error('[PermissionsProvider] Failed to fetch permissions:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, selectedOrganization?.id, selectedProject?.id, cacheTTL, fetchPermissions]);

  /**
   * Effect: Load permissions when context changes
   */
  useEffect(() => {
    if (!authLoading && user) {
      loadPermissions();
    }
  }, [authLoading, user, selectedOrganization?.id, selectedProject?.id, loadPermissions]);

  /**
   * Manual refetch function
   */
  const refetchPermissions = useCallback(async () => {
    await loadPermissions(true);
  }, [loadPermissions]);

  /**
   * Permission check function
   */
  const hasPermission = useCallback(
    (code: PermissionCode, options?: CheckPermissionOptions): boolean => {
      // Use provided context or fall back to current context
      const effectiveOptions = {
        organizationId: options?.organizationId || selectedOrganization?.id,
        projectId: options?.projectId || selectedProject?.id,
      };

      return checkPermission(permissions, code, effectiveOptions);
    },
    [permissions, selectedOrganization?.id, selectedProject?.id]
  );

  /**
   * Context value (memoized)
   */
  const contextValue = useMemo(
    () => ({
      permissions,
      isLoading,
      error,
      hasPermission,
      refetchPermissions,
    }),
    [permissions, isLoading, error, hasPermission, refetchPermissions]
  );

  return (
    <PermissionsContext.Provider value={contextValue}>
      {children}
    </PermissionsContext.Provider>
  );
}
