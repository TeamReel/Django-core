import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@django-core/context-switcher', () => ({
  useContextSwitcher: () => ({
    context: { organisation: { id: 42, name: 'FC Example' } },
    setContext: vi.fn(),
  }),
}));

vi.mock('./useLocalStorage', () => ({
  useLocalStorage: vi.fn(() => [null, vi.fn()]),
}));

import { usePersistedContext } from './usePersistedContext';
import { useLocalStorage } from './useLocalStorage';

const mockUseLocalStorage = vi.mocked(useLocalStorage);

describe('usePersistedContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocalStorage.mockReturnValue([null, vi.fn()]);
  });

  it('returns base context values', () => {
    const { result } = renderHook(() => usePersistedContext());
    expect(result.current.context.organisation?.id).toBe(42);
    expect(result.current.context.organisation?.name).toBe('FC Example');
  });

  it('derives selectedOrgId from base context', () => {
    const { result } = renderHook(() => usePersistedContext());
    expect(result.current.selectedOrgId).toBe('42');
  });

  it('prefers base context org over persisted org', () => {
    mockUseLocalStorage.mockReturnValue(['persisted-org-99', vi.fn()]);

    const { result } = renderHook(() => usePersistedContext());
    // Base context org (42) takes priority over persisted value
    expect(result.current.selectedOrgId).toBe('42');
  });

  it('calls localStorage setter when setSelectedOrgId is invoked', () => {
    const setter = vi.fn();
    mockUseLocalStorage.mockReturnValue([null, setter]);

    const { result } = renderHook(() => usePersistedContext());
    act(() => result.current.setSelectedOrgId('org-123'));
    expect(setter).toHaveBeenCalledWith('org-123');
  });
});
