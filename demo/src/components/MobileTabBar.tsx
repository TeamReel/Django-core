/**
 * MobileTabBar - Tab switcher for detail pages
 *
 * Two variants:
 * - 'inline' (default): Horizontal scrollable pill tabs with fade hint.
 *   Auto-scrolls active tab into view on mount.
 * - 'dropdown': Shows current tab with a dropdown to switch (legacy).
 *
 * Visible on all breakpoints — horizontally scrollable on mobile.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
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

export default function MobileTabBar({ tabs, activeTab, basePath, paramName = 'tab', variant = 'inline' }: MobileTabBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  // Auto-scroll active tab into view + detect overflow for fade hint
  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowFade(el.scrollWidth > el.clientWidth + 8 && el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    if (variant !== 'inline') return;
    const el = scrollRef.current;
    if (!el) return;
    // Scroll active pill into view
    const activePill = el.querySelector('[data-active="true"]') as HTMLElement | null;
    if (activePill) {
      activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    checkOverflow();
    el.addEventListener('scroll', checkOverflow, { passive: true });
    return () => el.removeEventListener('scroll', checkOverflow);
  }, [activeTab, variant, checkOverflow]);

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

  // ── Inline pills variant (default) ────────────────────────────────────
  if (variant === 'inline') {
    return (
      <div className={`mobile-tab-bar mobile-tab-bar--inline ${styles.inlineWrap}`} data-fade={showFade}>
        <div ref={scrollRef} className={styles.inlineBar} role="tablist">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                className={styles.inlinePill}
                data-active={isActive}
                onClick={() => handleTabClick(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
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
