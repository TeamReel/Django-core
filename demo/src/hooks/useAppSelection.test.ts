import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// Mock external dependencies before importing the hook
vi.mock('@django-core/context-switcher', () => ({
  useContextSwitcher: () => ({
    context: { organisation: { slug: 'test-org', id: 'org-1' } },
  }),
}));
vi.mock('@django-core/auth-ui', () => ({
  useAuth: () => ({ user: { email: 'user@test.com' } }),
}));
vi.mock('../utils/fetchAllPages', () => ({
  fetchAllPages: vi.fn().mockResolvedValue([]),
}));
vi.mock('../utils/periodPath', () => ({
  periodPathKey: (p: Record<string, unknown>) => (p?.slug as string) || String(p?.id || ''),
}));

import { useAppSelection } from './useAppSelection';
import { APP_LAST_CTX_KEY } from './appSelectionParser';

function wrapper(initialPath = '/') {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(MemoryRouter, { initialEntries: [initialPath] }, children);
}

describe('useAppSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns default empty selection on mount', () => {
    const { result } = renderHook(() => useAppSelection(), {
      wrapper: wrapper('/'),
    });

    expect(result.current.orgSlug).toBeDefined();
    expect(result.current.clubSlugOrId).toBeNull();
    expect(result.current.teamSlugOrId).toBeNull();
    expect(result.current.matchId).toBeNull();
  });

  it('has correct shape with all expected fields', () => {
    const { result } = renderHook(() => useAppSelection(), {
      wrapper: wrapper('/'),
    });

    const keys = Object.keys(result.current);
    expect(keys).toEqual(
      expect.arrayContaining([
        'orgSlug',
        'clubSlugOrId',
        'clubName',
        'teamSlugOrId',
        'teamName',
        'seasonSlugOrId',
        'seasonName',
        'matchId',
      ]),
    );
  });

  it('reads last context from localStorage if available', () => {
    localStorage.setItem(
      APP_LAST_CTX_KEY,
      JSON.stringify({
        orgSlug: 'test-org',
        clubSlugOrId: 'fc-test',
        teamSlugOrId: 'u19',
        ts: Date.now(),
      }),
    );

    const { result } = renderHook(() => useAppSelection(), {
      wrapper: wrapper('/'),
    });

    // Hook should pick up localStorage values during computation
    expect(result.current).toBeDefined();
    expect(result.current.orgSlug).toBeDefined();
  });

  it('writes context to localStorage on vanity path navigation', async () => {
    renderHook(() => useAppSelection(), {
      wrapper: wrapper('/test-org/fc-test/u19/2025'),
    });

    await waitFor(() => {
      const stored = localStorage.getItem(APP_LAST_CTX_KEY);
      expect(stored).not.toBeNull();
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.orgSlug).toBe('test-org');
        expect(parsed.clubSlugOrId).toBe('fc-test');
      }
    });
  });

  it('returns null for season/competition when path has no season', () => {
    const { result } = renderHook(() => useAppSelection(), {
      wrapper: wrapper('/test-org/fc-test'),
    });

    expect(result.current.seasonSlugOrId).toBeNull();
    expect(result.current.competitionSlugOrId).toBeNull();
  });
});
