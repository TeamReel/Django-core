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

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
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

export function ToastProvider({ children, autoDismissMs = 5000 }: { children: React.ReactNode; autoDismissMs?: number }) {
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
    <ToastContext.Provider value={{ toasts, pushToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const TYPE_STYLES: Record<ToastType, React.CSSProperties> = {
  success: { backgroundColor: 'var(--color-green-500, #16a34a)', color: '#fff' },
  error:   { backgroundColor: 'var(--color-red-500, #dc2626)', color: '#fff' },
  warning: { backgroundColor: 'var(--color-amber-500, #d97706)', color: '#fff' },
  info:    { backgroundColor: 'var(--color-blue-500, #3b82f6)', color: '#fff' },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          onClick={() => removeToast(t.id)}
          style={{
            ...TYPE_STYLES[t.type],
            padding: '12px 18px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            pointerEvents: 'auto',
            maxWidth: 360,
            cursor: 'pointer',
            animation: 'toast-slide-in 0.2s ease-out',
          }}
        >
          {t.message}
          {t.actions && t.actions.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {t.actions.map((action, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeToast(t.id);
                    action.onClick();
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 12px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.35)'; }}
                  onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)'; }}
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
