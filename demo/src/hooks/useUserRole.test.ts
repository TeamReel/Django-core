import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@django-core/auth-ui', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@django-core/auth-ui';
import { useUserRole } from './useUserRole';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe('useUserRole', () => {
  it('returns isSystemAdmin=true for superuser', () => {
    mockUseAuth.mockReturnValue({ user: { is_superuser: true, role: 'user' } });
    const { result } = renderHook(() => useUserRole());
    expect(result.current.isSystemAdmin).toBe(true);
  });

  it('returns isSystemAdmin=true for superadmin role', () => {
    mockUseAuth.mockReturnValue({ user: { is_superuser: false, role: 'superadmin' } });
    const { result } = renderHook(() => useUserRole());
    expect(result.current.isSystemAdmin).toBe(true);
  });

  it('returns isSystemAdmin=false for regular user', () => {
    mockUseAuth.mockReturnValue({ user: { is_superuser: false, role: 'user' } });
    const { result } = renderHook(() => useUserRole());
    expect(result.current.isSystemAdmin).toBe(false);
  });

  it('returns isSystemAdmin=false when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useUserRole());
    expect(result.current.isSystemAdmin).toBe(false);
  });
});
