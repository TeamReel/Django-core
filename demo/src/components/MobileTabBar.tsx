/**
 * MobileTabBar - Horizontal scrollable tab bar for mobile detail pages
 *
 * Displays tabs in a horizontally scrollable strip for mobile navigation
 * on detail pages (Organisation, Club, Team, Season, etc.)
 *
 * Only visible on mobile (<640px)
 */
import { useNavigate, useLocation } from 'react-router-dom';

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
}

export default function MobileTabBar({ tabs, activeTab, basePath }: MobileTabBarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabClick = (tabId: string) => {
    const base = basePath || location.pathname;
    const params = new URLSearchParams(location.search);
    params.set('tab', tabId);
    navigate(`${base}?${params.toString()}`);
  };

  return (
    <div
      className="mobile-tab-bar"
      style={{
        display: 'flex',
        gap: '4px',
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '8px 0',
        marginBottom: '12px',
        borderBottom: '1px solid var(--app-border)',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: isActive ? 'var(--app-primary)' : 'var(--app-surface-secondary)',
              color: isActive ? '#fff' : 'var(--app-text)',
              border: 'none',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 500,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
