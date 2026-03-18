/**
 * Toast — lightweight notification system.
 *
 * Provides a `useToast()` hook + `<ToastContainer />` portal.
 * Replaces 4+ copy-pasted inline toast implementations.
 *
 * Usage:
 *   const { pushToast } = useToast();
 *   pushToast({ message: 'Saved!', type: 'success' });
 *
 *   // Render once at app root:
 *   <ToastContainer />
 */
import React, { createContext, useCallback, useContext, useState, useRef, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  /** Optional lucide icon rendered before the message. */
  icon?: LucideIcon;
  /** Optional action buttons rendered below the message. */
  actions?: ToastAction[];
}

interface ToastContextValue {
  toasts: ToastItem[];
  pushToast: (t: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let _toastIdCounter = 0;

export function ToastProvider({ children, autoDismissMs = 5000, maxVisible = 3 }: { children: React.ReactNode; autoDismissMs?: number; maxVisible?: number }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
  }, []);

  const pushToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = `toast-${++_toastIdCounter}`;
    setToasts((prev) => [...prev, { ...t, id }]);
    // Action toasts stay longer (8s) so users can press the buttons
    const ms = t.actions?.length ? Math.max(autoDismissMs, 8000) : autoDismissMs;
    const timer = setTimeout(() => removeToast(id), ms);
    timersRef.current.set(id, timer);
  }, [autoDismissMs, removeToast]);

  useEffect(() => {
    return () => { timersRef.current.forEach((t) => clearTimeout(t)); };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts: toasts.slice(-maxVisible), pushToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const TYPE_CLASS: Record<ToastType, string> = {
  success: styles.toastSuccess,
  error: styles.toastError,
  warning: styles.toastWarning,
  info: styles.toastInfo,
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div className={styles.container} aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          onClick={() => removeToast(t.id)}
          className={`${styles.toast} ${TYPE_CLASS[t.type]}`}
        >
          <div className={styles.body}>
            {t.icon && <t.icon size={16} strokeWidth={2} className={styles.icon} />}
            <span>{t.message}</span>
          </div>
          {t.actions && t.actions.length > 0 && (
            <div className={styles.actions}>
              {t.actions.map((action) => (
                <button
                  key={action.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeToast(t.id);
                    action.onClick();
                  }}
                  className={styles.actionBtn}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
