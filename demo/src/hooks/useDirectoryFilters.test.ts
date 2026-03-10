import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────
const mockSearchParams = new URLSearchParams();
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams],
}));

vi.mock('@django-core/auth-ui', () => ({
  useAuth: () => ({ user: { id: 1, role: 'user', is_superuser: false } }),
}));

vi.mock('@django-core/context-switcher', () => ({
  useContextSwitcher: () => ({
    context: { organisation: { id: 'org-1', slug: 'test-org' } },
    organisations: [{ id: 'org-1', name: 'Test Org', slug: 'test-org' }],
  }),
}));

vi.mock('./useSports', () => ({
  useSports: () => ({
    categories: [],
    variants: [],
    getVariantsForCategory: () => [],
  }),
}));

vi.mock('../utils/fetchAllPages', () => ({
  fetchAllPages: vi.fn().mockResolvedValue([]),
}));

vi.mock('../utils/apiBase', () => ({
  getApiBaseUrl: () => 'http://localhost',
}));

vi.mock('@/api', () => ({
  api: { list: vi.fn().mockResolvedValue({ results: [], count: 0 }) },
}));

import { useDirectoryFilters } from './useDirectoryFilters';

describe('useDirectoryFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initialises with default filter state', () => {
    const { result } = renderHook(() => useDirectoryFilters({}));

    expect(result.current.statusFilter).toBe('all');
    expect(result.current.sportFilter).toBe('all');
    expect(result.current.variantFilter).toBe('all');
    expect(result.current.selectedClubId).toBe('');
    expect(result.current.selectedTeamId).toBe('');
  });

  it('uses preselected org and locks it', () => {
    const { result } = renderHook(() =>
      useDirectoryFilters({ preselectedOrgId: 'org-1' }),
    );

    expect(result.current.orgLocked).toBe(true);
    expect(result.current.selectedOrgId).toBe('org-1');
  });

  it('clearAll resets filters to defaults', () => {
    const { result } = renderHook(() => useDirectoryFilters({}));

    act(() => {
      result.current.setStatusFilter('active');
      result.current.setSportFilter('football');
    });

    expect(result.current.statusFilter).toBe('active');

    act(() => result.current.clearAll());

    expect(result.current.statusFilter).toBe('all');
    expect(result.current.sportFilter).toBe('all');
  });

  it('cascading setter: changing org resets club and team', () => {
    const { result } = renderHook(() => useDirectoryFilters({}));

    // Set club and team first
    act(() => {
      result.current.setSelectedClubId('club-1');
      result.current.setSelectedTeamId('team-1');
    });

    expect(result.current.selectedClubId).toBe('club-1');
    expect(result.current.selectedTeamId).toBe('team-1');

    // Changing org should reset both
    act(() => result.current.setSelectedOrgId('org-2'));

    expect(result.current.selectedClubId).toBe('');
    expect(result.current.selectedTeamId).toBe('');
  });

  it('locked club prevents setSelectedClubId from changing', () => {
    const { result } = renderHook(() =>
      useDirectoryFilters({ preselectedClubId: 'locked-club' }),
    );

    expect(result.current.clubLocked).toBe(true);
    expect(result.current.selectedClubId).toBe('locked-club');

    act(() => result.current.setSelectedClubId('other-club'));

    // Should remain unchanged because club is locked
    expect(result.current.selectedClubId).toBe('locked-club');
  });

  it('triggerRefresh increments refreshKey', () => {
    const { result } = renderHook(() => useDirectoryFilters({}));

    const initial = result.current.refreshKey;
    act(() => result.current.triggerRefresh());
    expect(result.current.refreshKey).toBe(initial + 1);
  });
});
