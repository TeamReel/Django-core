import { Navigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import LoadingState from './LoadingState';

interface PermissionGuardProps {
  children: React.ReactNode;
}

/**
 * Helper to determine user role status
 */
export function useUserRole() {
  const { user } = useAuth();

  const isSystemAdmin = (user as any)?.role === 'superadmin' || (user as any)?.role === 'admin';

  const orgs = (user as any)?.organisations || [];
  const isOrgAdmin = orgs.some((org: any) =>
    org.role?.toLowerCase().includes('admin')
  );

  const isCoach = orgs.some((org: any) =>
    org.role?.toLowerCase().includes('coach')
  );

  const isPlayer = (user as any)?.role === 'player';

  return {
    isSystemAdmin,
    isOrgAdmin,
    isCoach,
    isPlayer,
    hasOrgRole: isOrgAdmin || isCoach,
  };
}

/**
 * AdminOnlyRoute - System Admin only
 * Use for: /flags, /integration-status, /routing-logs, /health, /constitution, /observability, /api-docs, /demo/websockets
 */
export function AdminOnlyRoute({ children }: PermissionGuardProps) {
  const { user, isLoading } = useAuth();
  const { isSystemAdmin } = useUserRole();

  if (isLoading) {
    return <LoadingState message="Checking permissions..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isSystemAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/**
 * OrgAdminRoute - System Admin or Org Admin
 * Use for: /credits, /audit (org-scoped data)
 */
export function OrgAdminRoute({ children }: PermissionGuardProps) {
  const { user, isLoading } = useAuth();
  const { isSystemAdmin, isOrgAdmin } = useUserRole();

  if (isLoading) {
    return <LoadingState message="Checking permissions..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isSystemAdmin && !isOrgAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/**
 * SecurityRoute - System Admin or Org Admin/Coach (for security page visibility)
 */
export function SecurityRoute({ children }: PermissionGuardProps) {
  const { user, isLoading } = useAuth();
  const { isSystemAdmin, hasOrgRole } = useUserRole();

  if (isLoading) {
    return <LoadingState message="Checking permissions..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isSystemAdmin && !hasOrgRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/**
 * ProtectedRoute - Any authenticated user
 * Use for: user-facing pages (profile, dashboard, preferences, notification-preferences)
 */
export function ProtectedRoute({ children }: PermissionGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState message="Checking authentication..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
