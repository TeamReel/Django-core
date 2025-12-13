import { renderHook, act } from '@testing-library/react';
import { useControlledState } from './useControlledState';
import { describe, it, expect, vi } from 'vitest';

describe('useControlledState', () => {
  describe('uncontrolled mode', () => {
    it('should use default value initially', () => {
      const { result } = renderHook(() => useControlledState<string>(undefined, 'default'));

      expect(result.current[0]).toBe('default');
    });

    it('should update internal state when setValue is called', () => {
      const { result } = renderHook(() => useControlledState<string>(undefined, 'default'));

      act(() => {
        result.current[1]('new value');
      });

      expect(result.current[0]).toBe('new value');
    });

    it('should call onChange when provided', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useControlledState<string>(undefined, 'default', onChange)
      );

      act(() => {
        result.current[1]('new value');
      });

      expect(onChange).toHaveBeenCalledWith('new value');
    });
  });

  describe('controlled mode', () => {
    it('should use controlled value', () => {
      const { result } = renderHook(() => useControlledState<string>('controlled', 'default'));

      expect(result.current[0]).toBe('controlled');
    });

    it('should not update internal state when setValue is called', () => {
      const { result } = renderHook(() => useControlledState<string>('controlled', 'default'));

      act(() => {
        result.current[1]('new value');
      });

      // Value should still be 'controlled' since parent didn't update
      expect(result.current[0]).toBe('controlled');
    });

    it('should call onChange when setValue is called', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useControlledState<string>('controlled', 'default', onChange)
      );

      act(() => {
        result.current[1]('new value');
      });

      expect(onChange).toHaveBeenCalledWith('new value');
    });

    it('should update when controlled value changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useControlledState<string>(value, 'default'),
        { initialProps: { value: 'controlled1' as string | undefined } }
      );

      expect(result.current[0]).toBe('controlled1');

      rerender({ value: 'controlled2' });

      expect(result.current[0]).toBe('controlled2');
    });
  });

  describe('mode switching', () => {
    it('should warn when switching from uncontrolled to controlled', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { rerender } = renderHook(({ value }) => useControlledState<string>(value, 'default'), {
        initialProps: { value: undefined as string | undefined },
      });

      rerender({ value: 'controlled' });

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('switched between controlled and uncontrolled')
      );

      consoleWarn.mockRestore();
    });

    it('should warn when switching from controlled to uncontrolled', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { rerender } = renderHook(({ value }) => useControlledState<string>(value, 'default'), {
        initialProps: { value: 'controlled' as string | undefined },
      });

      rerender({ value: undefined });

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('switched between controlled and uncontrolled')
      );

      consoleWarn.mockRestore();
    });
  });
});
