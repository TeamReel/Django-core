/**
 * Unit tests for useResourceUsage hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { CreditUsageResponse } from '../../kitty-specs/027-resource-display-alerts/contracts/B11-billing-credits';

// Mock @django-core/api-client with hoisted mock
const mockGet = vi.hoisted(() => vi.fn());
vi.mock('@django-core/api-client', () => ({
  createApiClient: vi.fn(() => ({
    get: mockGet,
  })),
}));

// Import after mock setup
import { useResourceUsage } from '../../src/hooks/useResourceUsage';

describe('useResourceUsage', () => {
  const mockEndpoint = '/api/billing/usage';
  const mockData: CreditUsageResponse = {
    credits: {
      used: 850,
      limit: 1000,
      remaining: 150,
      resetAt: '2025-12-31T23:59:59Z',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial fetch', () => {
    it('fetches data on mount', async () => {
      mockGet.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() =>
        useResourceUsage({ endpoint: mockEndpoint })
      );

      // Should start loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have data
      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
      expect(mockGet).toHaveBeenCalledWith(mockEndpoint);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('does not fetch when enabled=false', async () => {
      mockGet.mockResolvedValueOnce({ data: mockData });

      renderHook(() =>
        useResourceUsage({ endpoint: mockEndpoint, enabled: false })
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe('polling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('polls at specified interval', async () => {
      mockGet.mockResolvedValue({ data: mockData });

      renderHook(() =>
        useResourceUsage({
          endpoint: mockEndpoint,
          pollInterval: 100,
        })
      );

      // Initial fetch - flushPromises by advancing timers
      await vi.advanceTimersByTimeAsync(0);
      expect(mockGet).toHaveBeenCalledTimes(1);

      // Advance by pollInterval
      await vi.advanceTimersByTimeAsync(100);
      expect(mockGet).toHaveBeenCalledTimes(2);

      // Advance again
      await vi.advanceTimersByTimeAsync(100);
      expect(mockGet).toHaveBeenCalledTimes(3);
    });

    it('does not poll when pollInterval <= 0', async () => {
      mockGet.mockResolvedValueOnce({ data: mockData });

      renderHook(() =>
        useResourceUsage({
          endpoint: mockEndpoint,
          pollInterval: 0,
        })
      );

      // Initial fetch
      await vi.advanceTimersByTimeAsync(0);
      expect(mockGet).toHaveBeenCalledTimes(1);

      // Advance time - should not poll
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('does not poll when enabled=false', async () => {
      mockGet.mockResolvedValueOnce({ data: mockData });

      renderHook(() =>
        useResourceUsage({
          endpoint: mockEndpoint,
          pollInterval: 100,
          enabled: false,
        })
      );

      await vi.advanceTimersByTimeAsync(300);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('cleans up interval on unmount', async () => {
      mockGet.mockResolvedValue({ data: mockData });

      const { unmount } = renderHook(() =>
        useResourceUsage({
          endpoint: mockEndpoint,
          pollInterval: 100,
        })
      );

      await vi.advanceTimersByTimeAsync(0);
      expect(mockGet).toHaveBeenCalledTimes(1);

      unmount();

      // Advance time - should not poll after unmount
      await vi.advanceTimersByTimeAsync(500);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('handles API errors correctly', async () => {
      const errorMessage = 'Insufficient credits';
      mockGet.mockResolvedValueOnce({
        error: { code: 402, message: errorMessage, details: {} },
      });

      const { result } = renderHook(() =>
        useResourceUsage({ endpoint: mockEndpoint })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe(errorMessage);
      expect(result.current.data).toBeNull();
    });

    it('handles network errors correctly', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useResourceUsage({ endpoint: mockEndpoint })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network error');
      expect(result.current.data).toBeNull();
    });

    it('converts non-Error exceptions to Error objects', async () => {
      mockGet.mockRejectedValueOnce('string error');

      const { result } = renderHook(() =>
        useResourceUsage({ endpoint: mockEndpoint })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to fetch resource usage');
    });

    it('clears error on successful refetch', async () => {
      mockGet
        .mockResolvedValueOnce({
          error: { code: 500, message: 'Server error', details: {} },
        })
        .mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() =>
        useResourceUsage({ endpoint: mockEndpoint, pollInterval: 0 })
      );

      // Wait for error
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Refetch
      result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.data).toEqual(mockData);
      });
    });
  });

  describe('refetch', () => {
    it('manually refetches data', async () => {
      mockGet.mockResolvedValue({ data: mockData });

      const { result } = renderHook(() =>
        useResourceUsage({ endpoint: mockEndpoint, pollInterval: 0 })
      );

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledTimes(1);
      });

      // Manual refetch
      result.current.refetch();

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledTimes(2);
      });
    });

    it('refetch updates loading state', async () => {
      mockGet.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: mockData }), 100)
          )
      );

      const { result } = renderHook(() =>
        useResourceUsage({ endpoint: mockEndpoint, pollInterval: 0 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger refetch and wait for state update
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('default values', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('uses default pollInterval of 30000ms', async () => {
      mockGet.mockResolvedValue({ data: mockData });

      renderHook(() => useResourceUsage({ endpoint: mockEndpoint }));

      await vi.advanceTimersByTimeAsync(0);
      expect(mockGet).toHaveBeenCalledTimes(1);

      // Advance by default interval
      await vi.advanceTimersByTimeAsync(30000);
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('defaults enabled to true', async () => {
      mockGet.mockResolvedValueOnce({ data: mockData });

      renderHook(() => useResourceUsage({ endpoint: mockEndpoint }));

      await vi.advanceTimersByTimeAsync(0);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });
  });
});
