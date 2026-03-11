/**
 * TopNavbar mobile overlay sections — extracted from TopNavbar.tsx
 */

import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { AppIcon } from './AppIcon';
import ProfileAvatarDropdown from './ProfileAvatarDropdown';
import { SearchBar } from './SearchBar';
import s from './TopNavbar.module.css';
import type { NavGroup, NavItem } from './topNavbarHelpers';

interface MobileMenuOverlayProps {
  dashboardItem: NavItem;
  filteredNavGroups: NavGroup[];
  isItemActive: (path: string) => boolean;
  user: boolean;
}

export function MobileMenuOverlay({ dashboardItem, filteredNavGroups, isItemActive, user }: MobileMenuOverlayProps) {
  return (
    <div className={s.mobileOverlay}>
      <Link
        to={dashboardItem.path}
        className={s.mobileDashLink}
        data-active={isItemActive(dashboardItem.path)}
      >
        <AppIcon icon={dashboardItem.icon!} size={16} />
        <span>{dashboardItem.label}</span>
      </Link>
      {filteredNavGroups.map(group => (
        <div key={group.id} className="mb-16">
          <div className={s.mobileGroupLabel}>{group.label}</div>
          {group.items.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={s.mobileGroupItem}
              data-active={isItemActive(item.path)}
            >
              {item.icon && <AppIcon icon={item.icon} size={16} />}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      ))}
      {user && (
        <div className="border-top mt-16 p-16">
          <ProfileAvatarDropdown />
        </div>
      )}
    </div>
  );
}

interface MobileSearchOverlayProps {
  onClose: () => void;
  onQueryChange: (q: string) => void;
}

export function MobileSearchOverlay({ onClose, onQueryChange }: MobileSearchOverlayProps) {
  return (
    <div className={s.mobileSearchOverlay}>
      <div className={s.mobileSearchHeader}>
        <div className={s.mobileSearchInputWrap}>
          <SearchBar
            placeholder="Zoeken..."
            onQueryChange={(q) => onQueryChange(String(q || ''))}
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className={s.mobileSearchClose}
          aria-label="Sluiten"
        >
          <X size={20} />
        </button>
      </div>
    </div>
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
    .nav-credits-button { display: none !important; }
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
