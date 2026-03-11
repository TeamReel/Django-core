import { useEffect } from 'react';

/**
 * Close a modal/dialog when the Escape key is pressed.
 *
 * Attaches a document-level `keydown` listener so it works regardless
 * of which element currently has focus.
 */
export function useEscapeKey(onClose: (() => void) | undefined): void {
  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
}
