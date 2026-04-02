/**
 * TopNavbar \u2013 thin JSX shell
 *
 * Architecture:
 * - Types, constants, helpers \u2192 topNavbarHelpers.ts
 * - All state, effects, handlers \u2192 useTopNavbarData.tsx
 * - Modal components \u2192 NavbarModals.tsx
 */
import { memo, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, Sun, Moon,
  Globe, Bell, Coins, PanelLeftOpen, PanelLeftClose, Command, Plus, ListChecks,
  ChevronLeft, Search, X
} from 'lucide-react';
import { AppIcon } from './AppIcon';
import ProfileAvatarDropdown from './ProfileAvatarDropdown';
import s from './TopNavbar.module.css';
import { SearchBar } from './SearchBar';
import Breadcrumbs from './Breadcrumbs';
const CommandPalette = lazy(() => import('./CommandPalette'));
import { useTopNavbarData } from './useTopNavbarData';
import { CREATE_MENU_ITEMS, type TopNavbarProps } from './topNavbarHelpers';
import { useBackNavigation } from '../providers/BackNavigationProvider';
import {
  NavbarQuickReviewModal,
  NavbarNotificationsModal,
  NavbarCreditsModal,
} from './NavbarModals';
import { PhotoCompositeFollowUpModal } from './FollowUpModals';
import { MobileSearchOverlay, NAV_INLINE_STYLES } from './TopNavbarMobile';

const TopNavbar = memo(function TopNavbar({ isSidebarOpen, onToggleSidebar, isMobile, onOpenSearchRef }: TopNavbarProps) {
  const d = useTopNavbarData(onOpenSearchRef);
  const { backTarget, goBack, navTitle } = useBackNavigation();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <div className={s.wrapper}>
      {d.commandOpen && (
        <Suspense fallback={null}>
          <CommandPalette isOpen={d.commandOpen} onClose={() => d.setCommandOpen(false)} />
        </Suspense>
      )}
      <nav className={s.nav} data-app-top-navbar="true">
        <div className={s.navContainer} data-mobile={isMobile}>
          {/* ── Mobile layout ── */}
          {isMobile && (
            <>
              {/* Left: back button OR logo */}
              <div className={s.mobileLeft}>
                {backTarget ? (
                  <button
                    className={s.backBtn}
                    onClick={goBack}
                    aria-label={`Terug naar ${backTarget.label}`}
                  >
                    <ChevronLeft size={20} strokeWidth={2.5} className={s.backBtnIcon} />
                    <span className={s.backBtnLabel}>{backTarget.label}</span>
                  </button>
                ) : (
                  <Link
                    to={d.dashboardItem.path}
                    title={d.dashboardItem.label}
                    aria-label={d.dashboardItem.label}
                    className={s.mobileLogoLink}
                  >
                    <img src="/teamreel-icon.svg" alt="TeamReel" className={s.logoImg} />
                  </Link>
                )}
              </div>


            </>
          )}

          {/* ── Desktop layout: left nav ── */}
          <div className={`desktop-nav flex-row gap-4 flex-1 h-full ${s.desktopNavWrap}`}>
            {/* Desktop: back button when navigating a sub-page */}
            {!isMobile && backTarget && (
              <button
                className={s.backBtn}
                onClick={goBack}
                aria-label={`Back to ${backTarget.label}`}
              >
                <ChevronLeft size={18} strokeWidth={2.5} className={s.backBtnIcon} />
                <span className={s.backBtnLabel}>{backTarget.label}</span>
              </button>
            )}

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
          </div>

          {/* Right: User controls */}
          {d.user ? (
            <div className={s.userControls} data-mobile={isMobile}>
              {/* Search Bar */}
              {!isMobile && (
                <div
                  className={`nav-search-container${d.navSearchHasQuery ? ' has-query' : ''} ${s.searchWrap}`}
                >
                  <SearchBar placeholder="Zoeken..." onQueryChange={(q) => d.setNavSearchHasQuery(Boolean(String(q || '').trim()))} />
                </div>
              )}

              {/* Mobile: Search icon */}
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(true)}
                  className={`nav-icon-button ${s.navIconBtn}`}
                  aria-label="Zoeken" title="Zoeken"
                >
                  <AppIcon icon={Search} size={20} />
                </button>
              )}

              {/* Quick Switcher */}
              {!isMobile && (
                <button
                  type="button"
                  onClick={() => d.setCommandOpen(true)}
                  className={`nav-icon-button ${s.quickSwitchBtn}`}
                  title="Quick switch (Ctrl+K)" aria-label="Quick switch"
                >
                  <AppIcon icon={Command} size={18} />
                  <span className="fs-13 fw-800">Quick switch</span>
                  <kbd className={s.kbdHint}>⌘K</kbd>
                </button>
              )}

              {/* + Create CTA */}
              {!isMobile && (
                <div ref={d.createMenuRef as React.LegacyRef<HTMLDivElement>} className={s.createWrap}>
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
              <button
                onClick={d.toggleTheme}
                className={`nav-icon-button ${s.themeBtn}`}
                title={`Wissel naar ${d.currentThemeMode === 'light' ? 'donker' : 'licht'} thema`}
                aria-label={`Wissel naar ${d.currentThemeMode === 'light' ? 'donker' : 'licht'} thema`}
              >
                <AppIcon icon={d.currentThemeMode === 'light' ? Moon : Sun} size={20} />
              </button>

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

              {/* Approvals Icon */}
              <button
                onClick={d.openQuickReview}
                className={`nav-right-fixed nav-icon-button ${s.navIconBtn}`}
                aria-label="Wachtrij" title="Wachtrij"
              >
                <AppIcon icon={ListChecks} size={20} />
                {d.queueBadgeCount > 0 && (
                  <span className={s.badge} style={{ backgroundColor: d.queueBadgeColor }}>{d.queueBadgeCount}</span>
                )}
                {d.queueBadgeCount === 0 && d.hasFailedJobs && (
                  <span className={`${s.badge} ${s.badgeError}`} style={{ width: 8, height: 8, padding: 0 }} />
                )}
              </button>

              {/* Notification Icon */}
              <button
                onClick={() => d.setNotificationsModalOpen(true)}
                className={`nav-right-fixed nav-icon-button ${s.navIconBtn}`}
                aria-label="Meldingen" title="Meldingen"
              >
                <AppIcon icon={Bell} size={20} />
                {d.unreadCount > 0 && (
                  <span className={`${s.badge} ${s.badgeError}`}>{d.unreadCount}</span>
                )}
              </button>

              {/* Credits Icon — desktop only */}
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

              {/* Profile Avatar — desktop only (mobile uses bottom nav Profile tab) */}
              {!isMobile && (
                <div className={`nav-right-fixed ${s.profileWrap}`}>
                  <ProfileAvatarDropdown isMobile={isMobile} onOpenSearch={() => d.setCommandOpen(true)} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-row gap-12">
              <Link to="/login" className={s.signInLink}>Inloggen</Link>
              <Link to="/register" className={s.registerLink}>Registreren</Link>
            </div>
          )}
        </div>

        <style>{NAV_INLINE_STYLES}</style>
      </nav>

      {/* ── Mobile Search Overlay ── */}
      {mobileSearchOpen && (
        <MobileSearchOverlay
          onClose={() => setMobileSearchOpen(false)}
          onQueryChange={(q) => d.setNavSearchHasQuery(Boolean(String(q || '').trim()))}
        />
      )}

      {/* ── Modals ── */}
      {d.quickReviewOpen && (
        <NavbarQuickReviewModal
          queueModalTab={d.queueModalTab}
          setQueueModalTab={d.setQueueModalTab}
          pendingReviewJobs={d.pendingReviewJobs}
          pendingReviewVideoJobs={d.pendingReviewVideoJobs}
          inProgressJobs={d.inProgressJobs}
          inProgressVideoJobs={d.inProgressVideoJobs}
          quickReviewIdx={d.quickReviewIdx}
          setQuickReviewIdx={d.setQuickReviewIdx}
          selectedVariantIdxs={d.selectedVariantIdxs}
          setSelectedVariantIdxs={d.setSelectedVariantIdxs}
          quickReviewBusy={d.quickReviewBusy}
          handleQuickReview={d.handleQuickReview}
          refreshVideoJobs={d.refreshVideoJobs}
          onClose={() => d.setQuickReviewOpen(false)}
          onNavigate={d.navigate}
        />
      )}

      {d.photoCompositeFollowUp && (
        <PhotoCompositeFollowUpModal
          info={d.photoCompositeFollowUp}
          onClose={() => d.setPhotoCompositeFollowUp(null)}
          onSubmitted={() => d.refreshAiJobs()}
        />
      )}

      {d.notificationsModalOpen && (
        <NavbarNotificationsModal
          notificationsList={d.notificationsList}
          activityItems={d.activityItems}
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
});

export default TopNavbar;
