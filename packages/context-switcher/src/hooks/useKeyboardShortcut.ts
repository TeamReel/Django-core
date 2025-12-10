import { useEffect } from 'react';

/**
 * Options for configuring a keyboard shortcut
 */
export interface KeyboardShortcutOptions {
  /**
   * The key to listen for (e.g., 'k', 'Enter', 'Escape')
   */
  key: string;

  /**
   * Whether Ctrl key must be pressed (Windows/Linux)
   */
  ctrlKey?: boolean;

  /**
   * Whether Shift key must be pressed
   */
  shiftKey?: boolean;

  /**
   * Whether Alt key must be pressed
   */
  altKey?: boolean;

  /**
   * Whether Meta/Command key must be pressed (macOS)
   */
  metaKey?: boolean;

  /**
   * Whether to prevent default browser behavior
   * @default true
   */
  preventDefault?: boolean;
}

/**
 * Hook that registers a global keyboard shortcut handler.
 *
 * Use cases:
 * - Global app shortcuts (Cmd/Ctrl+K for quick search)
 * - Modal keyboard navigation (Escape to close)
 * - Custom keyboard bindings
 *
 * @param options - Keyboard shortcut configuration
 * @param callback - Function to call when shortcut is triggered
 *
 * @example
 * ```tsx
 * // Cmd/Ctrl+K shortcut
 * useKeyboardShortcut(
 *   {
 *     key: 'k',
 *     ctrlKey: true,  // Windows/Linux
 *     metaKey: true,  // macOS
 *   },
 *   () => {
 *     openSearchModal();
 *   }
 * );
 *
 * // Escape to close
 * useKeyboardShortcut(
 *   { key: 'Escape' },
 *   () => {
 *     if (isOpen) closeModal();
 *   }
 * );
 * ```
 *
 * Requirements:
 * - FR-071: Global keyboard shortcuts (Cmd/Ctrl+K)
 * - FR-072: Escape key closes modals
 * - NFR-001: WCAG 2.1 AA keyboard accessibility
 */
export function useKeyboardShortcut(
  options: KeyboardShortcutOptions,
  callback: (event: KeyboardEvent) => void
): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Check if the key matches
      if (event.key !== options.key) return;

      // Check modifier keys (only if specified in options)
      if (options.ctrlKey !== undefined && event.ctrlKey !== options.ctrlKey) return;
      if (options.shiftKey !== undefined && event.shiftKey !== options.shiftKey) return;
      if (options.altKey !== undefined && event.altKey !== options.altKey) return;
      if (options.metaKey !== undefined && event.metaKey !== options.metaKey) return;

      // Prevent default browser behavior (unless explicitly disabled)
      if (options.preventDefault !== false) {
        event.preventDefault();
      }

      // Call the callback
      callback(event);
    };

    // Register the event listener
    window.addEventListener('keydown', handler);

    // Clean up on unmount
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [options, callback]);
}
