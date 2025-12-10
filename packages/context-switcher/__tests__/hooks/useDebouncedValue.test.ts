import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from '../../src/hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 300));

    expect(result.current).toBe('initial');
  });

  it('debounces value updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'first' } }
    );

    expect(result.current).toBe('first');

    // Update value
    rerender({ value: 'second' });

    // Value should still be 'first' immediately after update
    expect(result.current).toBe('first');

    // Advance timers by the delay amount
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Now value should be updated
    expect(result.current).toBe('second');
  });

  it('cancels previous timer on rapid updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'first' } }
    );

    // First update
    rerender({ value: 'second' });
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Still 'first' because timer hasn't completed
    expect(result.current).toBe('first');

    // Second update before first timer completes
    rerender({ value: 'third' });
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Still 'first' because second timer hasn't completed
    expect(result.current).toBe('first');

    // Complete the second timer
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Now value should be 'third' (not 'second')
    expect(result.current).toBe('third');
  });

  it('uses custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: 'first' } }
    );

    rerender({ value: 'second' });

    // After 300ms, should still be 'first'
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('first');

    // After 500ms total, should be 'second'
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('second');
  });

  it('uses default delay of 300ms when not specified', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: 'first' } }
    );

    rerender({ value: 'second' });

    // After 299ms, should still be 'first'
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('first');

    // After 300ms total, should be 'second'
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('second');
  });

  it('handles numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 0 } }
    );

    expect(result.current).toBe(0);

    rerender({ value: 42 });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe(42);
  });

  it('handles boolean values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: false } }
    );

    expect(result.current).toBe(false);

    rerender({ value: true });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe(true);
  });

  it('handles object values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: { id: 1 } } }
    );

    expect(result.current).toEqual({ id: 1 });

    const newObj = { id: 2 };
    rerender({ value: newObj });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe(newObj);
  });

  it('handles array values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: [1, 2, 3] } }
    );

    expect(result.current).toEqual([1, 2, 3]);

    const newArray = [4, 5, 6];
    rerender({ value: newArray });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe(newArray);
  });

  it('handles empty string', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: '' });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe('');
  });

  it('cleans up timer on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { rerender, unmount } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'first' } }
    );

    rerender({ value: 'second' });

    // Unmount before timer completes
    unmount();

    // Verify clearTimeout was called
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });
});
