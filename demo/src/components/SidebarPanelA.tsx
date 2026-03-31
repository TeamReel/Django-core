import { memo } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import type { Location } from 'react-router-dom';
import { AppIcon } from './AppIcon';
import { ConnectionStatus } from './ui/ConnectionStatus';
import { preloadRoute } from '../utils/preloadRoute';
import { routes } from '../routes';
import type { NavSection } from './sidebarData';
import type { QueueCounts } from '../hooks/useQueueCounts';
import styles from './Sidebar.module.css';

interface SidebarPanelAProps {
    isOpen: boolean;
    toggle: () => void;
    location: Location;
    panelASections: NavSection[];
    queueCounts: QueueCounts;
}

export const SidebarPanelA = memo(function SidebarPanelA({
    isOpen,
    toggle,
    location,
    panelASections,
    queueCounts,
}: SidebarPanelAProps) {
    return (
        <aside
            className={`sidebar-panel-a flex-col relative ${styles.panelA}`}
            data-open={isOpen}
        >
            <div className="flex-1 flex-col gap-4 px-12 overflow-y-auto">
                {panelASections.map((section, sectionIndex) => {
                    const path = location.pathname;
                    const walletParam = new URLSearchParams(location.search || '').get('wallet');
                    const isPersonalWallet = walletParam === 'personal';

                    const isPreferencesRoute =
                        path.startsWith('/profile') ||
                        path.startsWith('/notifications') ||
                        path.startsWith('/preferences') ||
                        path.startsWith('/memberships') ||
                        path.startsWith('/billing') ||
                        (path.startsWith('/credits') && isPersonalWallet);

                    const isOrganisationRoute =
                        path.startsWith('/permissions') ||
                        path === '/users' ||
                        path.startsWith('/organisation/') ||
                        path.startsWith('/audit') ||
                        (path.startsWith('/credits') && !isPersonalWallet);

                    const isPlatformRoute =
                        path.startsWith('/health') ||
                        path.startsWith('/flags') ||
                        path.startsWith('/integration-status') ||
                        path.startsWith('/design-system') ||
                        path.startsWith('/observability') ||
                        path.startsWith('/platform-stats') ||
                        path.startsWith('/security');

                    const sectionIsActive = (() => {
                        if (section.id === 'settings') {
                            return isPreferencesRoute || isOrganisationRoute || isPlatformRoute;
                        }
                        return section.items.some((item) => {
                            const itemPath = String(item.path || '').split('?')[0];
                            if (!itemPath) return false;
                            if (itemPath === routes.dashboard()) {
                                return path === routes.dashboard() || path === '/recents' || path === '/favorites';
                            }
                            if (itemPath === '/directory') {
                                return path.startsWith('/directory');
                            }
                            if (itemPath === '/medialib' || itemPath === '/studio') {
                                return path.startsWith(itemPath);
                            }
                            return path === itemPath || path.startsWith(`${itemPath}/`);
                        });
                    })();

                    return (
                        <div key={section.id} className={styles.section} data-bottom={!!section.bottom}>
                            {isOpen && section.title && (
                                <div className="flex-between gap-8">
                                    <Link
                                        to={
                                            section.id === 'overview' ? routes.dashboard() :
                                            section.id === 'app' ? '/apps' :
                                            section.id === 'content' ? '/content' :
                                            section.id === 'settings' ? '/settings' :
                                            section.id === 'help' ? '/docs' :
                                            routes.dashboard()
                                        }
                                        className={styles.sectionTitle}
                                        data-active={sectionIsActive}
                                    >
                                        {section.title}
                                    </Link>

                                    {sectionIndex === 0 && (
                                        <button
                                            onClick={toggle}
                                            title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
                                            aria-label={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
                                            className={`sidebar-collapse-button rounded-6 border-none cursor-pointer flex-center ${styles.collapseButton}`}
                                        >
                                            <AppIcon icon={isOpen ? PanelLeftClose : PanelLeft} size={16} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {section.items.map((item, index) => (
                                <NavLink
                                    key={`${section.id}:${index}:${item.label}`}
                                    to={item.path === '/approvals' && queueCounts.review > 0 ? '/approvals?tab=review' : item.path}
                                    end={section.id === 'app'}
                                    title={!isOpen ? item.label : undefined}
                                    onMouseEnter={() => preloadRoute(item.path)}
                                    onFocus={() => preloadRoute(item.path)}
                                    className={({ isActive }) => {
                                        const curPath = location.pathname;
                                        const wp = new URLSearchParams(location.search || '').get('wallet');
                                        const isPW = wp === 'personal';

                                        const itemPath = String(item.path || '').split('?')[0];

                                        const isPrefRoute =
                                            curPath.startsWith('/profile') ||
                                            curPath.startsWith('/notifications') ||
                                            curPath.startsWith('/preferences') ||
                                            curPath.startsWith('/memberships') ||
                                            curPath.startsWith('/billing') ||
                                            (curPath.startsWith('/credits') && isPW);

                                        const isOrgRoute =
                                            curPath.startsWith('/permissions') ||
                                            curPath === '/users' ||
                                            curPath.startsWith('/organisation/') ||
                                            (curPath.startsWith('/credits') && !isPW);

                                        const isPlatRoute =
                                            curPath.startsWith('/audit') ||
                                            curPath.startsWith('/health') ||
                                            curPath.startsWith('/flags') ||
                                            curPath.startsWith('/integration-status') ||
                                            curPath.startsWith('/design-system') ||
                                            curPath.startsWith('/observability') ||
                                            curPath.startsWith('/platform-stats') ||
                                            curPath.startsWith('/security');

                                        const isActiveViaItem =
                                            (itemPath === '/preferences' && isPrefRoute) ||
                                            (itemPath === '/permissions' && isOrgRoute) ||
                                            (itemPath === '/health' && isPlatRoute);

                                        let refinedIsActive = isActive;
                                        if (section.id === 'app' && isActive) {
                                            const itemUrl = new URL(item.path, window.location.origin);
                                            const itemTab = itemUrl.searchParams.get('tab');
                                            const currentTab = new URLSearchParams(location.search).get('tab');
                                            if (itemTab) {
                                                refinedIsActive = currentTab === itemTab;
                                            } else if (currentTab && itemUrl.pathname === curPath) {
                                                refinedIsActive = false;
                                            }
                                        }

                                        const active = refinedIsActive || isActiveViaItem;

                                        return [
                                            styles.navItem,
                                            isOpen ? styles.navItemOpen : styles.navItemCollapsed,
                                            active && styles.navItemActive,
                                        ].filter(Boolean).join(' ');
                                    }}
                                >
                                    <span className={`flex-center ${styles.iconWrap}`}>
                                        <AppIcon icon={item.icon} size={18} />
                                    </span>
                                    {isOpen && <span className={`fs-14 fw-500 ${styles.navLabel}`}>{item.label}</span>}

                                    {isOpen && item.path === '/approvals' && (queueCounts.review > 0 || queueCounts.active > 0) && (
                                        <span
                                            className={`ml-auto fw-700 text-center ${styles.queueBadge}`}
                                            data-type={queueCounts.review > 0 ? 'review' : 'active'}
                                        >
                                            {queueCounts.review > 0 ? queueCounts.review : queueCounts.active}
                                        </span>
                                    )}

                                    {!isOpen && item.path === '/approvals' && (queueCounts.review > 0 || queueCounts.active > 0) && (
                                        <span
                                            className={`absolute fw-700 text-center ${styles.queueBadgeCollapsed}`}
                                            data-type={queueCounts.review > 0 ? 'review' : 'active'}
                                        >
                                            {queueCounts.review > 0 ? queueCounts.review : queueCounts.active}
                                        </span>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    );
                })}
            </div>

            <ConnectionStatus showLabel={isOpen} className={styles.connectionStatus} />

            {!isOpen && (
                <button
                    onClick={toggle}
                    title="Expand Sidebar"
                    aria-label="Expand Sidebar"
                    className={`sidebar-expand-button absolute rounded-6 bg-transparent border-none cursor-pointer flex-center ${styles.expandButton}`}
                >
                    <AppIcon icon={PanelLeft} size={16} />
                </button>
            )}
        </aside>
    );
});
