/**
 * State management for useTopNavbarData hook
 */
import { useRef, useMemo, useReducer, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useSignOut } from '@django-core/auth-ui';
import { useTheme } from '@django-core/theme-system';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useUserRole } from '../PermissionGuards';
import { useQueueCounts } from '../../hooks/useQueueCounts';
import { useGenerationJobs, type GenerationJob } from '../../hooks/useGenerationJobs';
import { videoApi } from '../../api';
import { formReducer, makeSetter } from '../../utils/formReducer';
import type { VideoJob } from '../../types/api';
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
  interface NavbarState {
    mobileMenuOpen: boolean;
    language: LanguageCode;
    languageMenuOpen: boolean;
    unreadCount: number;
    myCreditsBalance: string | null;
    navSearchHasQuery: boolean;
    commandOpen: boolean;
    createMenuOpen: boolean;
    queueModalTab: 'review' | 'in-progress';
    quickReviewIdx: number;
    quickReviewBusy: boolean;
    selectedVariantIdxs: Set<number>;
    photoCompositeFollowUp: PhotoCompositeFollowUpInfo | null;
    notificationsModalOpen: boolean;
    notificationsList: NotificationItem[];
    creditsModalOpen: boolean;
  }

  const [s, dispatch] = useReducer(formReducer<NavbarState>, {
    mobileMenuOpen: false,
    language: 'EN' as LanguageCode,
    languageMenuOpen: false,
    unreadCount: 0,
    myCreditsBalance: null,
    navSearchHasQuery: false,
    commandOpen: false,
    createMenuOpen: false,
    queueModalTab: 'review' as const,
    quickReviewIdx: 0,
    quickReviewBusy: false,
    selectedVariantIdxs: new Set<number>(),
    photoCompositeFollowUp: null,
    notificationsModalOpen: false,
    notificationsList: [],
    creditsModalOpen: false,
  });

  const setMobileMenuOpen          = useMemo(() => makeSetter(dispatch, 'mobileMenuOpen'), [dispatch]);
  const setLanguage                = useMemo(() => makeSetter(dispatch, 'language'), [dispatch]);
  const setLanguageMenuOpen        = useMemo(() => makeSetter(dispatch, 'languageMenuOpen'), [dispatch]);
  const setUnreadCount             = useMemo(() => makeSetter(dispatch, 'unreadCount'), [dispatch]);
  const setMyCreditsBalance        = useMemo(() => makeSetter(dispatch, 'myCreditsBalance'), [dispatch]);
  const setNavSearchHasQuery       = useMemo(() => makeSetter(dispatch, 'navSearchHasQuery'), [dispatch]);
  const setCommandOpen             = useMemo(() => makeSetter(dispatch, 'commandOpen'), [dispatch]);
  const setCreateMenuOpen          = useMemo(() => makeSetter(dispatch, 'createMenuOpen'), [dispatch]);
  const setQueueModalTab           = useMemo(() => makeSetter(dispatch, 'queueModalTab'), [dispatch]);
  const setQuickReviewIdx          = useMemo(() => makeSetter(dispatch, 'quickReviewIdx'), [dispatch]);
  const setQuickReviewBusy         = useMemo(() => makeSetter(dispatch, 'quickReviewBusy'), [dispatch]);
  const setSelectedVariantIdxs     = useMemo(() => makeSetter(dispatch, 'selectedVariantIdxs'), [dispatch]);
  const setPhotoCompositeFollowUp  = useMemo(() => makeSetter(dispatch, 'photoCompositeFollowUp'), [dispatch]);
  const setNotificationsModalOpen  = useMemo(() => makeSetter(dispatch, 'notificationsModalOpen'), [dispatch]);
  const setNotificationsList       = useMemo(() => makeSetter(dispatch, 'notificationsList'), [dispatch]);
  const setCreditsModalOpen        = useMemo(() => makeSetter(dispatch, 'creditsModalOpen'), [dispatch]);

  // ── Refs ──
  const createMenuRef = useRef<HTMLDivElement | null>(null);

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

  // ── Video jobs (in-progress + pending review) ──
  const [inProgressVideoJobs, setInProgressVideoJobs] = useState<VideoJob[]>([]);
  const [pendingReviewVideoJobs, setPendingReviewVideoJobs] = useState<VideoJob[]>([]);
  const videoJobPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchVideoJobs = useCallback(async () => {
    if (document.hidden) return;
    try {
      const [queued, processing, completed] = await Promise.all([
        videoApi.listJobs({ ordering: '-created_at' }, { params: { status: 'queued' } }),
        videoApi.listJobs({ ordering: '-created_at' }, { params: { status: 'processing' } }),
        videoApi.listJobs({ ordering: '-created_at' }, { params: { status: 'completed' } }),
      ]);
      setInProgressVideoJobs([...processing.results, ...queued.results]);
      setPendingReviewVideoJobs(
        completed.results.filter(j => j.workflow_instance?.current_state === 'ready_for_review'),
      );
    } catch { /* silently ignore — don't break the navbar */ }
  }, []);

  useEffect(() => {
    fetchVideoJobs();
    const interval = quickReviewOpen ? 5000 : 30000;
    videoJobPollRef.current = setInterval(fetchVideoJobs, interval);
    return () => { if (videoJobPollRef.current) clearInterval(videoJobPollRef.current); };
  }, [quickReviewOpen, fetchVideoJobs]);

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
    mobileMenuOpen: s.mobileMenuOpen, setMobileMenuOpen,
    language: s.language, setLanguage,
    languageMenuOpen: s.languageMenuOpen, setLanguageMenuOpen,
    unreadCount: s.unreadCount, setUnreadCount,
    myCreditsBalance: s.myCreditsBalance, setMyCreditsBalance,
    navSearchHasQuery: s.navSearchHasQuery, setNavSearchHasQuery,
    commandOpen: s.commandOpen, setCommandOpen,
    createMenuOpen: s.createMenuOpen, setCreateMenuOpen,
    queueModalTab: s.queueModalTab, setQueueModalTab,
    quickReviewIdx: s.quickReviewIdx, setQuickReviewIdx,
    quickReviewBusy: s.quickReviewBusy, setQuickReviewBusy,
    selectedVariantIdxs: s.selectedVariantIdxs, setSelectedVariantIdxs,
    photoCompositeFollowUp: s.photoCompositeFollowUp, setPhotoCompositeFollowUp,
    notificationsModalOpen: s.notificationsModalOpen, setNotificationsModalOpen,
    notificationsList: s.notificationsList, setNotificationsList,
    creditsModalOpen: s.creditsModalOpen, setCreditsModalOpen,

    // Refs
    createMenuRef,

    // Jobs
    pendingReviewJobs, pendingReviewVideoJobs,
    inProgressJobs, inProgressVideoJobs,
    refreshAiJobs, refreshVideoJobs: fetchVideoJobs,
  };
}
