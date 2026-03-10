import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useVideoJobs } from './useVideoJobs';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();
const mockPatch = vi.fn();

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

const sampleJob = {
  id: 'job-1',
  project: 10,
  job_type: 'transcode',
  status: 'completed',
  progress_percent: 100,
  config: {},
  metadata: {},
  retry_count: 0,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('useVideoJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches jobs on mount', async () => {
    mockGet.mockResolvedValueOnce({ results: [sampleJob], count: 1 });

    const { result } = renderHook(() =>
      useVideoJobs({ projectId: '10', autoRefresh: false }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.jobs).toEqual([sampleJob]);
    expect(result.current.error).toBeNull();
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/video/jobs/'),
    );
  });

  it('passes status filter to API', async () => {
    mockGet.mockResolvedValueOnce({ results: [] });

    renderHook(() =>
      useVideoJobs({ projectId: '10', status: 'failed', autoRefresh: false }),
    );

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('status=failed'),
      ),
    );
  });

  it('creates a job via POST', async () => {
    mockGet.mockResolvedValue({ results: [] });
    mockPost.mockResolvedValueOnce({ id: 'new-job', status: 'queued' });

    const { result } = renderHook(() =>
      useVideoJobs({ projectId: '10', autoRefresh: false }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: unknown;
    await act(async () => {
      created = await result.current.createJob({
        job_type: 'transcode',
        config: { resolution: '1080p' },
      });
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/video/jobs/',
      { job_type: 'transcode', config: { resolution: '1080p' } },
    );
    expect(created).toEqual({ id: 'new-job', status: 'queued' });
  });

  it('cancels a job via DELETE', async () => {
    mockGet.mockResolvedValue({ results: [sampleJob] });
    mockDelete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      useVideoJobs({ projectId: '10', autoRefresh: false }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.cancelJob('job-1');
    });

    expect(mockDelete).toHaveBeenCalledWith('/video/jobs/job-1/');
  });

  it('sets error on fetch failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('Server down'));

    const { result } = renderHook(() =>
      useVideoJobs({ projectId: '10', autoRefresh: false }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Server down');
    expect(result.current.jobs).toEqual([]);
  });

  it('treats 403 as empty list without error', async () => {
    const err403 = Object.assign(new Error('Forbidden'), { status: 403 });
    mockGet.mockRejectedValueOnce(err403);

    const { result } = renderHook(() =>
      useVideoJobs({ projectId: '99', autoRefresh: false }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.jobs).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
