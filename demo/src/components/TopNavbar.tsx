/**
 * TopNavbar \u2013 thin JSX shell
 *
 * Architecture:
 * - Types, constants, helpers \u2192 topNavbarHelpers.ts
 * - All state, effects, handlers \u2192 useTopNavbarData.tsx
 * - Modal components \u2192 NavbarModals.tsx
 */
import { Link } from 'react-router-dom';
import {
  Menu, ChevronDown, ChevronUp, Sun, Moon,
  Globe, Bell, Coins, PanelLeftOpen, PanelLeftClose, Command, Plus, ListChecks
} from 'lucide-react';
import { AppIcon } from './AppIcon';
import ProfileAvatarDropdown from './ProfileAvatarDropdown';
import s from './TopNavbar.module.css';
import { SearchBar } from './SearchBar';
import Breadcrumbs from './Breadcrumbs';
import CommandPalette from './CommandPalette';
import { useTopNavbarData } from './useTopNavbarData';
import { getColumnCount, CREATE_MENU_ITEMS, type TopNavbarProps } from './topNavbarHelpers';
import {
  NavbarPhotoCompositeFollowUpModal,
  NavbarQuickReviewModal,
  NavbarNotificationsModal,
  NavbarCreditsModal,
} from './NavbarModals';

export default function TopNavbar({ isSidebarOpen, onToggleSidebar, isMobile, onOpenSearchRef }: TopNavbarProps) {
  const d = useTopNavbarData(onOpenSearchRef);

  return (
    <div className={s.wrapper}>
      <CommandPalette isOpen={d.commandOpen} onClose={() => d.setCommandOpen(false)} />
      <nav className={s.nav}>
        <div className={s.navContainer} data-mobile={isMobile}>
          {/* Mobile hamburger */}
          {isMobile && (
            <button
              className={`${s.mobileMenuBtn} mobile-menu-button`}
              onClick={onToggleSidebar}
              aria-label="Toggle menu"
            >
              <AppIcon icon={Menu} size={22} strokeWidth={2.5} />
            </button>
          )}

          {/* Left: Navigation items */}
          <div className={`desktop-nav flex-row gap-4 flex-1 h-full ${s.desktopNavWrap}`}>
            {/* Logo */}
            <Link
              to={d.dashboardItem.path}
              title={d.dashboardItem.label}
              aria-label={d.dashboardItem.label}
              className={`nav-icon-button ${s.logoLink}`}
            >
              <img src="/teamreel-icon.svg" alt="TeamReel" className={s.logoImg} />
            </Link>

            {/* Breadcrumbs */}
            {d.showBreadcrumbs ? <Breadcrumbs /> : null}

            {/* Group triggers */}
            {d.filteredNavGroups.map(group => {
              const isActive = d.isGroupActive(group);
              const isOpen = d.openDropdown === group.id;

              return (
                <div key={group.id} className={`nav-dropdown-container ${s.dropdownContainer}`}>
                  <button
                    onClick={(e) => d.handleClickTrigger(group.id, e)}
                    onKeyDown={(e) => d.handleKeyDown(group.id, e)}
                    onMouseEnter={() => d.handleMouseEnterTrigger(group.id)}
                    onMouseLeave={() => d.handleMouseLeaveTrigger(group.id)}
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    aria-controls="mega-menu-panel"
                    className={s.groupTrigger}
                    data-active={isActive}
                    data-open={isOpen}
                  >
                    <span>{group.label}</span>
                    <AppIcon icon={isOpen ? ChevronUp : ChevronDown} size={12} />
                  </button>

                  {/* Mega Menu Panel */}
                  {isOpen && (
                    <div
                      id={`mega-menu-panel-${group.id}`}
                      role="menu"
                      onMouseEnter={() => d.handleMouseEnterDropdown(group.id)}
                      onMouseLeave={() => d.handleMouseLeaveDropdown(group.id)}
                      className={s.megaPanel}
                    >
                      <div className={s.megaPanelInner}>
                        <div className={`grid ${s.megaGrid}`} style={{
                          gridTemplateColumns: `repeat(${getColumnCount(group.items.length)}, minmax(0, 1fr))`,
                        }}>
                          {group.items.map((item) => (
                            <Link
                              key={item.path}
                              to={item.path}
                              role="menuitem"
                              onClick={() => d.setOpenDropdown(null)}
                              className={s.megaItem}
                              data-active={d.isItemActive(item.path)}
                            >
                              {item.icon && <span className={s.megaItemIcon}><AppIcon icon={item.icon} size={16} /></span>}
                              <div className={s.megaItemTextWrap}>
                                <span className={s.megaItemLabel}>{item.label}</span>
                                {item.description && <span className={s.megaItemDescription}>{item.description}</span>}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: User controls */}
          {d.user ? (
            <div className={s.userControls} data-mobile={isMobile}>
              {/* Search Bar */}
              {!isMobile && (
                <div
                  className={`nav-search-container${d.navSearchHasQuery ? ' has-query' : ''} ${s.searchWrap}`}
                >
                  <SearchBar placeholder="Search..." onQueryChange={(q) => d.setNavSearchHasQuery(Boolean(String(q || '').trim()))} />
                </div>
              )}

              {/* Quick Switcher */}
              {!isMobile && (
                <button
                  type="button"
                  onClick={() => d.setCommandOpen(true)}
                  className={`nav-icon-button ${s.quickSwitchBtn}`}
                  title="Quick switch" aria-label="Quick switch"
                >
                  <AppIcon icon={Command} size={18} />
                  <span className="fs-13 fw-800">Quick switch</span>
                </button>
              )}

              {/* + Create CTA */}
              {!isMobile && (
                <div ref={d.createMenuRef} className={s.createWrap}>
                  <button
                    type="button"
                    onClick={() => d.navigate('/content')}
                    className={`nav-icon-button ${s.createMainBtn}`}
                    title="Create content" aria-label="Create content"
                    data-open={d.createMenuOpen}
                  >
                    <AppIcon icon={Plus} size={18} />
                    <span className="fs-13 fw-800">Create</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => d.setCreateMenuOpen((v) => !v)}
                    className={`nav-icon-button ${s.createChevronBtn}`}
                    title="More create options" aria-label="More create options"
                    data-open={d.createMenuOpen}
                  >
                    <AppIcon icon={d.createMenuOpen ? ChevronUp : ChevronDown} size={12} />
                  </button>

                  {d.createMenuOpen && (
                    <div className={s.createDropdown}>
                      {CREATE_MENU_ITEMS.map((item) => (
                        <button
                          key={item.path}
                          type="button"
                          onClick={() => { d.setCreateMenuOpen(false); d.navigate(item.path); }}
                          className={s.createMenuItem}
                        >
                          <span className="fs-14 fw-700">{item.label}</span>
                          <span className="fs-12 text-muted">{item.hint}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Theme Toggle */}
              {!isMobile && (
                <button
                  onClick={d.toggleTheme}
                  className={`nav-icon-button ${s.themeBtn}`}
                  title={`Switch to ${d.currentThemeMode === 'light' ? 'dark' : 'light'} mode`}
                  aria-label={`Switch to ${d.currentThemeMode === 'light' ? 'dark' : 'light'} mode`}
                >
                  <AppIcon icon={d.currentThemeMode === 'light' ? Moon : Sun} size={20} />
                </button>
              )}

              {/* Language Switcher */}
              {!isMobile && (
                <div className="language-menu-container relative">
                  <button
                    onClick={() => d.setLanguageMenuOpen(!d.languageMenuOpen)}
                    className={`nav-icon-button ${s.langBtn}`}
                    aria-label="Select language"
                  >
                    <AppIcon icon={Globe} size={16} /> {d.language} <AppIcon icon={d.languageMenuOpen ? ChevronUp : ChevronDown} size={10} />
                  </button>
                  {d.languageMenuOpen && (
                    <div className={s.langDropdown}>
                      {(['EN', 'NL', 'DE', 'IT', 'FR'] as const).map(lang => (
                        <button
                          key={lang}
                          onClick={() => d.handleLanguageChange(lang)}
                          className={s.langItem}
                          data-selected={d.language === lang}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Queue Icon */}
              <button
                onClick={d.openQuickReview}
                className={`nav-right-fixed nav-icon-button ${s.navIconBtn}`}
                aria-label="Queue" title="Queue"
              >
                <AppIcon icon={ListChecks} size={20} />
                {d.queueBadgeCount > 0 && (
                  <span className={s.badge} style={{ backgroundColor: d.queueBadgeColor }}>{d.queueBadgeCount}</span>
                )}
              </button>

              {/* Notification Icon */}
              <button
                onClick={() => d.setNotificationsModalOpen(true)}
                className={`nav-right-fixed nav-icon-button ${s.navIconBtn}`}
                aria-label="Notifications" title="Notifications"
              >
                <AppIcon icon={Bell} size={20} />
                {d.unreadCount > 0 && (
                  <span className={`${s.badge} ${s.badgeError}`}>{d.unreadCount}</span>
                )}
              </button>

              {/* Credits Icon */}
              {!isMobile && d.user ? (
                <button
                  className={`nav-credits-button nav-icon-button ${s.creditsBtn}`}
                  onClick={() => d.setCreditsModalOpen(true)}
                  title={d.creditsTooltip} aria-label="My balance"
                >
                  <AppIcon icon={Coins} size={20} />
                  {d.formattedCredits != null && (
                    <span className={s.badge} style={{ backgroundColor: d.creditsBadgeColor }}>{d.formattedCredits}</span>
                  )}
                </button>
              ) : null}

              {/* Profile Avatar */}
              <div className={`nav-right-fixed ${s.profileWrap}`}>
                <ProfileAvatarDropdown isMobile={isMobile} onOpenSearch={() => d.setCommandOpen(true)} />
              </div>
            </div>
          ) : (
            <div className="flex-row gap-12">
              <Link to="/login" className={s.signInLink}>Sign in</Link>
              <Link to="/register" className={s.registerLink}>Register</Link>
            </div>
          )}
        </div>

        <style>{`
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
        `}</style>
      </nav>

      {/* Mobile menu overlay */}
      {d.mobileMenuOpen && (
        <div className={s.mobileOverlay}>
          <Link
            to={d.dashboardItem.path}
            className={s.mobileDashLink}
            data-active={d.isItemActive(d.dashboardItem.path)}
          >
            <AppIcon icon={d.dashboardItem.icon} size={16} />
            <span>{d.dashboardItem.label}</span>
          </Link>
          {d.filteredNavGroups.map(group => (
            <div key={group.id} className="mb-16">
              <div className={s.mobileGroupLabel}>{group.label}</div>
              {group.items.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={s.mobileGroupItem}
                  data-active={d.isItemActive(item.path)}
                >
                  {item.icon && <AppIcon icon={item.icon} size={16} />}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
          {d.user && (
            <div className="border-top mt-16 p-16">
              <ProfileAvatarDropdown />
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {d.quickReviewOpen && (
        <NavbarQuickReviewModal
          queueModalTab={d.queueModalTab}
          setQueueModalTab={d.setQueueModalTab}
          pendingReviewJobs={d.pendingReviewJobs}
          inProgressJobs={d.inProgressJobs}
          quickReviewIdx={d.quickReviewIdx}
          setQuickReviewIdx={d.setQuickReviewIdx}
          selectedVariantIdxs={d.selectedVariantIdxs}
          setSelectedVariantIdxs={d.setSelectedVariantIdxs}
          quickReviewBusy={d.quickReviewBusy}
          handleQuickReview={d.handleQuickReview}
          onClose={() => d.setQuickReviewOpen(false)}
          onNavigate={d.navigate}
        />
      )}

      {d.photoCompositeFollowUp && (
        <NavbarPhotoCompositeFollowUpModal
          info={d.photoCompositeFollowUp}
          onClose={() => d.setPhotoCompositeFollowUp(null)}
          onSubmitted={() => d.refreshAiJobs()}
        />
      )}

      {d.notificationsModalOpen && (
        <NavbarNotificationsModal
          notificationsList={d.notificationsList}
          onClose={() => d.setNotificationsModalOpen(false)}
          onNavigate={d.navigate}
        />
      )}

      {d.creditsModalOpen && (
        <NavbarCreditsModal
          myCreditsBalance={d.myCreditsBalance}
          onClose={() => d.setCreditsModalOpen(false)}
          onNavigate={d.navigate}
        />
      )}
    </div>
  );
}
