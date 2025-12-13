/**
 * Unit tests for useHealthStatus hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { HealthStatusResponse } from '../../kitty-specs/027-resource-display-alerts/contracts/B18-health-status';

// Mock @django-core/api-client with hoisted mock
const mockGet = vi.hoisted(() => vi.fn());
vi.mock('@django-core/api-client', () => ({
  createApiClient: vi.fn(() => ({
    get: mockGet,
  })),
}));

// Import after mock setup
import { useHealthStatus } from '../../src/hooks/useHealthStatus';

describe('useHealthStatus', () => {
  const mockEndpoint = '/api/health/status';
  const mockData: HealthStatusResponse = {
    services: [
      {
        name: 'Database',
        status: 'healthy',
        lastChecked: '2025-12-04T10:00:00Z',
      },
      {
        name: 'Redis',
        status: 'healthy',
        lastChecked: '2025-12-04T10:00:00Z',
      },
    ],
    overallStatus: 'healthy',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial fetch', () => {
    it('fetches data on mount', async () => {
      mockGet.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() =>
        useHealthStatus({ endpoint: mockEndpoint })
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
        useHealthStatus({ endpoint: mockEndpoint, enabled: false })
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
        useHealthStatus({
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
        useHealthStatus({
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
        useHealthStatus({
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
        useHealthStatus({
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
      const errorMessage = 'Health check service unavailable';
      mockGet.mockResolvedValueOnce({
        error: { code: 503, message: errorMessage, details: {} },
      });

      const { result } = renderHook(() =>
        useHealthStatus({ endpoint: mockEndpoint })
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
        useHealthStatus({ endpoint: mockEndpoint })
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
        useHealthStatus({ endpoint: mockEndpoint })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to fetch health status');
    });

    it('clears error on successful refetch', async () => {
      mockGet
        .mockResolvedValueOnce({
          error: { code: 500, message: 'Server error', details: {} },
        })
        .mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() =>
        useHealthStatus({ endpoint: mockEndpoint, pollInterval: 0 })
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
        useHealthStatus({ endpoint: mockEndpoint, pollInterval: 0 })
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
        useHealthStatus({ endpoint: mockEndpoint, pollInterval: 0 })
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

      renderHook(() => useHealthStatus({ endpoint: mockEndpoint }));

      await vi.advanceTimersByTimeAsync(0);
      expect(mockGet).toHaveBeenCalledTimes(1);

      // Advance by default interval
      await vi.advanceTimersByTimeAsync(30000);
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('defaults enabled to true', async () => {
      mockGet.mockResolvedValueOnce({ data: mockData });

      renderHook(() => useHealthStatus({ endpoint: mockEndpoint }));

      await vi.advanceTimersByTimeAsync(0);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });
  });

  describe('multiple services', () => {
    it('handles multiple service statuses', async () => {
      const multiServiceData: HealthStatusResponse = {
        services: [
          {
            name: 'Database',
            status: 'healthy',
            lastChecked: '2025-12-04T10:00:00Z',
          },
          {
            name: 'Redis',
            status: 'degraded',
            lastChecked: '2025-12-04T10:00:00Z',
            message: 'High latency detected',
          },
          {
            name: 'API Gateway',
            status: 'unhealthy',
            lastChecked: '2025-12-04T10:00:00Z',
            message: 'Connection timeout',
          },
        ],
        overallStatus: 'degraded',
      };

      mockGet.mockResolvedValueOnce({ data: multiServiceData });

      const { result } = renderHook(() =>
        useHealthStatus({ endpoint: mockEndpoint })
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(multiServiceData);
      });

      expect(result.current.data?.services).toHaveLength(3);
      expect(result.current.data?.overallStatus).toBe('degraded');
    });
  });
});
