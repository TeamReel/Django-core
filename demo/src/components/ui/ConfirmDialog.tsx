/**
 * ConfirmDialog — replaces window.confirm() with a styled modal dialog.
 *
 * Usage (imperative hook):
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: 'Delete?', message: 'This cannot be undone.' });
 *   if (ok) { ... }
 *
 * Render <ConfirmProvider> once at app root.
 */
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal } from './Modal';

export interface ConfirmOptions {
  /** Dialog title */
  title?: string;
  /** Body text */
  message: string;
  /** Confirm button label — defaults to 'Confirm' */
  confirmLabel?: string;
  /** Cancel button label — defaults to 'Cancel' */
  cancelLabel?: string;
  /** Danger variant (red confirm button) */
  variant?: 'default' | 'danger';
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return fn;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm: ConfirmFn = useCallback((opts) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ ...opts, open: true });
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    setState(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  const isDanger = state?.variant === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state?.open && (
        <Modal
          isOpen
          onClose={() => handleClose(false)}
          title={state.title || 'Confirm'}
          size="sm"
        >
          <div style={{ padding: '8px 0 24px' }}>
            <p className="m-0 fs-14" style={{ color: 'var(--app-text)', lineHeight: 1.5 }}>
              {state.message}
            </p>
          </div>
          <div className="flex-row gap-8" style={{ justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="rounded-8 cursor-pointer fs-13 fw-600"
              style={{
                padding: 'var(--space-2) var(--space-4)',
                border: '1px solid var(--app-border)',
                background: 'var(--app-surface)',
                color: 'var(--app-text)',
              }}
            >
              {state.cancelLabel || 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => handleClose(true)}
              className="rounded-8 cursor-pointer fs-13 fw-600"
              style={{
                padding: 'var(--space-2) var(--space-4)',
                border: 'none',
                background: isDanger ? 'var(--color-red-500, #dc2626)' : 'var(--color-primary-400, #3B8EA5)',
                color: 'var(--color-white, #fff)',
              }}
            >
              {state.confirmLabel || 'Confirm'}
            </button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}
