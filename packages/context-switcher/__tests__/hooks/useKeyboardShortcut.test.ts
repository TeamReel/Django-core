import { renderHook } from '@testing-library/react';
import { useKeyboardShortcut } from '../../src/hooks/useKeyboardShortcut';

describe('useKeyboardShortcut', () => {
  it('calls callback on matching key', () => {
    const callback = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrlKey: true }, callback)
    );

    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    window.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(event);
  });

  it('does not call callback on non-matching key', () => {
    const callback = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrlKey: true }, callback)
    );

    const event = new KeyboardEvent('keydown', { key: 'j', ctrlKey: true });
    window.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it('requires all specified modifiers to match', () => {
    const callback = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrlKey: true, shiftKey: true }, callback)
    );

    // Missing shiftKey
    const event1 = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    window.dispatchEvent(event1);
    expect(callback).not.toHaveBeenCalled();

    // All modifiers present
    const event2 = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      shiftKey: true,
    });
    window.dispatchEvent(event2);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('works with metaKey (Cmd on Mac)', () => {
    const callback = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', metaKey: true }, callback)
    );

    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
    window.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('works with altKey', () => {
    const callback = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', altKey: true }, callback)
    );

    const event = new KeyboardEvent('keydown', { key: 'k', altKey: true });
    window.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('prevents default by default', () => {
    const callback = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrlKey: true }, callback)
    );

    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('does not prevent default when preventDefault is false', () => {
    const callback = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrlKey: true, preventDefault: false }, callback)
    );

    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('works with special keys like Escape', () => {
    const callback = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'Escape' }, callback)
    );

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('works with Enter key', () => {
    const callback = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'Enter' }, callback)
    );

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    window.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cleans up event listener on unmount', () => {
    const callback = jest.fn();
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrlKey: true }, callback)
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    // After unmount, event should not trigger callback
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    window.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it('handles multiple shortcuts simultaneously', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrlKey: true }, callback1)
    );

    renderHook(() =>
      useKeyboardShortcut({ key: 'Escape' }, callback2)
    );

    const event1 = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    window.dispatchEvent(event1);

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();

    const event2 = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(event2);

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it('allows modifier key without being specified', () => {
    const callback = jest.fn();

    // Only specify key, no modifiers
    renderHook(() =>
      useKeyboardShortcut({ key: 'k' }, callback)
    );

    // Should trigger with or without modifiers
    const event1 = new KeyboardEvent('keydown', { key: 'k' });
    window.dispatchEvent(event1);
    expect(callback).toHaveBeenCalledTimes(1);

    const event2 = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    window.dispatchEvent(event2);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('ignores modifier when not specified in options', () => {
    const callback = jest.fn();

    // Only ctrlKey specified
    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrlKey: true }, callback)
    );

    // Should work with or without other modifiers
    const event1 = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    window.dispatchEvent(event1);
    expect(callback).toHaveBeenCalledTimes(1);

    const event2 = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, shiftKey: true });
    window.dispatchEvent(event2);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
