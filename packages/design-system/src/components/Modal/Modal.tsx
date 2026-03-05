import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import FocusTrap from 'focus-trap-react';
import { modalOverlay, modalContent, modalHeader, modalBody, modalFooter, modalCloseButton, modalDragHandle, modalDragBar } from './Modal.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
}: ModalProps): JSX.Element | null {
  // Handle Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <FocusTrap
      focusTrapOptions={{
        initialFocus: false,
        clickOutsideDeactivates: true,
        fallbackFocus: () => document.body,
      }}
    >
      <div
        className={modalOverlay}
        onClick={closeOnOverlayClick ? onClose : undefined}
        role="presentation"
      >
        <div
          className={`${modalContent} ${className ?? ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile drag handle indicator */}
          <div className={modalDragHandle} aria-hidden="true">
            <div className={modalDragBar} />
          </div>
          {title && (
            <header className={modalHeader}>
              <h2 id="modal-title">{title}</h2>
              <button
                type="button"
                className={modalCloseButton}
                onClick={onClose}
                aria-label="Close modal"
              >
                ×
              </button>
            </header>
          )}
          <div className={modalBody}>{children}</div>
          {footer && <footer className={modalFooter}>{footer}</footer>}
        </div>
      </div>
    </FocusTrap>,
    document.body
  );
}
