import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@/api', () => ({
  videoApi: {
    getJob: vi.fn(),
    approveJob: vi.fn(),
    rejectJob: vi.fn(),
  },
}));
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));

import { useVideoJobPolling } from '@/pages/identity/ContentGenerationModal/useVideoJobPolling';

describe('useVideoJobPolling', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts with all nulls', () => {
    const { result } = renderHook(() => useVideoJobPolling({ isOpen: false, step: 'idle' }));
    expect(result.current.videoJobId).toBeNull();
    expect(result.current.videoJobStatus).toBeNull();
    expect(result.current.videoJobError).toBeNull();
    expect(result.current.videoOutputUrl).toBeNull();
    expect(result.current.videoApprovalStatus).toBe('idle');
  });

  it('resetVideo clears all state', () => {
    const { result } = renderHook(() => useVideoJobPolling({ isOpen: true, step: 'idle' }));
    act(() => result.current.setVideoJobId('job-1'));
    expect(result.current.videoJobId).toBe('job-1');
    act(() => result.current.resetVideo());
    expect(result.current.videoJobId).toBeNull();
    expect(result.current.videoJobStatus).toBeNull();
    expect(result.current.videoApprovalStatus).toBe('idle');
  });

  it('handleVideoApproval approve calls videoApi.approveJob', async () => {
    const { videoApi } = await import('@/api');
    vi.mocked(videoApi.approveJob).mockResolvedValue(undefined as any);
    const onGenerated = vi.fn();
    const { result } = renderHook(() => useVideoJobPolling({ isOpen: true, step: 'idle', onGenerated }));
    act(() => result.current.setVideoJobId('job-42'));
    await act(async () => { await result.current.handleVideoApproval('approve'); });
    expect(videoApi.approveJob).toHaveBeenCalledWith('job-42');
    expect(result.current.videoApprovalStatus).toBe('approved');
    expect(onGenerated).toHaveBeenCalledWith('Video goedgekeurd en opgeslagen.');
  });

  it('handleVideoApproval reject calls videoApi.rejectJob', async () => {
    const { videoApi } = await import('@/api');
    vi.mocked(videoApi.rejectJob).mockResolvedValue(undefined as any);
    const { result } = renderHook(() => useVideoJobPolling({ isOpen: true, step: 'idle' }));
    act(() => result.current.setVideoJobId('job-42'));
    await act(async () => { await result.current.handleVideoApproval('reject'); });
    expect(videoApi.rejectJob).toHaveBeenCalledWith('job-42');
    expect(result.current.videoApprovalStatus).toBe('rejected');
  });

  it('handleVideoApproval sets error on failure', async () => {
    const { videoApi } = await import('@/api');
    vi.mocked(videoApi.approveJob).mockRejectedValue(new Error('Server error'));
    const { result } = renderHook(() => useVideoJobPolling({ isOpen: true, step: 'idle' }));
    act(() => result.current.setVideoJobId('job-42'));
    await act(async () => { await result.current.handleVideoApproval('approve'); });
    expect(result.current.videoApprovalError).toBe('Server error');
    expect(result.current.videoApprovalStatus).toBe('idle');
  });

  it('does not call API if videoJobId is null', async () => {
    const { videoApi } = await import('@/api');
    const { result } = renderHook(() => useVideoJobPolling({ isOpen: true, step: 'idle' }));
    await act(async () => { await result.current.handleVideoApproval('approve'); });
    expect(videoApi.approveJob).not.toHaveBeenCalled();
  });
});
