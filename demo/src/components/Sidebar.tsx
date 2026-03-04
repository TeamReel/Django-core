import { Link, NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { AppIcon } from './AppIcon';
import { useSidebarData } from './useSidebarData';
import styles from './Sidebar.module.css';

/* ────────────────────────────────────────────────────────────── */
/*  Sidebar \u2013 thin JSX shell                                      */
/*  All state, effects, and computed data live in useSidebarData  */
/* ────────────────────────────────────────────────────────────── */

interface SidebarProps {
    isOpen: boolean;
    toggle: () => void;
}

export default function Sidebar({ isOpen, toggle }: SidebarProps) {
    const {
        isSystemAdmin,
        isOrgAdmin,
        isStaff,
        location,
        panelASections,
        panelBConfig,
        queueCounts,
    } = useSidebarData();

    return (
        <div className={`h-full flex-row ${styles.root}`}>

            {/* ── PANEL A: PRIMARY SIDEBAR ── */}
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
                            path.startsWith('/security');

                        const sectionIsActive = (() => {
                            if (section.id === 'settings') {
                                return isPreferencesRoute || isOrganisationRoute || isPlatformRoute;
                            }
                            return section.items.some((item) => {
                                const itemPath = String(item.path || '').split('?')[0];
                                if (!itemPath) return false;
                                if (itemPath === '/dashboard') {
                                    return path === '/dashboard' || path === '/recents' || path === '/favorites';
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
                                {/* Section label */}
                                {isOpen && section.title && (
                                    <div className="flex-between gap-8">
                                        <Link
                                            to={
                                                section.id === 'overview' ? '/dashboard' :
                                                section.id === 'app' ? '/apps' :
                                                section.id === 'content' ? '/content' :
                                                section.id === 'settings' ? '/settings' :
                                                section.id === 'help' ? '/docs' :
                                                '/dashboard'
                                            }
                                            className={styles.sectionTitle}
                                            data-active={sectionIsActive}
                                        >
                                            {section.title}
                                        </Link>

                                        {/* Collapse button (first section only) */}
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

                                {/* Nav items */}
                                {section.items.map((item, index) => (
                                    <NavLink
                                        key={`${section.id}:${index}:${item.label}`}
                                        to={item.path === '/approvals' && queueCounts.review > 0 ? '/approvals?tab=review' : item.path}
                                        end={section.id === 'app'}
                                        title={!isOpen ? item.label : undefined}
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

                                        {/* Queue badge (open) */}
                                        {isOpen && item.path === '/approvals' && (queueCounts.review > 0 || queueCounts.active > 0) && (
                                            <span
                                                className={`ml-auto fw-700 text-center ${styles.queueBadge}`}
                                                data-type={queueCounts.review > 0 ? 'review' : 'active'}
                                            >
                                                {queueCounts.review > 0 ? queueCounts.review : queueCounts.active}
                                            </span>
                                        )}

                                        {/* Queue badge (collapsed) */}
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

                {/* Expand button when collapsed */}
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

            {/* ── PANEL B: SECONDARY CONTEXT SIDEBAR ── */}
            {panelBConfig && (
                <aside
                    className={`sidebar-panel-b flex-col z-10 ${styles.panelB}`}
                >
                    {/* Header */}
                    <div className={`flex-row fw-600 fs-11 uppercase tracking-wide ${styles.panelBHeader}`}>
                        {panelBConfig.title}
                    </div>

                    {/* Items */}
                    {(() => {
                        const hasTabItems = panelBConfig.items.some(item => {
                            const p = String(item.path || '');
                            return p.includes('?tab=') || p.includes('?category=');
                        });

                        if (hasTabItems) {
                            return (
                                <div
                                    className="flex-col gap-6 py-16 px-12 border-bottom mb-0"
                                >
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
                                                {/* Queue tab counts */}
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
                            );
                        } else {
                            return (
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
                            );
                        }
                    })()}
                </aside>
            )}
        </div>
    );
}
