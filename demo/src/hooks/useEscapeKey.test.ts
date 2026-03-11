import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEscapeKey } from './useEscapeKey';

describe('useEscapeKey', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeKey(onClose));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose for other keys', () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeKey(onClose));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does nothing when onClose is undefined', () => {
    // Should not throw
    renderHook(() => useEscapeKey(undefined));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  });

  it('cleans up listener on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = renderHook(() => useEscapeKey(onClose));

    unmount();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('updates listener when onClose changes', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ fn }) => useEscapeKey(fn), {
      initialProps: { fn: first },
    });

    rerender({ fn: second });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});
