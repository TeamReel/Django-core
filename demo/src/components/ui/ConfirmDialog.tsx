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
import styles from './ConfirmDialog.module.css';

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
          title={state.title || 'Bevestigen'}
          size="sm"
        >
          <div className={styles.contentWrapper}>
            <p className={`m-0 fs-14 ${styles.message}`}>
              {state.message}
            </p>
          </div>
          <div className={`flex-row gap-8 ${styles.footer}`}>
            <button
              type="button"
              onClick={() => handleClose(false)}
              className={`rounded-8 cursor-pointer fs-13 fw-600 ${styles.cancelButton}`}
            >
              {state.cancelLabel || 'Annuleren'}
            </button>
            <button
              type="button"
              onClick={() => handleClose(true)}
              className={`rounded-8 cursor-pointer fs-13 fw-600 ${styles.confirmButton} ${isDanger ? styles.confirmButtonDanger : styles.confirmButtonPrimary}`}
            >
              {state.confirmLabel || 'Bevestigen'}
            </button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}
