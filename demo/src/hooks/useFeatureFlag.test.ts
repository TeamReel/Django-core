import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@django-core/auth-ui', () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

vi.mock('../utils/featureFlagsApi', () => ({
  fetchFlags: vi.fn(),
}));

vi.mock('../utils/featureFlagStorage', () => ({
  getResolvedFlag: vi.fn(),
}));

vi.mock('../utils/activeContext', () => ({
  getActiveContext: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn() },
}));

import { useFeatureFlag } from './useFeatureFlag';
import { useAuth } from '@django-core/auth-ui';
import { fetchFlags } from '../utils/featureFlagsApi';
import { getResolvedFlag } from '../utils/featureFlagStorage';
import { getActiveContext } from '../utils/activeContext';

const mockUseAuth = vi.mocked(useAuth);
const mockFetchFlags = vi.mocked(fetchFlags);
const mockGetResolvedFlag = vi.mocked(getResolvedFlag);
const mockGetActiveContext = vi.mocked(getActiveContext);

describe('useFeatureFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseAuth.mockReturnValue({ user: null } as any);
    mockFetchFlags.mockResolvedValue([]);
    mockGetResolvedFlag.mockReturnValue(true);
    mockGetActiveContext.mockResolvedValue(null);
  });

  it('returns defaultEnabled value initially', () => {
    const { result } = renderHook(() => useFeatureFlag('test_flag', false));
    expect(result.current).toBe(false);
  });

  it('returns true as default when no second arg', () => {
    const { result } = renderHook(() => useFeatureFlag('test_flag'));
    expect(result.current).toBe(true);
  });

  it('resolves flag from API when available', async () => {
    mockFetchFlags.mockResolvedValue([
      { key: 'dark_mode', enabled: false } as any,
    ]);

    const { result } = renderHook(() => useFeatureFlag('dark_mode', true));

    await waitFor(() => expect(result.current).toBe(false));
  });

  it('falls back to localStorage when API fails', async () => {
    mockFetchFlags.mockRejectedValue(new Error('API down'));
    mockGetResolvedFlag.mockReturnValue(false);

    const { result } = renderHook(() => useFeatureFlag('test_flag', true));

    await waitFor(() => expect(result.current).toBe(false));
    expect(mockGetResolvedFlag).toHaveBeenCalledWith('test_flag', null, true);
  });

  it('uses org context from localStorage', async () => {
    localStorage.setItem('django-core:currentOrgId', 'org-42');
    mockFetchFlags.mockResolvedValue([]);
    mockGetResolvedFlag.mockReturnValue(true);

    renderHook(() => useFeatureFlag('feature_x'));

    await waitFor(() => expect(mockFetchFlags).toHaveBeenCalled());
    expect(mockFetchFlags).toHaveBeenCalledWith('org-42', null);
  });

  it('re-checks on user change', async () => {
    mockFetchFlags.mockResolvedValue([]);

    const { rerender } = renderHook(() => useFeatureFlag('test_flag'));

    await waitFor(() => expect(mockFetchFlags).toHaveBeenCalled());
    const calls1 = mockFetchFlags.mock.calls.length;

    // Simulate user login
    mockUseAuth.mockReturnValue({ user: { id: 1, email: 'test@test.com' } } as any);
    rerender();

    await waitFor(() => expect(mockFetchFlags.mock.calls.length).toBeGreaterThan(calls1));
  });

  it('normalizes flag key matching (case-insensitive)', async () => {
    mockFetchFlags.mockResolvedValue([
      { key: 'DARK_THEME_OVERRIDE', enabled: true } as any,
    ]);

    const { result } = renderHook(() => useFeatureFlag('dark_theme_override', false));

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('responds to featureFlagsChanged event', async () => {
    mockFetchFlags.mockResolvedValue([]);
    mockGetResolvedFlag.mockReturnValue(true);

    renderHook(() => useFeatureFlag('test_flag'));

    await waitFor(() => expect(mockFetchFlags).toHaveBeenCalled());
    const calls1 = mockFetchFlags.mock.calls.length;

    // Dispatch custom event
    window.dispatchEvent(new Event('featureFlagsChanged'));

    await waitFor(() => expect(mockFetchFlags.mock.calls.length).toBeGreaterThan(calls1));
  });
});
