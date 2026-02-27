import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import FocusTrap from 'focus-trap-react';
import {
  bottomSheetOverlay,
  bottomSheetOverlayClosing,
  bottomSheetContainer,
  bottomSheetContainerClosing,
  bottomSheetDragHandle,
  bottomSheetDragIndicator,
  bottomSheetHeader,
  bottomSheetTitle,
  bottomSheetCloseButton,
  bottomSheetBody,
  bottomSheetFooter,
} from './BottomSheet.css';

export interface BottomSheetProps {
  /** Whether the bottom sheet is open */
  isOpen: boolean;
  /** Callback when the sheet should close */
  onClose: () => void;
  /** Optional title displayed in header */
  title?: string;
  /** Content of the bottom sheet */
  children: React.ReactNode;
  /** Optional footer content (e.g., action buttons) */
  footer?: React.ReactNode;
  /** Close when clicking the overlay backdrop (default: true) */
  closeOnOverlayClick?: boolean;
  /** Close when pressing Escape key (default: true) */
  closeOnEscape?: boolean;
  /** Enable drag-to-dismiss gesture (default: true) */
  enableDragToDismiss?: boolean;
  /** Threshold for drag-to-dismiss in pixels (default: 100) */
  dragThreshold?: number;
  /** Custom className for the container */
  className?: string;
  /** Show drag handle indicator (default: true) */
  showDragHandle?: boolean;
}

/**
 * BottomSheet - Mobile-first sliding panel from bottom of screen
 *
 * Features:
 * - Slides up from bottom with smooth animation
 * - Drag-to-dismiss gesture support
 * - 44px minimum touch targets (WCAG 2.5.5)
 * - Safe area insets for notched devices
 * - Focus trap for accessibility
 * - Backdrop click to dismiss
 *
 * @example
 * ```tsx
 * <BottomSheet
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Select Option"
 *   footer={<Button onClick={handleConfirm}>Confirm</Button>}
 * >
 *   <OptionList options={options} />
 * </BottomSheet>
 * ```
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  enableDragToDismiss = true,
  dragThreshold = 100,
  className,
  showDragHandle = true,
}: BottomSheetProps): JSX.Element | null {
  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  // Animated close handler
  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for animation to complete
    setTimeout(() => {
      setIsClosing(false);
      setDragY(0);
      onClose();
    }, 200);
  }, [onClose]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, handleClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Drag gesture handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enableDragToDismiss) return;
      startY.current = e.touches[0].clientY;
      setIsDragging(true);
    },
    [enableDragToDismiss]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || !enableDragToDismiss) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      // Only allow dragging down
      if (diff > 0) {
        setDragY(diff);
      }
    },
    [isDragging, enableDragToDismiss]
  );

  const handleTouchEnd = useCallback(() => {
    if (!enableDragToDismiss) return;
    setIsDragging(false);

    if (dragY > dragThreshold) {
      handleClose();
    } else {
      // Snap back to original position
      setDragY(0);
    }
  }, [dragY, dragThreshold, enableDragToDismiss, handleClose]);

  // Mouse drag support for desktop testing
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enableDragToDismiss) return;
      startY.current = e.clientY;
      setIsDragging(true);
    },
    [enableDragToDismiss]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !enableDragToDismiss) return;
      const diff = e.clientY - startY.current;
      if (diff > 0) {
        setDragY(diff);
      }
    },
    [isDragging, enableDragToDismiss]
  );

  const handleMouseUp = useCallback(() => {
    if (!enableDragToDismiss) return;
    setIsDragging(false);

    if (dragY > dragThreshold) {
      handleClose();
    } else {
      setDragY(0);
    }
  }, [dragY, dragThreshold, enableDragToDismiss, handleClose]);

  if (!isOpen && !isClosing) return null;

  const overlayClasses = `${bottomSheetOverlay} ${isClosing ? bottomSheetOverlayClosing : ''}`;
  const containerClasses = `${bottomSheetContainer} ${isClosing ? bottomSheetContainerClosing : ''} ${className ?? ''}`;

  return createPortal(
    <FocusTrap
      focusTrapOptions={{
        initialFocus: false,
        clickOutsideDeactivates: true,
        fallbackFocus: () => document.body,
      }}
    >
      <div>
        {/* Overlay backdrop */}
        <div
          className={overlayClasses}
          onClick={closeOnOverlayClick ? handleClose : undefined}
          role="presentation"
          aria-hidden="true"
        />

        {/* Bottom sheet container */}
        <div
          ref={containerRef}
          className={containerClasses}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'bottomsheet-title' : undefined}
          style={{
            transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
            transition: isDragging ? 'none' : undefined,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          {showDragHandle && (
            <div
              className={bottomSheetDragHandle}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              role="button"
              tabIndex={0}
              aria-label="Drag to dismiss"
            >
              <div className={bottomSheetDragIndicator} />
            </div>
          )}

          {/* Header with title and close button */}
          {title && (
            <header className={bottomSheetHeader}>
              <h2 id="bottomsheet-title" className={bottomSheetTitle}>
                {title}
              </h2>
              <button
                type="button"
                className={bottomSheetCloseButton}
                onClick={handleClose}
                aria-label="Close"
              >
                ×
              </button>
            </header>
          )}

          {/* Body content */}
          <div className={bottomSheetBody}>{children}</div>

          {/* Footer actions */}
          {footer && <footer className={bottomSheetFooter}>{footer}</footer>}
        </div>
      </div>
    </FocusTrap>,
    document.body
  );
}
