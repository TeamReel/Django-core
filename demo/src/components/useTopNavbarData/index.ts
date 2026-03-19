/**
 * useTopNavbarData — Orchestrator hook for TopNavbar component.
 * Split into focused modules for maintainability.
 */
import { useState } from 'react';
import { useTopNavbarState } from './state';
import { useTopNavbarDerived } from './derived';
import { useTopNavbarEffects } from './effects';
import { useTopNavbarHandlers } from './handlers';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import type { UseTopNavbarDataReturn } from './types';

export type { UseTopNavbarDataReturn } from './types';

export function useTopNavbarData(onOpenSearchRef?: (fn: () => void) => void): UseTopNavbarDataReturn {
  // Quick review open needs to be lifted for state hook polling interval
  const [quickReviewOpen, setQuickReviewOpen] = useState(false);

  const state = useTopNavbarState(quickReviewOpen);

  const derived = useTopNavbarDerived(
    state.location.pathname,
    state.myCreditsBalance,
    state.isAdmin,
    state.isSystemAdmin,
    state.isOrgAdmin,
  );

  useTopNavbarEffects({
    user: state.user,
    location: state.location,
    orgIdForMyBalance: state.orgIdForMyBalance,
    languageMenuOpen: state.languageMenuOpen,
    createMenuOpen: state.createMenuOpen,
    createMenuRef: state.createMenuRef,
    onOpenSearchRef,
    setCommandOpen: state.setCommandOpen,
    setLanguage: state.setLanguage,
    setLanguageMenuOpen: state.setLanguageMenuOpen,
    setUnreadCount: state.setUnreadCount,
    setNotificationsList: state.setNotificationsList,
    setMyCreditsBalance: state.setMyCreditsBalance,
    setCreateMenuOpen: state.setCreateMenuOpen,
  });

  const handlers = useTopNavbarHandlers({
    pendingReviewJobs: state.pendingReviewJobs,
    quickReviewIdx: state.quickReviewIdx,
    quickReviewBusy: state.quickReviewBusy,
    selectedVariantIdxs: state.selectedVariantIdxs,
    queueCounts: state.queueCounts,
    mode: state.currentThemeMode,
    setTheme: state.setTheme,
    setLanguage: state.setLanguage,
    setLanguageMenuOpen: state.setLanguageMenuOpen,
    setQueueModalTab: state.setQueueModalTab,
    setQuickReviewIdx: state.setQuickReviewIdx,
    setSelectedVariantIdxs: state.setSelectedVariantIdxs,
    setQuickReviewOpen,
    setQuickReviewBusy: state.setQuickReviewBusy,
    setPhotoCompositeFollowUp: state.setPhotoCompositeFollowUp,
    refreshAiJobs: state.refreshAiJobs,
  });

  // Badge priority: review (needs action) → active (in progress)
  const queueBadgeCount = state.queueCounts.review > 0 ? state.queueCounts.review : state.queueCounts.active;
  const queueBadgeColor = state.queueCounts.review > 0 ? 'var(--app-error)' : 'var(--color-amber-400)';
  const hasFailedJobs = state.queueCounts.rejected > 0;

  // Activity feed (B62) — only for org admins / coaches
  const showActivityTab = state.isOrgAdmin || state.hasOrgRole;
  const { items: activityItems } = useActivityFeed({
    organisationId: state.orgIdForMyBalance,
    pageSize: 10,
    enabled: showActivityTab && !!state.orgIdForMyBalance,
  });

  return {
    // Auth / roles
    user: state.user,
    signOut: state.signOut,
    signOutLoading: state.signOutLoading,
    isSystemAdmin: state.isSystemAdmin,
    isLandAdmin: state.isLandAdmin,
    isOrgAdmin: state.isOrgAdmin,
    hasOrgRole: state.hasOrgRole,
    isAdmin: state.isAdmin,
    // Navigation
    location: state.location,
    navigate: state.navigate,
    showBreadcrumbs: derived.showBreadcrumbs,
    // Theme
    currentThemeMode: state.currentThemeMode,
    toggleTheme: handlers.toggleTheme,
    // Dashboard item
    dashboardItem: derived.dashboardItem,
    // Mobile
    mobileMenuOpen: state.mobileMenuOpen,
    setMobileMenuOpen: state.setMobileMenuOpen,
    // Language
    language: state.language,
    languageMenuOpen: state.languageMenuOpen,
    setLanguageMenuOpen: state.setLanguageMenuOpen,
    handleLanguageChange: handlers.handleLanguageChange,
    // Search
    navSearchHasQuery: state.navSearchHasQuery,
    setNavSearchHasQuery: state.setNavSearchHasQuery,
    commandOpen: state.commandOpen,
    setCommandOpen: state.setCommandOpen,
    // Create menu
    createMenuOpen: state.createMenuOpen,
    setCreateMenuOpen: state.setCreateMenuOpen,
    createMenuRef: state.createMenuRef,
    // Queue / quick-review
    queueCounts: state.queueCounts,
    queueBadgeCount,
    queueBadgeColor,
    hasFailedJobs,
    quickReviewOpen,
    setQuickReviewOpen,
    openQuickReview: handlers.openQuickReview,
    queueModalTab: state.queueModalTab,
    setQueueModalTab: state.setQueueModalTab,
    quickReviewIdx: state.quickReviewIdx,
    setQuickReviewIdx: state.setQuickReviewIdx,
    quickReviewBusy: state.quickReviewBusy,
    selectedVariantIdxs: state.selectedVariantIdxs,
    setSelectedVariantIdxs: state.setSelectedVariantIdxs,
    pendingReviewJobs: state.pendingReviewJobs,
    pendingReviewVideoJobs: state.pendingReviewVideoJobs,
    inProgressJobs: state.inProgressJobs,
    inProgressVideoJobs: state.inProgressVideoJobs,
    refreshAiJobs: state.refreshAiJobs,
    refreshVideoJobs: state.refreshVideoJobs,
    handleQuickReview: handlers.handleQuickReview,
    // Photo composite follow-up
    photoCompositeFollowUp: state.photoCompositeFollowUp,
    setPhotoCompositeFollowUp: state.setPhotoCompositeFollowUp,
    // Notifications
    unreadCount: state.unreadCount,
    notificationsModalOpen: state.notificationsModalOpen,
    setNotificationsModalOpen: state.setNotificationsModalOpen,
    notificationsList: state.notificationsList,
    // Credits
    myCreditsBalance: state.myCreditsBalance,
    formattedCredits: derived.formattedCredits,
    creditsBadgeColor: derived.creditsBadgeColor,
    creditsTooltip: derived.creditsTooltip,
    creditsModalOpen: state.creditsModalOpen,
    setCreditsModalOpen: state.setCreditsModalOpen,
    // Activity feed (B62)
    activityItems,
  };
}
