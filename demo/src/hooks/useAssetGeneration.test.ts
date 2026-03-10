import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));
vi.mock('./useWorkflows', () => ({
  createWorkflowInstance: vi.fn().mockResolvedValue({}),
}));
vi.mock('./useContentTypes', () => ({
  resolveContentTypeId: vi.fn().mockResolvedValue(5),
}));

import { useAssetGeneration } from './useAssetGeneration';
import type { SubmitParams, GenerationVariant } from './assetGenerationTypes';

function baseParams(overrides: Partial<SubmitParams> = {}): SubmitParams {
  return {
    templateId: 'tpl-1',
    parameters: { title: 'Match Day' },
    variantCount: 1,
    projectId: 'proj-1',
    organisationId: 'org-1',
    ...overrides,
  };
}

describe('useAssetGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useAssetGeneration());

    expect(result.current.step).toBe('idle');
    expect(result.current.variants).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBe(0);
  });

  it('handles sync image generation (variants returned directly)', async () => {
    const variant: GenerationVariant = {
      variant_index: 0,
      image_base64: 'data:image/png;base64,abc',
      mime_type: 'image/png',
      filename: 'result.png',
    };

    mockPost.mockResolvedValue({ variants: [variant] });

    const { result } = renderHook(() => useAssetGeneration());

    await act(async () => {
      await result.current.submit(baseParams());
    });

    expect(result.current.step).toBe('completed');
    expect(result.current.variants).toHaveLength(1);
    expect(result.current.variants[0].image_base64).toBe('data:image/png;base64,abc');
    expect(result.current.progress).toBe(100);
  });

  it('sets error state on submit failure', async () => {
    mockPost.mockRejectedValue(new Error('Generation failed'));

    const { result } = renderHook(() => useAssetGeneration());

    await act(async () => {
      await result.current.submit(baseParams());
    });

    expect(result.current.step).toBe('error');
    expect(result.current.error).toBe('Generation failed');
  });

  it('reset returns to idle state after error', async () => {
    mockPost.mockRejectedValue(new Error('Oops'));

    const { result } = renderHook(() => useAssetGeneration());

    await act(async () => {
      await result.current.submit(baseParams());
    });

    expect(result.current.step).toBe('error');

    act(() => {
      result.current.reset();
    });

    expect(result.current.step).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.variants).toEqual([]);
    expect(result.current.progress).toBe(0);
  });

  it('enters queued state when requireApproval is set', async () => {
    mockPost.mockResolvedValue({ task_id: 'task-42' });

    const { result } = renderHook(() => useAssetGeneration());

    await act(async () => {
      await result.current.submit(baseParams({ requireApproval: true }));
    });

    expect(result.current.step).toBe('queued');
    expect(result.current.queuedTaskId).toBe('task-42');
    expect(result.current.progress).toBe(100);
  });

  it('acceptVariant saves selected variant via API', async () => {
    const variant: GenerationVariant = {
      variant_index: 0,
      image_base64: 'data:image/png;base64,xyz',
      mime_type: 'image/png',
      filename: 'out.png',
    };
    mockPost
      .mockResolvedValueOnce({ variants: [variant] }) // submit
      .mockResolvedValueOnce({ file_asset_id: 'fa-1', brand_asset_id: 'ba-1' }); // save

    const { result } = renderHook(() => useAssetGeneration());

    await act(async () => {
      await result.current.submit(baseParams());
    });

    expect(result.current.step).toBe('completed');

    let saveResult: unknown;
    await act(async () => {
      saveResult = await result.current.acceptVariant(0);
    });

    expect(saveResult).toEqual(
      expect.objectContaining({ file_asset_id: 'fa-1' }),
    );
    expect(mockPost).toHaveBeenCalledWith(
      '/generative/assets/save/',
      expect.objectContaining({ organisation_id: 'org-1' }),
    );
  });
});
