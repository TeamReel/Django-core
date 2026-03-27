/**
 * useKeyboardShortcuts — Global keyboard shortcut registry.
 *
 * Provides a declarative way to register keyboard shortcuts.
 * Shortcuts are automatically disabled when an input/textarea/contenteditable
 * element has focus (unless `allowInInput` is set).
 *
 * Usage:
 *   useKeyboardShortcuts([
 *     { key: '/', action: openSearch, description: 'Zoeken' },
 *     { key: '?', action: openCheatsheet, description: 'Sneltoetsen' },
 *   ]);
 */
import { useEffect, useCallback, useRef, useState } from 'react';

export interface ShortcutDef {
  /** Key to match (e.g. 'n', '/', '?', 'Escape'). Case-insensitive. */
  key: string;
  /** Optional modifier: Ctrl/Cmd */
  meta?: boolean;
  /** Optional modifier: Shift */
  shift?: boolean;
  /** Action to perform */
  action: () => void;
  /** Human-readable description for the cheatsheet */
  description: string;
  /** Allow this shortcut even when an input has focus */
  allowInInput?: boolean;
}

/** Global registry shared across all hook instances */
const _registry: ShortcutDef[] = [];
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

/**
 * Register shortcuts for the lifetime of the component.
 * Shortcuts are automatically cleaned up on unmount.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutDef[]): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    // Register
    shortcuts.forEach((s) => {
      if (!_registry.some((r) => r.key === s.key && r.meta === s.meta && r.shift === s.shift)) {
        _registry.push(s);
      }
    });
    notify();

    const handler = (e: KeyboardEvent) => {
      const focused = isInputFocused();

      for (const s of shortcutsRef.current) {
        if (focused && !s.allowInInput) continue;
        if (s.meta && !(e.metaKey || e.ctrlKey)) continue;
        if (s.shift && !e.shiftKey) continue;
        if (!s.meta && (e.metaKey || e.ctrlKey)) continue;

        if (e.key.toLowerCase() === s.key.toLowerCase()) {
          e.preventDefault();
          s.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      // Unregister
      shortcuts.forEach((s) => {
        const idx = _registry.findIndex(
          (r) => r.key === s.key && r.meta === s.meta && r.shift === s.shift,
        );
        if (idx >= 0) _registry.splice(idx, 1);
      });
      notify();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- shortcuts stored in ref; register once on mount
}

/**
 * Read-only access to the full shortcut registry (for the cheatsheet modal).
 */
export function useShortcutRegistry(): ShortcutDef[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);
  return [..._registry];
}

/**
 * Format a shortcut key for display (e.g. "⌘ K", "Shift ?").
 */
export function formatShortcutKey(def: ShortcutDef): string {
  const parts: string[] = [];
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  if (def.meta) parts.push(isMac ? '⌘' : 'Ctrl');
  if (def.shift) parts.push('Shift');

  // Format key name
  const keyMap: Record<string, string> = {
    '/': '/',
    '?': '?',
    escape: 'Esc',
    enter: '↵',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
  };

  const displayKey = keyMap[def.key.toLowerCase()] ?? def.key.toUpperCase();
  parts.push(displayKey);

  return parts.join(' ');
}
