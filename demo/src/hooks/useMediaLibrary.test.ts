import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useMediaLibrary } from './useMediaLibrary';

// Mock the API module
const mockList = vi.fn();
vi.mock('@/api', () => ({
  api: {
    list: (...args: any[]) => mockList(...args),
  },
}));

describe('useMediaLibrary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch items successfully', async () => {
        const mockData = {
            results: [
                { id: '1', title: 'Test Item', tags: [] }
            ],
            count: 1,
            next: null,
            previous: null
        };

        // Delay the response slightly to verify loading state
        mockList.mockImplementationOnce(() =>
            new Promise(resolve => setTimeout(() => resolve(mockData), 10))
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
        mockList.mockRejectedValueOnce(new Error('Error fetching media items: Server Error'));

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
