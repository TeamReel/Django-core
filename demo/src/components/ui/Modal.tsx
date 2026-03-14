/**
 * Modal — reusable modal shell with backdrop, header, body, and footer slots.
 *
 * Features:
 *  - Backdrop click to close
 *  - Escape key to close
 *  - Body scroll lock while open
 *  - Size presets (sm / md / lg / xl / full)
 *  - Accessible: role="dialog", aria-modal, aria-labelledby
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Called when the modal requests to close (backdrop click, escape, X button) */
  onClose: () => void;
  /** Header title text */
  title?: React.ReactNode;
  /** Optional subtitle under the title */
  subtitle?: React.ReactNode;
  /** Optional icon element rendered before the title */
  icon?: React.ReactNode;
  /** Width preset — defaults to 'md' (700px) */
  size?: ModalSize;
  /** Modal body */
  children: React.ReactNode;
  /** Optional footer (action buttons etc.) */
  footer?: React.ReactNode;
  /** Disable closing (hides X, disables backdrop click & escape) */
  preventClose?: boolean;
  /** Extra className on the content panel */
  className?: string;
}

// ---------------------------------------------------------------------------
// Size map
// ---------------------------------------------------------------------------

const SIZE_MAP: Record<ModalSize, string> = {
  sm: '500px',
  md: '700px',
  lg: '860px',
  xl: '980px',
  full: '95vw',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  children,
  footer,
  preventClose = false,
  className = '',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ------ Escape key ------
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preventClose) onClose();
    },
    [onClose, preventClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // ------ Focus trapping ------
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    // Move focus into the panel on open
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the first focusable element, or the panel itself
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      panel.focus();
    }

    // Trap Tab inside the panel
    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusableEls = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusableEls.length === 0) return;
      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', trapFocus);

    return () => {
      document.removeEventListener('keydown', trapFocus);
      // Restore focus when modal closes
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  // ------ Body scroll lock ------
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (!preventClose) onClose();
  };

  return (
    <div
      className="flex-center"
      style={overlayStyle}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={`bg-surface rounded-12 flex-col ${className}`}
        style={{ ...panelStyle, maxWidth: SIZE_MAP[size] }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || !preventClose) && (
          <div className="flex-between border-bottom" style={headerPadding}>
            <div className="flex-row gap-12">
              {icon && (
                <div
                  className={`flex-center rounded-8 ${styles.iconWrapper}`}
                >
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <div id="modal-title" className={styles.title}>
                    {title}
                  </div>
                )}
                {subtitle && (
                  <div className={styles.subtitle}>
                    {subtitle}
                  </div>
                )}
              </div>
            </div>

            {!preventClose && (
              <button
                onClick={onClose}
                className={`bg-transparent border-none cursor-pointer p-8 rounded-6 ${styles.closeButton}`}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-auto p-20">{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className={`flex-row border-top ${styles.footer}`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 'var(--z-modal)',
};

const panelStyle: React.CSSProperties = {
  width: '95%',
  maxHeight: '90vh',
  boxShadow: 'var(--shadow-lg)',
};

const headerPadding: React.CSSProperties = {
  padding: 'var(--space-4) var(--space-5)',
};
