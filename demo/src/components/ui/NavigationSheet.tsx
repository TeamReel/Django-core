/**
 * NavigationSheet — Universal slide-in sheet for inline sub-navigation.
 *
 * Replaces ad-hoc sheet implementations with a single, consistent component.
 * Mobile: slides up full-screen from bottom.
 * Desktop (≥640px): slides in from right as a side panel.
 *
 * Features (matching Modal.tsx patterns):
 * - Escape key to close (only when open)
 * - Body scroll lock with overflow restore
 * - Focus trapping (Tab cycle)
 * - Focus restore on close
 * - Animated open + close transitions
 * - role="dialog", aria-modal, aria-label
 * - Overlay backdrop click to dismiss
 *
 * @example
 * ```tsx
 * <NavigationSheet isOpen={open} onClose={() => setOpen(false)} title="Credits">
 *   <CreditsContent />
 * </NavigationSheet>
 * ```
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import styles from './NavigationSheet.module.css';

export interface NavigationSheetProps {
  /** Whether the sheet is visible */
  isOpen: boolean;
  /** Callback when the sheet should close */
  onClose: () => void;
  /** Title shown in the sheet header */
  title: string;
  /** Sheet content */
  children: React.ReactNode;
  /** Optional icon element rendered before the title */
  icon?: React.ReactNode;
  /** Optional footer content (e.g. action buttons) */
  footer?: React.ReactNode;
  /** Width of the desktop side panel (default: min(560px, 100vw - 60px)) */
  desktopWidth?: string;
  /** Additional className on the sheet panel */
  className?: string;
  /**
   * iOS-style back button — when provided, replaces the × close button
   * with a "‹ Vorige" back arrow. Used for child sheets that drill
   * deeper from a parent sheet.
   */
  onBack?: () => void;
}

const CLOSE_DURATION = 200; // ms — matches CSS animation

/** Resolve effective close duration (skip animation for prefers-reduced-motion) */
function getCloseDuration(): number {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return 0;
  }
  return CLOSE_DURATION;
}

export const NavigationSheet: React.FC<NavigationSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  icon,
  footer,
  desktopWidth,
  className,
  onBack,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [closing, setClosing] = useState(false);

  // ------ Animated close ------
  const handleClose = useCallback(() => {
    const duration = getCloseDuration();
    if (duration === 0) {
      onClose();
      return;
    }
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, duration);
  }, [onClose]);

  // ------ Escape key (only when open) ------
  useEffect(() => {
    if (!isOpen || closing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, closing, handleClose]);

  // ------ Focus trapping ------
  useEffect(() => {
    if (!isOpen || !sheetRef.current) return;

    const panel = sheetRef.current;
    previousFocus.current = document.activeElement as HTMLElement | null;

    // Focus first focusable element, or panel itself
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
      const els = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];

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
      previousFocus.current?.focus?.();
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

  if (!isOpen && !closing) return null;

  const overlayClass = `${styles.overlay} ${closing ? styles.overlayClosing : ''}`;
  const sheetClass = [
    styles.sheet,
    closing ? styles.sheetClosing : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={overlayClass} role="presentation" onClick={handleClose}>
      <div
        ref={sheetRef}
        className={sheetClass}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={desktopWidth ? { '--sheet-desktop-width': desktopWidth } as React.CSSProperties : undefined}
      >
        {/* Header */}
        <div className={styles.header}>
          {onBack ? (
            <button
              className={styles.backButton}
              onClick={onBack}
              aria-label="Vorige"
            >
              <ChevronLeft size={20} />
              <span>Vorige</span>
            </button>
          ) : (
            <div className={styles.headerLeft}>
              {icon && <span className={styles.headerIcon}>{icon}</span>}
              <h2 className={styles.title}>{title}</h2>
            </div>
          )}
          {onBack ? (
            <h2 className={styles.title}>{title}</h2>
          ) : null}
          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close"
            style={onBack ? { visibility: 'hidden' } : undefined}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className={styles.body}>
          {children}
        </div>

        {/* Optional footer */}
        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationSheet;
