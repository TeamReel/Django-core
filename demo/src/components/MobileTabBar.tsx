/**
 * MobileTabBar - Tab switcher for mobile detail pages
 *
 * Two variants:
 * - 'dropdown' (default): Shows current tab with a dropdown to switch.
 * - 'inline': Horizontal scrollable pill tabs — more compact and direct.
 *
 * Only visible on mobile (<640px)
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Check } from 'lucide-react';
import { AppIcon } from './AppIcon';
import styles from './MobileTabBar.module.css';

export interface MobileTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface MobileTabBarProps {
  tabs: MobileTab[];
  activeTab: string;
  /** Base path to append ?tab= to, defaults to current pathname */
  basePath?: string;
  /** Query parameter name to use (default: 'tab') */
  paramName?: string;
  /** Variant: 'dropdown' (default) or 'inline' horizontal pills */
  variant?: 'dropdown' | 'inline';
}

export default function MobileTabBar({ tabs, activeTab, basePath, paramName = 'tab', variant = 'dropdown' }: MobileTabBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  const handleTabClick = (tabId: string) => {
    const base = basePath || location.pathname;
    const params = new URLSearchParams(location.search);
    if (tabId === 'overview' || tabId === 'all') {
      params.delete(paramName);
    } else {
      params.set(paramName, tabId);
    }
    const qs = params.toString();
    navigate(qs ? `${base}?${qs}` : base);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.search]);

  // ── Inline pills variant ──────────────────────────────────────────────
  if (variant === 'inline') {
    return (
      <div className={`mobile-tab-bar mobile-tab-bar--inline ${styles.inlineBar}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={styles.inlinePill}
              data-active={isActive}
              onClick={() => handleTabClick(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  }

  // ── Dropdown variant (default) ────────────────────────────────────────
  return (
    <div
      ref={dropdownRef}
      className={`mobile-tab-bar ${styles.dropdownBar}`}
    >
      {/* Current Tab Button - triggers dropdown */}
      <button
        className={styles.dropdownTrigger}
        data-open={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.triggerLeft}>
          <span className={styles.sectionLabel}>Section</span>
          <span className={styles.currentTabLabel}>
            {currentTab?.label || 'Select'}
          </span>
        </div>
        <div className={styles.triggerRight}>
          <span className={styles.optionsCount}>
            {tabs.length} options
          </span>
          <AppIcon
            icon={ChevronDown}
            size={18}
            className={styles.chevronIcon}
            data-open={isOpen}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={styles.dropdownMenu}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={styles.dropdownItem}
                data-active={isActive}
                onClick={() => handleTabClick(tab.id)}
              >
                <span
                  className={styles.dropdownItemLabel}
                  data-active={isActive}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <AppIcon icon={Check} size={18} className={styles.checkIcon} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
