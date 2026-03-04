import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import styles from './MobileFilterSheet.module.css';

interface MobileFilterSheetProps {
  /** Number of currently active filters (shown as badge) */
  activeFilterCount?: number;
  /** Contents to render inside the sheet (the filter controls) */
  children: React.ReactNode;
  /** Called when the sheet is closed */
  onClose?: () => void;
}

/**
 * MobileFilterSheet — Shows a "Filters" button on mobile that opens a bottom-sheet overlay.
 * On desktop (≥640px), children are rendered inline without any wrapper.
 *
 * Usage:
 *   <MobileFilterSheet activeFilterCount={activeCount}>
 *     <select ...>Season</select>
 *     <select ...>Competition</select>
 *   </MobileFilterSheet>
 */
export default function MobileFilterSheet({ activeFilterCount = 0, children, onClose }: MobileFilterSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);
  const haptic = useHapticFeedback();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setDragY(0);
    onClose?.();
  }, [onClose]);

  // Swipe-to-dismiss handlers for bottom sheet
  const handleDragStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleDragMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const diff = e.touches[0].clientY - dragStartY.current;
    if (diff > 0) {
      setDragY(diff);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
    if (dragY > 100) {
      haptic.medium();
      close();
    } else {
      setDragY(0);
    }
  }, [dragY, close, haptic]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Desktop: render children inline
  if (!isMobile) {
    return <>{children}</>;
  }

  // Mobile: button + bottom sheet
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={styles.filterButton}
        data-active={activeFilterCount > 0 || undefined}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        Filters
        {activeFilterCount > 0 && (
          <span
            className={styles.filterBadge}
            data-active={activeFilterCount > 0 || undefined}
          >
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Overlay backdrop */}
      {isOpen && (
        <div
          className={styles.backdrop}
          onClick={close}
        />
      )}

      {/* Bottom sheet */}
      <div
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        className={styles.sheet}
        data-open={isOpen || undefined}
        data-dragging={isDragging.current || undefined}
        style={{ '--drag-y': `${dragY}px` } as React.CSSProperties}
      >
        {/* Handle bar */}
        <div className={styles.handleBarContainer}>
          <div className={styles.handleBar} />
        </div>

        {/* Header */}
        <div className={styles.sheetHeader}>
          <span className={styles.headerTitle}>Filters</span>
          <button
            type="button"
            onClick={close}
            className={styles.applyButton}
          >
            Toepassen
          </button>
        </div>

        {/* Filter controls — stacked vertically */}
        <div className={`mobile-filter-sheet-content ${styles.filterContent}`}>
          {children}
        </div>
      </div>
    </>
  );
}
