import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/api', () => ({
  generativeApi: { getJobCounts: vi.fn() },
  videoApi: { getJobCounts: vi.fn() },
}));

import { generativeApi, videoApi } from '@/api';

const mockAiCounts = vi.mocked(generativeApi.getJobCounts);
const mockVideoCounts = vi.mocked(videoApi.getJobCounts);

describe('useQueueCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Mock document.hidden to false so fetchCounts runs
    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
  });

  it('returns initial empty counts', async () => {
    mockAiCounts.mockResolvedValue({ ai_review: 0, ai_active: 0, ai_approved: 0, ai_rejected: 0, ai_failed: 0, ai_total: 0 });
    mockVideoCounts.mockResolvedValue({ video_review: 0, video_active: 0, video_completed: 0, video_failed: 0, video_total: 0 });

    const { useQueueCounts } = await import('./useQueueCounts');
    const { result } = renderHook(() => useQueueCounts());

    expect(result.current.review).toBe(0);
    expect(result.current.active).toBe(0);
    expect(result.current.completed).toBe(0);
    expect(result.current.all).toBe(0);
  });

  it('fetches and aggregates AI + video counts', async () => {
    mockAiCounts.mockResolvedValue({
      ai_review: 3, ai_active: 2, ai_approved: 10, ai_rejected: 1, ai_failed: 0, ai_total: 16,
    });
    mockVideoCounts.mockResolvedValue({
      video_review: 1, video_active: 4, video_completed: 8, video_failed: 2, video_total: 15,
    });

    const { useQueueCounts } = await import('./useQueueCounts');
    const { result } = renderHook(() => useQueueCounts());

    await waitFor(() => expect(result.current.all).toBeGreaterThan(0));
    expect(result.current.review).toBe(4);   // 3 + 1
    expect(result.current.active).toBe(6);   // 2 + 4
    expect(result.current.completed).toBe(18); // 10 + 8
    expect(result.current.ai_queue).toBe(16);
    expect(result.current.video).toBe(15);
    expect(result.current.all).toBe(31);     // 16 + 15
  });

  it('handles AI-only response when video fails', async () => {
    mockAiCounts.mockResolvedValue({
      ai_review: 5, ai_active: 3, ai_approved: 7, ai_rejected: 2, ai_failed: 1, ai_total: 18,
    });
    mockVideoCounts.mockRejectedValue(new Error('Video API down'));

    const { useQueueCounts } = await import('./useQueueCounts');
    const { result } = renderHook(() => useQueueCounts());

    await waitFor(() => expect(result.current.ai_queue).toBe(18));
    expect(result.current.review).toBe(5);
    expect(result.current.active).toBe(3);
  });

  it('handles optimistic update via custom event', async () => {
    mockAiCounts.mockResolvedValue({
      ai_review: 0, ai_active: 2, ai_approved: 0, ai_rejected: 0, ai_failed: 0, ai_total: 2,
    });
    mockVideoCounts.mockResolvedValue({
      video_review: 0, video_active: 0, video_completed: 0, video_failed: 0, video_total: 0,
    });

    const { useQueueCounts } = await import('./useQueueCounts');
    const { result } = renderHook(() => useQueueCounts());

    await waitFor(() => expect(result.current.all).toBe(2));

    // Dispatch optimistic update event
    window.dispatchEvent(new Event('teamreel:queue-update'));

    await waitFor(() => expect(result.current.active).toBe(3));
    expect(result.current.all).toBe(3);
  });
});
