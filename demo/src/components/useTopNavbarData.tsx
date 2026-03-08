import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useSignOut } from '@django-core/auth-ui';
import { useTheme } from '@django-core/theme-system';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Home } from 'lucide-react';
import { useUserRole } from './PermissionGuards';
import { getApiBaseUrl } from '../utils/apiBase';
import { useQueueCounts } from '../hooks/useQueueCounts';
import { useGenerationJobs, reviewJob } from '../hooks/useGenerationJobs';
import {
    navGroups,
    checkIsNonAppRoute,
    isItemActive as checkItemActive,
    isGroupActive as checkGroupActive,
    type NavGroup,
    type NotificationResponse,
    type PhotoCompositeFollowUpInfo,
} from './topNavbarHelpers';

/* ─── Hook ──────────────────────────────────────────────────── */

export function useTopNavbarData(onOpenSearchRef?: (fn: () => void) => void) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { signOut, loading: signOutLoading } = useSignOut();
    const { mode, setTheme } = useTheme();
    const { context } = useContextSwitcher();
    const queueCounts = useQueueCounts();
    const queueBadgeCount = queueCounts.review > 0 ? queueCounts.review : queueCounts.active;
    const queueBadgeColor = queueCounts.review > 0 ? 'var(--app-error)' : 'var(--color-amber-400)';

    const debugLog = (...args: unknown[]) => {
    };

    const { isSystemAdmin, isLandAdmin, isOrgAdmin, hasOrgRole } = useUserRole();
    const isAdmin = isSystemAdmin || isLandAdmin;

    // ── UI state ──
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [language, setLanguage] = useState<'EN' | 'NL' | 'DE' | 'IT' | 'FR'>('EN');
    const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [myCreditsBalance, setMyCreditsBalance] = useState<string | null>(null);
    const [navSearchHasQuery, setNavSearchHasQuery] = useState(false);
    const [commandOpen, setCommandOpen] = useState(false);
    const [createMenuOpen, setCreateMenuOpen] = useState(false);
    const [quickReviewOpen, setQuickReviewOpen] = useState(false);
    const [queueModalTab, setQueueModalTab] = useState<'review' | 'in-progress'>('review');
    const [quickReviewIdx, setQuickReviewIdx] = useState(0);
    const [quickReviewBusy, setQuickReviewBusy] = useState(false);
    const [selectedVariantIdxs, setSelectedVariantIdxs] = useState<Set<number>>(new Set());
    const [photoCompositeFollowUp, setPhotoCompositeFollowUp] = useState<PhotoCompositeFollowUpInfo | null>(null);
    const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
    const [notificationsList, setNotificationsList] = useState<Array<{ id: string; title?: string; message: string; is_read: boolean; read?: boolean; action_url?: string | null; created_at: string }>>([]);
    const [creditsModalOpen, setCreditsModalOpen] = useState(false);

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

    // ── Refs ──
    const createMenuRef = useRef<HTMLDivElement | null>(null);
    const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const hoverTimerRef = useRef<Record<string, number>>({});
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDropdownHoveredRef = useRef(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const currentThemeMode = mode || 'light';

    // ── Derived / computed ──
    const isNonAppRoute = checkIsNonAppRoute(location.pathname);
    const showBreadcrumbs = !isNonAppRoute;

    const orgIdForMyBalance = String((context as any)?.organisation?.id || '').trim();
    const currentUserId = (user as any)?.id;

    const myCreditsNumber = useMemo(() => {
        if (myCreditsBalance == null) return null;
        const n = Number(myCreditsBalance);
        return Number.isFinite(n) ? n : null;
    }, [myCreditsBalance]);

    const formattedCredits = useMemo(() => {
        if (myCreditsBalance == null) return null;
        const n = Number(myCreditsBalance);
        if (!Number.isFinite(n)) return String(myCreditsBalance);
        const rounded = Math.round(n);
        if (Math.abs(n - rounded) < 0.001) return String(rounded);
        return n.toFixed(2);
    }, [myCreditsBalance]);

    const creditsBadgeColor = useMemo(() => {
        if (myCreditsNumber == null) return 'var(--app-muted-text)';
        if (myCreditsNumber < 0) return 'var(--app-error)';
        if (myCreditsNumber === 0) return 'var(--color-blue-600)';
        return '#16a34a';
    }, [myCreditsNumber]);

    const creditsTooltip = useMemo(() => {
        if (myCreditsBalance == null) return 'My balance';
        return `Credits: ${String(myCreditsBalance)}`;
    }, [myCreditsBalance]);

    const navGroupsWithApp = useMemo(() => [...navGroups], []);

    const filteredNavGroups = navGroupsWithApp.map(group => {
        const items = group.items.filter(item => {
            if (group.id === 'admin') return isAdmin;
            if (['/credits', '/audit', '/users'].includes(item.path)) return isSystemAdmin || isOrgAdmin;
            if (['/docs', '/deployment'].includes(item.path)) return isAdmin;
            return true;
        });
        return { ...group, items };
    }).filter(group => group.items.length > 0);

    const dashboardItem = { path: '/dashboard', label: 'Dashboard', icon: Home };

    const isItemActiveFn = (path: string): boolean => checkItemActive(location.pathname, path);
    const isGroupActiveFn = (group: NavGroup): boolean => checkGroupActive(location.pathname, group);

    // ── Effects ──

    // Provide openSearch to parent
    useEffect(() => {
        if (onOpenSearchRef) {
            onOpenSearchRef(() => setCommandOpen(true));
        }
    }, [onOpenSearchRef]);

    // Detect touch device
    useEffect(() => {
        const checkTouch = () => {
            setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
        };
        checkTouch();
        window.addEventListener('touchstart', checkTouch, { once: true });
    }, []);

    // Close Create menu on outside click
    useEffect(() => {
        if (!createMenuOpen) return;
        const onDown = (e: MouseEvent) => {
            const el = createMenuRef.current;
            if (!el) return;
            if (!el.contains(e.target as Node)) setCreateMenuOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [createMenuOpen]);

    // Load language from localStorage
    useEffect(() => {
        const savedLang = localStorage.getItem('demo_language') as 'EN' | 'NL' | 'DE';
        if (savedLang) setLanguage(savedLang);
    }, []);

    // Fetch unread notification count
    useEffect(() => {
        if (!user) return;
        const fetchUnreadCount = async () => {
            if (document.hidden) return; // Don't poll while tab is hidden
            try {
                const apiBaseUrl = getApiBaseUrl();
                debugLog('[TopNavbar] Fetching notifications from:', `${apiBaseUrl}/api/v1/user-notifications/`);
                const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/`, { credentials: 'include' });
                if (response.ok) {
                    const data: NotificationResponse = await response.json();
                    debugLog('[TopNavbar] Notifications API response:', data);
                    const notifications = data.results
                        || (data as any).data?.results
                        || (data as any).data?.data
                        || (data as any).data
                        || [];
                    debugLog('[TopNavbar] Parsed notifications:', notifications);
                    const unread = Array.isArray(notifications) ? notifications.filter(n => !n.is_read).length : 0;
                    debugLog('[TopNavbar] Unread count:', unread);
                    setUnreadCount(unread);
                    if (Array.isArray(notifications)) {
                        setNotificationsList(notifications.slice(0, 10).map((n: any) => ({
                            id: n.id,
                            title: n.title || '',
                            message: n.message || n.content || 'Notification',
                            is_read: n.is_read ?? false,
                            read: n.is_read ?? false,
                            action_url: n.action_url || null,
                            created_at: n.created_at || new Date().toISOString(),
                        })));
                    }
                } else {
                    console.error('[TopNavbar] Notifications API error:', response.status, response.statusText);
                }
            } catch (err) {
              console.error(err);
                console.error('Failed to fetch notification count:', err);
            }
        };
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        const handleNotificationChange = () => fetchUnreadCount();
        const handleVisibility = () => { if (!document.hidden) fetchUnreadCount(); };
        window.addEventListener('notificationChanged', handleNotificationChange);
        document.addEventListener('visibilitychange', handleVisibility);
        return () => { clearInterval(interval); window.removeEventListener('notificationChanged', handleNotificationChange); document.removeEventListener('visibilitychange', handleVisibility); };
    }, [user]);

    // Reset badge counts when navigating to the full-page equivalents
    useEffect(() => {
        if (location.pathname === '/notifications' || location.pathname.startsWith('/notifications/')) {
            setUnreadCount(0);
        }
    }, [location.pathname]);

    // Fetch credits balance
    useEffect(() => {
        if (!user) { setMyCreditsBalance(null); return; }
        if (!orgIdForMyBalance) { setMyCreditsBalance(null); return; }
        let cancelled = false;
        const controller = new AbortController();
        const fetchBalance = async () => {
            if (document.hidden) return; // Don't poll while tab is hidden
            try {
                const apiBaseUrl = getApiBaseUrl();
                const response = await fetch(
                    `${apiBaseUrl}/api/v1/transactions/organizations/${encodeURIComponent(orgIdForMyBalance)}/balance/me/`,
                    { credentials: 'include', signal: controller.signal }
                );
                if (!response.ok) return;
                const raw = await response.json();
                const data = (raw as any)?.data ?? raw;
                const v = (data as any)?.current_balance;
                if (!cancelled) setMyCreditsBalance(v != null ? String(v) : null);
            } catch { /* ignore */ }
        };
        fetchBalance();
        const interval = setInterval(fetchBalance, 30000);
        return () => { cancelled = true; controller.abort(); clearInterval(interval); };
    }, [orgIdForMyBalance, user]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (openDropdown && !target.closest('.nav-dropdown-container') && !target.closest('#mega-menu-panel')) {
                setOpenDropdown(null);
            }
            if (languageMenuOpen && !target.closest('.language-menu-container')) {
                setLanguageMenuOpen(false);
            }
        };
        if (openDropdown || languageMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [openDropdown, languageMenuOpen]);

    // Close dropdown / mobile menu on route change
    useEffect(() => { setOpenDropdown(null); }, [location.pathname]);
    useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

    // Cleanup timers
    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            Object.values(hoverTimerRef.current).forEach(timer => clearTimeout(timer));
        };
    }, []);

    // ── Handlers ──

    const handleMouseEnterTrigger = useCallback((groupId: string) => {
        if (isTouchDevice) return;
        if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
        setOpenDropdown(groupId);
    }, [isTouchDevice]);

    const handleMouseLeaveTrigger = useCallback((_groupId: string) => {
        if (isTouchDevice) return;
        if (isDropdownHoveredRef.current) return;
        closeTimerRef.current = setTimeout(() => { setOpenDropdown(null); }, 300);
    }, [isTouchDevice]);

    const handleMouseEnterDropdown = useCallback((_groupId: string) => {
        if (isTouchDevice) return;
        isDropdownHoveredRef.current = true;
        if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    }, [isTouchDevice]);

    const handleMouseLeaveDropdown = useCallback((_groupId: string) => {
        if (isTouchDevice) return;
        isDropdownHoveredRef.current = false;
        closeTimerRef.current = setTimeout(() => { setOpenDropdown(null); }, 200);
    }, [isTouchDevice]);

    const handleClickTrigger = useCallback((groupId: string, e: React.MouseEvent) => {
        if (!isTouchDevice) return;
        e.preventDefault();
        setOpenDropdown(prev => prev === groupId ? null : groupId);
    }, [isTouchDevice]);

    const handleKeyDown = useCallback((groupId: string, e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenDropdown(prev => prev === groupId ? null : groupId); }
        else if (e.key === 'Escape') { setOpenDropdown(null); }
    }, []);

    const handleLanguageChange = (lang: 'EN' | 'NL' | 'DE' | 'IT' | 'FR') => {
        debugLog('Language change clicked:', lang);
        setLanguage(lang);
        localStorage.setItem('demo_language', lang);
        setLanguageMenuOpen(false);
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
        debugLog('Language changed event dispatched');
    };

    const toggleTheme = () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setTheme({ mode: newMode });
    };

    const openQuickReview = () => {
        setQueueModalTab(queueCounts.review > 0 ? 'review' : 'in-progress');
        setQuickReviewIdx(0);
        setSelectedVariantIdxs(new Set());
        setQuickReviewOpen(true);
    };

    const handleQuickReview = useCallback(async (action: 'approve' | 'reject') => {
        const job = pendingReviewJobs[quickReviewIdx];
        if (!job || quickReviewBusy) return;
        setQuickReviewBusy(true);
        try {
            const variantIndices = selectedVariantIdxs.size > 0 ? Array.from(selectedVariantIdxs) : undefined;
            const result = await reviewJob(job.task_id, action, variantIndices);
            setSelectedVariantIdxs(new Set());
            refreshAiJobs();
            if (quickReviewIdx >= pendingReviewJobs.length - 1) {
                setQuickReviewIdx(Math.max(0, pendingReviewJobs.length - 2));
            }
            // After approving photo_composite_gemini, offer to generate video
            if (action === 'approve' && job.template_id === 'photo_composite_gemini' && job.membership_id) {
                const approvedVariants = result?.output_variants?.filter((v: any) => v.approved === true) || [];
                const imageUrl = approvedVariants[0]?.presigned_url || job.output_url;
                if (imageUrl) {
                    setQuickReviewOpen(false);
                    setPhotoCompositeFollowUp({
                        membershipId: job.membership_id,
                        projectId: job.project_id || '',
                        approvedImageUrl: imageUrl,
                        memberName: job.membership_name || job.label || 'Speler',
                    });
                }
            }
        } catch (e) {
          console.error(e);
            console.error('Quick review failed:', e);
        } finally {
            setQuickReviewBusy(false);
        }
    }, [pendingReviewJobs, quickReviewIdx, quickReviewBusy, selectedVariantIdxs, refreshAiJobs]);

    // ── Return ──
    return {
        // Auth / roles
        user, signOut, signOutLoading,
        isSystemAdmin, isLandAdmin, isOrgAdmin, hasOrgRole, isAdmin,

        // Navigation
        location, navigate,
        showBreadcrumbs,

        // Theme
        currentThemeMode, toggleTheme,

        // Dropdown / mega-menu
        openDropdown, setOpenDropdown,
        filteredNavGroups, dashboardItem,
        isItemActive: isItemActiveFn,
        isGroupActive: isGroupActiveFn,
        handleMouseEnterTrigger, handleMouseLeaveTrigger,
        handleMouseEnterDropdown, handleMouseLeaveDropdown,
        handleClickTrigger, handleKeyDown,

        // Mobile
        mobileMenuOpen, setMobileMenuOpen,

        // Language
        language, languageMenuOpen, setLanguageMenuOpen, handleLanguageChange,

        // Search
        navSearchHasQuery, setNavSearchHasQuery,
        commandOpen, setCommandOpen,

        // Create menu
        createMenuOpen, setCreateMenuOpen, createMenuRef,

        // Queue / quick-review
        queueCounts, queueBadgeCount, queueBadgeColor,
        quickReviewOpen, setQuickReviewOpen, openQuickReview,
        queueModalTab, setQueueModalTab,
        quickReviewIdx, setQuickReviewIdx,
        quickReviewBusy,
        selectedVariantIdxs, setSelectedVariantIdxs,
        pendingReviewJobs, inProgressJobs, refreshAiJobs,
        handleQuickReview,

        // Photo composite follow-up
        photoCompositeFollowUp, setPhotoCompositeFollowUp,

        // Notifications
        unreadCount,
        notificationsModalOpen, setNotificationsModalOpen, notificationsList,

        // Credits
        myCreditsBalance, formattedCredits, creditsBadgeColor, creditsTooltip,
        creditsModalOpen, setCreditsModalOpen,
    };
}
