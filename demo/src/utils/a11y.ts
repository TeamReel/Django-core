/**
 * Accessibility helpers for interactive non-semantic elements.
 *
 * Use `clickableProps(onClick)` on any `<div>` / `<span>` that acts as a
 * button to add `role`, `tabIndex`, and Enter/Space keyboard handling.
 */

import type { KeyboardEvent } from 'react';

/** Creates an onKeyDown handler that calls `onClick` on Enter or Space. */
export function handleKeyboardClick(
  onClick: (e?: unknown) => void,
): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  };
}

/**
 * Returns the minimal set of props to make a non-semantic element behave
 * like a button for assistive technology and keyboard users.
 *
 * Usage:
 * ```tsx
 * <div {...clickableProps(() => doSomething())} className="card">
 * ```
 */
export function clickableProps(onClick: (e?: unknown) => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onKeyDown: handleKeyboardClick(onClick),
  };
}
