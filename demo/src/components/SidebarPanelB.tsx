import { memo } from 'react';
import { Link } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { AppIcon } from './AppIcon';
import type { PanelBResult } from './sidebarPanelBWork';
import type { QueueCounts } from '../hooks/useQueueCounts';
import styles from './Sidebar.module.css';

interface SidebarPanelBProps {
    location: Location;
    panelBConfig: PanelBResult;
    queueCounts: QueueCounts;
}

export const SidebarPanelB = memo(function SidebarPanelB({
    location,
    panelBConfig,
    queueCounts,
}: SidebarPanelBProps) {
    const hasTabItems = panelBConfig.items.some(item => {
        const p = String(item.path || '');
        return p.includes('?tab=') || p.includes('?category=');
    });

    return (
        <aside className={`sidebar-panel-b flex-col z-10 ${styles.panelB}`}>
            <div className={`flex-row fw-600 fs-11 uppercase tracking-wide ${styles.panelBHeader}`}>
                {panelBConfig.title}
            </div>

            {hasTabItems ? (
                <div className="flex-col gap-6 py-16 px-12 border-bottom mb-0">
                    {panelBConfig.items.map(item => {
                        const [itemPathname, itemQuery = ''] = String(item.path || '').split('?');
                        const itemSearch = itemQuery ? `?${itemQuery}` : '';
                        const locationTab = String(new URLSearchParams(location.search).get('tab') || '').trim().toLowerCase();
                        const locationCategory = String(new URLSearchParams(location.search).get('category') || '').trim().toLowerCase();
                        const locationSub = String(new URLSearchParams(location.search).get('sub') || '').trim().toLowerCase();
                        const itemTab = String(new URLSearchParams(itemSearch).get('tab') || '').trim().toLowerCase();
                        const itemCategory = String(new URLSearchParams(itemSearch).get('category') || '').trim().toLowerCase();
                        const itemSub = String(new URLSearchParams(itemSearch).get('sub') || '').trim().toLowerCase();
                        const effectiveLocationTab = locationTab || locationCategory || (
                            location.pathname === '/directory' ? 'federations' :
                            location.pathname === '/medialib' ? 'organisation' :
                            location.pathname === '/studio' ? 'all' :
                            location.pathname === '/studio/videos' ? 'all' :
                            location.pathname === '/approvals' ? 'all' :
                            'overview'
                        );
                        const effectiveItemTab = itemTab || itemCategory || 'overview';
                        const isActive = location.pathname === itemPathname &&
                            effectiveLocationTab === effectiveItemTab &&
                            (!itemSub || locationSub === itemSub);

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={styles.panelBTabItem}
                                data-active={isActive}
                            >
                                {item.icon && (
                                    <span className={styles.panelBTabIcon}>
                                        <AppIcon icon={item.icon} size={16} />
                                    </span>
                                )}
                                {item.label}
                                {(() => {
                                    if (!itemPathname.startsWith('/approvals')) return null;
                                    const tabKey = itemTab as keyof typeof queueCounts;
                                    const count = queueCounts[tabKey];
                                    if (count === undefined) return null;
                                    return (
                                        <span
                                            className={styles.queueCount}
                                            data-visible={count > 0}
                                            data-highlight={tabKey === 'review' && count > 0}
                                            data-active={isActive}
                                        >
                                            ({count})
                                        </span>
                                    );
                                })()}
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="flex-col gap-2 py-16 px-12">
                    {panelBConfig.items.map(item => {
                        const [itemPathname, itemQuery = ''] = String(item.path || '').split('?');
                        const itemSearch = itemQuery ? `?${itemQuery}` : '';
                        const locationTab = String(new URLSearchParams(location.search).get('tab') || '').trim().toLowerCase();
                        const itemTab = String(new URLSearchParams(itemSearch).get('tab') || '').trim().toLowerCase();
                        const isTabItem = Boolean(itemTab);
                        const isActive = isTabItem
                            ? (location.pathname === itemPathname && locationTab === itemTab)
                            : (location.pathname === itemPathname && (!locationTab || locationTab === 'overview'));

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={styles.panelBItem}
                                data-active={isActive}
                            >
                                {item.icon && (
                                    <span className={styles.panelBItemIcon}>
                                        <AppIcon icon={item.icon} size={16} />
                                    </span>
                                )}
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            )}
        </aside>
    );
});
