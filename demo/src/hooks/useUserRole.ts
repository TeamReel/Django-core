import { useAuth } from '@django-core/auth-ui';

export interface UseUserRoleReturn {
  isSystemAdmin: boolean;
}

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth();
  const isSystemAdmin = user?.is_superuser || user?.role === 'superadmin';
  return { isSystemAdmin };
}
