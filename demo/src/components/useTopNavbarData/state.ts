/**
 * State management for useTopNavbarData hook
 */
import { useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useSignOut } from '@django-core/auth-ui';
import { useTheme } from '@django-core/theme-system';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useUserRole } from '../PermissionGuards';
import { useQueueCounts } from '../../hooks/useQueueCounts';
import { useGenerationJobs, type GenerationJob } from '../../hooks/useGenerationJobs';
import type { PhotoCompositeFollowUpInfo } from '../topNavbarHelpers';
import type { NotificationItem, LanguageCode } from './types';

export function useTopNavbarState(quickReviewOpen: boolean) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { signOut, loading: signOutLoading } = useSignOut();
  const { mode, setTheme } = useTheme();
  const { context } = useContextSwitcher();
  const queueCounts = useQueueCounts();
  const { isSystemAdmin, isLandAdmin, isOrgAdmin, hasOrgRole } = useUserRole();

  // ── UI state ──
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>('EN');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [myCreditsBalance, setMyCreditsBalance] = useState<string | null>(null);
  const [navSearchHasQuery, setNavSearchHasQuery] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [queueModalTab, setQueueModalTab] = useState<'review' | 'in-progress'>('review');
  const [quickReviewIdx, setQuickReviewIdx] = useState(0);
  const [quickReviewBusy, setQuickReviewBusy] = useState(false);
  const [selectedVariantIdxs, setSelectedVariantIdxs] = useState<Set<number>>(new Set());
  const [photoCompositeFollowUp, setPhotoCompositeFollowUp] = useState<PhotoCompositeFollowUpInfo | null>(null);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // ── Refs ──
  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDropdownHoveredRef = useRef(false);

  // ── Quick-review jobs ──
  const { jobs: allAiJobs, refresh: refreshAiJobs } = useGenerationJobs({
    pollInterval: quickReviewOpen ? 5000 : 30000,
  });

  const pendingReviewJobs = useMemo(() =>
    allAiJobs.filter(j => j.status === 'completed' && (j.approval_status === 'pending_review' || !j.approval_status)),
    [allAiJobs],
  );

  const inProgressJobs = useMemo(() =>
    allAiJobs.filter(j => j.status === 'queued' || j.status === 'processing' || j.status === 'retrying'),
    [allAiJobs],
  );

  const isAdmin = isSystemAdmin || isLandAdmin;
  const currentThemeMode = mode || 'light';
  const orgIdForMyBalance = String(context?.organisation?.id || '').trim();
  const currentUserId = user?.id;

  return {
    // Core hooks returns
    location, navigate, user, signOut, signOutLoading,
    mode, setTheme, context, queueCounts,
    isSystemAdmin, isLandAdmin, isOrgAdmin, hasOrgRole, isAdmin,
    currentThemeMode, orgIdForMyBalance, currentUserId,

    // UI state
    openDropdown, setOpenDropdown,
    mobileMenuOpen, setMobileMenuOpen,
    language, setLanguage,
    languageMenuOpen, setLanguageMenuOpen,
    unreadCount, setUnreadCount,
    myCreditsBalance, setMyCreditsBalance,
    navSearchHasQuery, setNavSearchHasQuery,
    commandOpen, setCommandOpen,
    createMenuOpen, setCreateMenuOpen,
    queueModalTab, setQueueModalTab,
    quickReviewIdx, setQuickReviewIdx,
    quickReviewBusy, setQuickReviewBusy,
    selectedVariantIdxs, setSelectedVariantIdxs,
    photoCompositeFollowUp, setPhotoCompositeFollowUp,
    notificationsModalOpen, setNotificationsModalOpen,
    notificationsList, setNotificationsList,
    creditsModalOpen, setCreditsModalOpen,
    isTouchDevice, setIsTouchDevice,

    // Refs
    createMenuRef, closeTimerRef, isDropdownHoveredRef,

    // Jobs
    pendingReviewJobs, inProgressJobs, refreshAiJobs,
  };
}
