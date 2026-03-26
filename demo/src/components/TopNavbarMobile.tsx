/**
 * TopNavbar mobile overlay sections — extracted from TopNavbar.tsx
 */

import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { SearchBar } from './SearchBar';
import s from './TopNavbar.module.css';

interface MobileSearchOverlayProps {
  onClose: () => void;
  onQueryChange: (q: string) => void;
}

export function MobileSearchOverlay({ onClose, onQueryChange }: MobileSearchOverlayProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {/* Backdrop — tap to close */}
      <div
        className={s.mobileSearchBackdrop}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={s.mobileSearchOverlay} role="dialog" aria-label="Zoeken">
        {/* Header row: title + close */}
        <div className={s.mobileSearchInputRow}>
          <span className={s.mobileSearchTitle}>Zoeken</span>
          <button
            type="button"
            onClick={onClose}
            className={s.mobileSearchClose}
            aria-label="Sluiten"
          >
            <X size={20} />
          </button>
        </div>
        {/* Full-width search with inline results */}
        <div className={s.mobileSearchBody}>
          <SearchBar
            placeholder="Zoeken..."
            onQueryChange={(q) => onQueryChange(String(q || ''))}
            inline
            autoFocus
          />
        </div>
      </div>
    </>
  );
}

/** Inline style block for nav-icon-button base styles and responsive breakpoints. */
export const NAV_INLINE_STYLES = `
  .nav-icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--nav-icon-border);
    background: transparent;
    color: var(--app-text);
    border-radius: 6px;
    cursor: pointer;
    line-height: 1;
  }
  .nav-icon-button:hover {
    background: var(--nav-icon-hover-bg);
  }
  .nav-icon-button:active {
    transform: translateY(0.5px);
  }
  .nav-icon-button:focus-visible {
    outline: 2px solid rgba(37, 99, 235, 0.45);
    outline-offset: 2px;
  }
  .nav-right-fixed.nav-icon-button,
  .nav-credits-button.nav-icon-button {
    border-radius: 6px;
  }
  .nav-search-container {
    transition: max-width 160ms ease, flex-basis 160ms ease;
  }
  @media (min-width: 1025px) {
    .nav-search-container:focus-within {
      max-width: 820px !important;
      flex-basis: 640px;
    }
  }
  @media (max-width: 1024px) {
    .mobile-menu-button { display: flex !important; }
    .desktop-nav { display: none !important; }
    .desktop-only { display: none !important; }
    #mega-menu-panel { display: none !important; }
    .nav-search-container {
      width: auto !important; flex: 0 1 170px !important;
      min-width: 120px !important; max-width: 190px !important;
    }
    .nav-search-container.has-query {
      flex: 1 1 260px !important;
      max-width: min(520px, 58vw) !important;
    }
    .nav-right-fixed { flex-shrink: 0 !important; }
  }
  @media (max-width: 480px) {
    .language-menu-container { display: none !important; }
    .hide-on-mobile { display: none !important; }
    .nav-search-container { min-width: 110px !important; max-width: 150px !important; }
    .nav-search-container.has-query { max-width: 60vw !important; }
  }
`;
