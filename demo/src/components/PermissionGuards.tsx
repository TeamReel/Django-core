import { Navigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { SkeletonDashboard } from './Skeleton';

interface PermissionGuardProps {
  children: React.ReactNode;
}

/**
 * Helper to determine user role status
 */
export function useUserRole() {
  const { user } = useAuth();

  const role = String((user as any)?.role || '').toLowerCase();
  const isSystemAdmin = Boolean((user as any)?.is_superuser) || role === 'superadmin';

  const orgs = (user as any)?.organisations || [];
  const isLandAdmin = orgs.some((org: any) => {
    const role = String(org?.role || '').toLowerCase().replace(/[_-]/g, ' ').trim();
    return role.includes('land admin');
  });
  const isOrgAdmin = orgs.some((org: any) =>
    org.role?.toLowerCase().includes('admin')
  );

  const isCoach = orgs.some((org: any) =>
    org.role?.toLowerCase().includes('coach')
  );

  const isPlayer = role === 'player';

  return {
    isSystemAdmin,
    isLandAdmin,
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
  const { isSystemAdmin, isLandAdmin } = useUserRole();

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isSystemAdmin && !isLandAdmin) {
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
    return <SkeletonDashboard />;
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
    return <SkeletonDashboard />;
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
    return <SkeletonDashboard />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
