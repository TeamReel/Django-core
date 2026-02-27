import React, { useState, useEffect, useCallback } from 'react';

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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

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
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 16px',
          borderRadius: 8,
          border: '1px solid var(--app-border)',
          background: activeFilterCount > 0 ? 'var(--app-primary, #3b82f6)' : 'var(--app-surface)',
          color: activeFilterCount > 0 ? '#fff' : 'var(--app-text)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          minHeight: 44,
          width: '100%',
          justifyContent: 'center',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        Filters
        {activeFilterCount > 0 && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: activeFilterCount > 0 ? 'rgba(255,255,255,0.3)' : 'var(--app-primary, #3b82f6)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
          }}>
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Overlay backdrop */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={close}
        />
      )}

      {/* Bottom sheet */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          background: 'var(--app-surface)',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          maxHeight: '80vh',
          overflowY: 'auto',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease',
          padding: '16px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 4 }}>
          <div style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'var(--app-border)',
          }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--app-text)' }}>Filters</span>
          <button
            type="button"
            onClick={close}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--app-primary, #3b82f6)',
              cursor: 'pointer',
              padding: '8px 12px',
              minHeight: 44,
            }}
          >
            Toepassen
          </button>
        </div>

        {/* Filter controls — stacked vertically */}
        <div className="mobile-filter-sheet-content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children}
        </div>
      </div>
    </>
  );
}
