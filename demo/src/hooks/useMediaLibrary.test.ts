import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useMediaLibrary } from './useMediaLibrary';

// Mock dependencies
vi.mock('../utils/apiBase', () => ({
  getApiBaseUrl: () => 'http://test-api.com'
}));

describe('useMediaLibrary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it('should fetch items successfully', async () => {
        const mockData = {
            results: [
                { id: '1', title: 'Test Item', tags: [] }
            ],
            next: null,
            previous: null
        };

        // Delay the response slightly to verify loading state
        (global.fetch as any).mockImplementationOnce(() =>
            new Promise(resolve => setTimeout(() => resolve({
                ok: true,
                json: async () => mockData
            }), 10))
        );

        const { result } = renderHook(() => useMediaLibrary());

        // Initial state
        expect(result.current.loading).toBe(false);
        expect(result.current.items).toEqual([]);

        // Trigger fetch
        await act(async () => {
            result.current.fetchItems();
        });

        // Loading checks inside `act` or immediately after can be tricky with async hooks
        // We mainly care about the final result
        expect(result.current.loading).toBe(true);

        await waitFor(() => {
             expect(result.current.loading).toBe(false);
        });

        expect(result.current.items).toEqual(mockData.results);
        expect(result.current.error).toBeNull();
    });

    it('should handle errors', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            statusText: 'Server Error'
        });

        const { result } = renderHook(() => useMediaLibrary());

        await act(async () => {
            result.current.fetchItems();
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('Error fetching media items: Server Error');
    });
});
