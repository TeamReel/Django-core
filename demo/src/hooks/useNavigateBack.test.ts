import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { useNavigateBack } from './useNavigateBack';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function wrapper(initialPath: string) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(MemoryRouter, { initialEntries: [initialPath] }, children);
}

describe('useNavigateBack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to parent path when one exists', () => {
    const { result } = renderHook(() => useNavigateBack(), {
      wrapper: wrapper('/org/club/team'),
    });

    result.current();
    expect(mockNavigate).toHaveBeenCalledWith('/org/club');
  });

  it('navigates to grandparent for deeply nested paths', () => {
    const { result } = renderHook(() => useNavigateBack(), {
      wrapper: wrapper('/org/club/team/season/match'),
    });

    result.current();
    expect(mockNavigate).toHaveBeenCalledWith('/org/club/team/season');
  });

  it('uses fallback for root-level path with no history', () => {
    const { result } = renderHook(() => useNavigateBack(), {
      wrapper: wrapper('/dashboard'),
    });

    result.current();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('uses custom fallback', () => {
    const { result } = renderHook(() => useNavigateBack('/studio'), {
      wrapper: wrapper('/dashboard'),
    });

    result.current();
    expect(mockNavigate).toHaveBeenCalledWith('/studio', { replace: true });
  });

  it('skips login/register/403/404 as parent', () => {
    const { result } = renderHook(() => useNavigateBack(), {
      wrapper: wrapper('/login/callback'),
    });

    // Parent would be /login which is in SKIP_PARENTS — should fallback
    result.current();
    // Since historyDepth is 1 (first page) and parent is skipped, falls back
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });
});
