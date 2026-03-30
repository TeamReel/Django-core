import { useAuth } from '@django-core/auth-ui';

export function useUserRole() {
  const { user } = useAuth();
  const isSystemAdmin = (user as any)?.is_superuser || (user as any)?.role === 'superadmin';
  return { isSystemAdmin };
}
