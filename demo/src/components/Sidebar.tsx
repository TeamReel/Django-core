import { Link, NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { AppIcon } from './AppIcon';
import { useSidebarData } from './useSidebarData';

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
        <div className="h-full flex-row" style={{ zIndex: 90, flexShrink: 0 }}>

            {/* ── PANEL A: PRIMARY SIDEBAR ── */}
            <aside
                className="sidebar-panel-a flex-col relative"
                style={{
                    zIndex: 20,
                    width: isOpen ? 240 : 72,
                    backgroundColor: 'var(--sidebar-a-bg)',
                    color: 'var(--sidebar-a-text)',
                    transition: 'width 0.2s ease-in-out',
                    flexShrink: 0,
                    borderRight: '1px solid var(--sidebar-a-border)',
                    paddingTop: 57,
                }}
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
                            <div key={section.id} style={{ marginBottom: section.bottom ? 0 : 16 }}>
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
                                            style={{
                                                flex: 1,
                                                padding: '0 12px',
                                                marginBottom: 6,
                                                fontSize: 10,
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                opacity: sectionIsActive ? 1 : 0.5,
                                                color: sectionIsActive ? 'var(--sidebar-a-active-text)' : 'var(--sidebar-a-text)',
                                                textDecoration: 'none',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {section.title}
                                        </Link>

                                        {/* Collapse button (first section only) */}
                                        {sectionIndex === 0 && (
                                            <button
                                                onClick={toggle}
                                                title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
                                                aria-label={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
                                                className="sidebar-collapse-button rounded-6 border-none cursor-pointer flex-center"
                                                style={{
                                                    width: 28,
                                                    height: 28,
                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'var(--sidebar-a-text)',
                                                    transition: 'all 0.15s ease',
                                                    flexShrink: 0,
                                                    marginRight: '12px',
                                                    marginBottom: '6px',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                                }}
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
                                        className="flex items-center rounded-md transition-colors"
                                        style={({ isActive }) => {
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

                                            return {
                                                position: 'relative' as const,
                                                minHeight: 44,
                                                textDecoration: 'none',
                                                padding: isOpen ? '0 12px' : '0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: isOpen ? 'flex-start' : 'center',
                                                borderRadius: 8,
                                                background: active ? 'var(--sidebar-a-active-bg)' : 'transparent',
                                                color: active ? 'var(--sidebar-a-active-text)' : 'var(--sidebar-a-text)',
                                            };
                                        }}
                                    >
<span className="flex-center" style={{ minWidth: 24 }}>
                                            <AppIcon icon={item.icon} size={18} />
                                        </span>
                                        {isOpen && <span className="fs-14 fw-500" style={{ marginLeft: 12 }}>{item.label}</span>}

                                        {/* Queue badge (open) */}
                                        {isOpen && item.path === '/approvals' && (queueCounts.review > 0 || queueCounts.active > 0) && (
                                            <span className="ml-auto fw-700 text-center" style={{
                                                backgroundColor: queueCounts.review > 0 ? 'var(--app-error)' : 'var(--color-amber-400)',
                                                color: '#fff',
                                                borderRadius: 10,
                                                padding: '1px 6px',
                                                fontSize: 10,
                                                minWidth: 18,
                                                lineHeight: '16px',
                                            }}>
                                                {queueCounts.review > 0 ? queueCounts.review : queueCounts.active}
                                            </span>
                                        )}

                                        {/* Queue badge (collapsed) */}
                                        {!isOpen && item.path === '/approvals' && (queueCounts.review > 0 || queueCounts.active > 0) && (
                                            <span className="absolute fw-700 text-center" style={{
                                                top: 4,
                                                right: 4,
                                                backgroundColor: queueCounts.review > 0 ? 'var(--app-error)' : 'var(--color-amber-400)',
                                                color: '#fff',
                                                borderRadius: 10,
                                                padding: '1px 5px',
                                                fontSize: 9,
                                                minWidth: 14,
                                                lineHeight: '14px',
                                            }}>
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
                        className="sidebar-expand-button absolute rounded-6 bg-transparent border-none cursor-pointer flex-center"
                        style={{
                            top: 65,
                            right: -14,
                            width: 32,
                            height: 32,
                            color: 'var(--sidebar-a-text)',
                            transition: 'all 0.15s ease',
                            zIndex: 25,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        <AppIcon icon={PanelLeft} size={16} />
                    </button>
                )}
            </aside>

            {/* ── PANEL B: SECONDARY CONTEXT SIDEBAR ── */}
            {panelBConfig && (
                <aside
                    className="sidebar-panel-b flex-col z-10"
                    style={{
                        width: 220,
                        backgroundColor: 'var(--sidebar-b-bg)',
                        borderRight: '1px solid var(--sidebar-b-border)',
                        flexShrink: 0,
                        paddingTop: 57,
                    }}
                >
                    {/* Header */}
                    <div className="flex-row fw-600 fs-11 uppercase tracking-wide" style={{
                        padding: '12px 16px 8px',
                        color: 'var(--sidebar-b-muted-text)',
                    }}>
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
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '6px 10px',
                                                    borderRadius: 8,
                                                    border: `1px solid ${isActive ? 'var(--sidebar-b-border)' : 'transparent'}`,
                                                    background: isActive ? 'var(--sidebar-b-active-bg)' : 'transparent',
                                                    color: isActive ? 'var(--sidebar-b-active-text)' : 'var(--sidebar-b-text)',
                                                    fontSize: 13,
                                                    fontWeight: isActive ? 700 : 600,
                                                    textDecoration: 'none',
                                                    width: '100%',
                                                }}
                                            >
                                                {item.icon && (
                                                    <span style={{ marginRight: 10, display: 'flex' }}>
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
                                                        <span style={{
                                                            marginLeft: 'auto',
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            opacity: count > 0 ? 0.9 : 0.4,
                                                            color: tabKey === 'review' && count > 0
                                                                ? 'var(--app-error)'
                                                                : isActive ? 'var(--sidebar-b-active-text)' : 'var(--sidebar-b-muted-text)',
                                                        }}>
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
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '8px 12px',
                                                    borderRadius: 6,
                                                    textDecoration: 'none',
                                                    fontSize: 14,
                                                    color: isActive ? 'var(--sidebar-b-active-text)' : 'var(--sidebar-b-text)',
                                                    backgroundColor: isActive ? 'var(--sidebar-b-active-bg)' : 'transparent',
                                                    fontWeight: isActive ? 600 : 400,
                                                }}
                                            >
                                                {item.icon && (
                                                    <span style={{ marginRight: 10, display: 'flex' }}>
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
