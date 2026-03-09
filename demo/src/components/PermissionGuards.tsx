import { Navigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { SkeletonDashboard } from './Skeleton';

interface PermissionGuardProps {
  children: React.ReactNode;
}

/**
 * Helper to determine user role status.
 *
 * RBAC tiers (from teamreel-rbac-config.md):
 *   Super Admin  → isSystemAdmin (full platform access)
 *   Land Admin   → isLandAdmin   (federation scope)
 *   Club Admin   → isClubAdmin   (club + all child teams)
 *   Team Admin   → isTeamAdmin   (single team scope)
 *   Team Member  → isPlayer      (view + own content only)
 *   Supporter    → isSupporter   (read-only viewer)
 *
 * Convenience flags:
 *   isAdmin  = Team Admin or higher (sees admin tabs)
 *   isMember = Team Member (sees core tabs, no admin tabs)
 */
export function useUserRole() {
  const { user } = useAuth();

  const role = String(user?.role || '').toLowerCase();
  const isSystemAdmin = Boolean(user?.is_superuser) || role === 'superadmin';

  const orgs = user?.organisations || [];
  const isLandAdmin = orgs.some((org: Record<string, unknown>) => {
    const role = String(org?.role || '').toLowerCase().replace(/[_-]/g, ' ').trim();
    return role.includes('land admin');
  });
  const isOrgAdmin = orgs.some((org: Record<string, unknown>) =>
    String(org?.role || '').toLowerCase().includes('admin')
  );
  const isClubAdmin = isOrgAdmin; // Club-level admin in any org

  const isCoach = orgs.some((org: Record<string, unknown>) =>
    String(org?.role || '').toLowerCase().includes('coach')
  );

  const isPlayer = role === 'player';
  const isSupporter = role === 'supporter' || role === 'viewer';

  // Team Admin+ = anyone who is an admin, coach, or higher
  const isTeamAdmin = isCoach || isOrgAdmin || isLandAdmin || isSystemAdmin;
  // Convenience: "can see admin tabs" = Team Admin or higher
  const isAdmin = isTeamAdmin;

  return {
    isSystemAdmin,
    isLandAdmin,
    isClubAdmin,
    isOrgAdmin,
    isTeamAdmin,
    isCoach,
    isPlayer,
    isSupporter,
    isAdmin,
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
