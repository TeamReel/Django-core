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
      <div
        className="mobile-tab-bar mobile-tab-bar--inline"
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          marginBottom: '12px',
          padding: '2px 0',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={{
                flexShrink: 0,
                padding: '10px 14px',
                minHeight: '44px',
                borderRadius: '20px',
                border: isActive ? '1.5px solid rgba(99, 160, 255, 0.7)' : '1px solid var(--app-border)',
                background: isActive ? 'rgba(59, 130, 246, 0.22)' : 'transparent',
                color: isActive ? '#93bbff' : 'var(--app-muted-text, #888)',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
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
      className="mobile-tab-bar"
      style={{
        position: 'relative',
        marginBottom: '12px',
      }}
    >
      {/* Current Tab Button - triggers dropdown */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 16px',
          backgroundColor: 'var(--app-surface)',
          border: '1px solid var(--app-border)',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--app-muted-text)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Section
          </span>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--app-text)',
            }}
          >
            {currentTab?.label || 'Select'}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--app-primary)',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 500 }}>
            {tabs.length} options
          </span>
          <AppIcon
            icon={ChevronDown}
            size={18}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
            zIndex: 100,
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '14px 16px',
                  backgroundColor: isActive ? 'var(--app-surface-secondary)' : 'transparent',
                  border: 'none',
                  borderBottom: index < tabs.length - 1 ? '1px solid var(--app-border)' : 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isActive ? 'var(--app-surface-secondary)' : 'transparent';
                }}
              >
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--app-primary)' : 'var(--app-text)',
                  }}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <AppIcon icon={Check} size={18} style={{ color: 'var(--app-primary)' }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
