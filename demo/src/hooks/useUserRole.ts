import { useAuth } from '@django-core/auth-ui';

export function useUserRole() {
  const { user } = useAuth();
  const isSystemAdmin = user?.is_superuser || user?.role === 'superadmin';
  return { isSystemAdmin };
}
