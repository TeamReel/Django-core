import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/api', () => ({
  api: { get: vi.fn(), list: vi.fn() },
  contentApi: {},
  generativeApi: {},
}));

import { useGenerationHistory, getTemplateCategoryLabel } from './useGenerationHistory';
import { api } from '@/api';

const mockGet = vi.mocked(api.get);
const mockList = vi.mocked(api.list);

describe('useGenerationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue([]);
    mockList.mockResolvedValue({ results: [] });
  });

  it('starts with empty state', () => {
    const { result } = renderHook(() => useGenerationHistory());
    expect(result.current.assetTemplates).toEqual([]);
    expect(result.current.contentTemplates).toEqual([]);
    expect(result.current.history).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetchTemplates loads asset and content templates', async () => {
    mockGet.mockResolvedValue({
      templates: [
        { id: 'at-1', name: 'Logo Template', template_type: 'asset' },
      ],
    });
    mockList.mockResolvedValue({
      results: [
        { id: 1, name: 'Pre-Match', template_type: 'pre_match', ai_workflow_id: 'wf-1', credits_required: 2, is_active: true },
      ],
    });

    const { result } = renderHook(() => useGenerationHistory());

    await act(async () => {
      await result.current.fetchTemplates('org-1');
    });

    expect(result.current.assetTemplates).toHaveLength(1);
    expect(result.current.assetTemplates[0].name).toBe('Logo Template');
    expect(result.current.contentTemplates).toHaveLength(1);
    expect(result.current.contentTemplates[0].name).toBe('Pre-Match');
  });

  it('fetchHistory loads generation history', async () => {
    mockGet.mockResolvedValue({
      history: [
        { id: 'h-1', template_name: 'Logo', status: 'completed' },
        { id: 'h-2', template_name: 'Banner', status: 'pending' },
      ],
    });

    const { result } = renderHook(() => useGenerationHistory());

    await act(async () => {
      await result.current.fetchHistory();
    });

    expect(result.current.history).toHaveLength(2);
    expect(result.current.history[0].id).toBe('h-1');
  });

  it('handles fetchTemplates individual errors gracefully', async () => {
    // Individual fetch errors are caught internally via .catch(() => null)
    mockGet.mockRejectedValue(new Error('Template fetch failed'));
    mockList.mockRejectedValue(new Error('Content fetch failed'));

    const { result } = renderHook(() => useGenerationHistory());

    await act(async () => {
      await result.current.fetchTemplates();
    });

    // Individual errors swallowed — templates stay empty, no error thrown
    expect(result.current.assetTemplates).toEqual([]);
    expect(result.current.contentTemplates).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('handles fetchHistory error', async () => {
    mockGet.mockRejectedValue(new Error('History error'));

    const { result } = renderHook(() => useGenerationHistory());

    await act(async () => {
      await result.current.fetchHistory();
    });

    expect(result.current.error).toBe('History error');
  });

  it('normalises array-shaped API responses', async () => {
    // API returns results directly as array (not wrapped)
    mockGet.mockResolvedValue([
      { id: 'at-1', name: 'Direct Array Template' },
    ]);
    mockList.mockResolvedValue({ results: [] });

    const { result } = renderHook(() => useGenerationHistory());

    await act(async () => {
      await result.current.fetchTemplates();
    });

    expect(result.current.assetTemplates).toHaveLength(1);
    expect(result.current.assetTemplates[0].name).toBe('Direct Array Template');
  });
});

describe('getTemplateCategoryLabel', () => {
  it('returns correct labels for known categories', () => {
    expect(getTemplateCategoryLabel('all')).toBe('All Templates');
    expect(getTemplateCategoryLabel('pre_match')).toBe('Pre-Match');
    expect(getTemplateCategoryLabel('post_match')).toBe('Post-Match');
    expect(getTemplateCategoryLabel('season')).toBe('Season');
    expect(getTemplateCategoryLabel('custom')).toBe('Custom');
  });

  it('returns raw key for unknown category', () => {
    expect(getTemplateCategoryLabel('unknown' as any)).toBe('unknown');
  });
});
