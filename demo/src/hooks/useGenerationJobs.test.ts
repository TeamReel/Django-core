import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockGet = vi.fn();
vi.mock('@/api', () => ({
  api: { get: (...args: any[]) => mockGet(...args) },
}));

import { useGenerationJobs } from './useGenerationJobs';
import type { GenerationJob } from './useGenerationJobs';

function buildJob(overrides: Partial<GenerationJob> = {}): GenerationJob {
  return {
    task_id: 'task-1', template_id: 'tpl-1', label: 'Test Job',
    output_type: 'image', output_asset_type: 'social_post',
    project_id: null, membership_id: null,
    status: 'completed', progress: 100, message: '', error_message: '',
    approval_status: null, output_url: '', output_variants: [],
    created_at: '2025-06-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z',
    completed_at: '2025-06-01T00:01:00Z',
    provider: null, model: null, duration_seconds: null,
    content_duration_seconds: null, estimated_cost_eur: null,
    estimated_input_tokens: null, estimated_output_tokens: null,
    variant_count: null, project_name: null, club_name: null, membership_name: null,
    ...overrides,
  };
}

describe('useGenerationJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
  });

  it('fetches jobs on mount and exposes them', async () => {
    const jobs = [buildJob({ task_id: 'j1', status: 'completed' })];
    mockGet.mockResolvedValue({ results: jobs });

    const { result } = renderHook(() => useGenerationJobs({ pollInterval: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.jobs).toEqual(jobs);
    expect(result.current.error).toBeNull();
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/generative/jobs/'));
  });

  it('computes activeJobs and activeCount from status', async () => {
    const jobs = [
      buildJob({ task_id: 'j1', status: 'queued' }),
      buildJob({ task_id: 'j2', status: 'processing' }),
      buildJob({ task_id: 'j3', status: 'completed' }),
    ];
    mockGet.mockResolvedValue({ results: jobs });

    const { result } = renderHook(() => useGenerationJobs({ pollInterval: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeCount).toBe(2);
    expect(result.current.activeJobs.map((j) => j.task_id)).toEqual(['j1', 'j2']);
  });

  it('passes filter params to the API call', async () => {
    mockGet.mockResolvedValue({ results: [] });

    renderHook(() =>
      useGenerationJobs({ status: 'processing', project_id: 'p-1', pollInterval: 0 }),
    );

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    const url: string = mockGet.mock.calls[0][0];
    expect(url).toContain('status=processing');
    expect(url).toContain('project_id=p-1');
  });

  it('sets error on fetch failure', async () => {
    mockGet.mockRejectedValue(new Error('Server down'));

    const { result } = renderHook(() => useGenerationJobs({ pollInterval: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Server down');
  });

  it('refresh can be called manually', async () => {
    mockGet.mockResolvedValue({ results: [] });

    const { result } = renderHook(() => useGenerationJobs({ pollInterval: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGet.mockResolvedValue({ results: [buildJob({ task_id: 'j1' })] });
    await result.current.refresh();

    await waitFor(() => expect(result.current.jobs).toHaveLength(1));
  });
});
