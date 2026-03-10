/**
 * Effects for useTopNavbarData hook
 */
import { useEffect, type RefObject } from 'react';
import type { Location } from 'react-router-dom';
import type { User } from '@django-core/auth-ui';
import { api } from '@/api';
import type { NotificationResponse } from '../topNavbarHelpers';
import type { NotificationItem, LanguageCode } from './types';
import { logger } from '@/utils/logger';

interface UseTopNavbarEffectsParams {
  user: User | null;
  location: Location;
  orgIdForMyBalance: string;
  openDropdown: string | null;
  languageMenuOpen: boolean;
  createMenuOpen: boolean;
  createMenuRef: RefObject<HTMLDivElement | null>;
  closeTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
  onOpenSearchRef?: (fn: () => void) => void;
  setCommandOpen: (open: boolean) => void;
  setOpenDropdown: (dropdown: string | null) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setLanguage: (lang: LanguageCode) => void;
  setLanguageMenuOpen: (open: boolean) => void;
  setUnreadCount: (count: number) => void;
  setNotificationsList: (list: NotificationItem[]) => void;
  setMyCreditsBalance: (balance: string | null) => void;
  setCreateMenuOpen: (open: boolean) => void;
  setIsTouchDevice: (touch: boolean) => void;
}

export function useTopNavbarEffects(params: UseTopNavbarEffectsParams) {
  const {
    user, location, orgIdForMyBalance, openDropdown, languageMenuOpen,
    createMenuOpen, createMenuRef, closeTimerRef, onOpenSearchRef,
    setCommandOpen, setOpenDropdown, setMobileMenuOpen, setLanguage,
    setLanguageMenuOpen, setUnreadCount, setNotificationsList,
    setMyCreditsBalance, setCreateMenuOpen, setIsTouchDevice,
  } = params;

  // Provide openSearch to parent
  useEffect(() => {
    if (onOpenSearchRef) {
      onOpenSearchRef(() => setCommandOpen(true));
    }
  }, [onOpenSearchRef, setCommandOpen]);

  // Detect touch device
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('touchstart', checkTouch, { once: true });
  }, [setIsTouchDevice]);

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
  }, [createMenuOpen, createMenuRef, setCreateMenuOpen]);

  // Load language from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('demo_language') as LanguageCode;
    if (savedLang) setLanguage(savedLang);
  }, [setLanguage]);

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;
    const fetchUnreadCount = async () => {
      if (document.hidden) return;
      try {
        const data = await api.get<NotificationResponse>('/user-notifications/');
        const notifications = data.results
          || (data as any).data?.results
          || (data as any).data?.data
          || (data as any).data
          || [];
        const unread = Array.isArray(notifications) ? notifications.filter(n => !n.is_read).length : 0;
        setUnreadCount(unread);
        if (Array.isArray(notifications)) {
          setNotificationsList(notifications.slice(0, 10).map((n) => ({
            id: n.id,
            title: n.title || '',
            message: n.message || n.content || 'Notification',
            is_read: n.is_read ?? false,
            read: n.is_read ?? false,
            action_url: n.action_url || null,
            created_at: n.created_at || new Date().toISOString(),
          })));
        }
      } catch (err) {
        logger.error('Failed to fetch notification count', err);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    const handleNotificationChange = () => fetchUnreadCount();
    const handleVisibility = () => { if (!document.hidden) fetchUnreadCount(); };
    window.addEventListener('notificationChanged', handleNotificationChange);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationChanged', handleNotificationChange);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, setUnreadCount, setNotificationsList]);

  // Reset badge counts when navigating to notifications
  useEffect(() => {
    if (location.pathname === '/notifications' || location.pathname.startsWith('/notifications/')) {
      setUnreadCount(0);
    }
  }, [location.pathname, setUnreadCount]);

  // Fetch credits balance
  useEffect(() => {
    if (!user) { setMyCreditsBalance(null); return; }
    if (!orgIdForMyBalance) { setMyCreditsBalance(null); return; }
    let cancelled = false;
    const controller = new AbortController();
    const fetchBalance = async () => {
      if (document.hidden) return;
      try {
        const data = await api.get<any>(
          `/transactions/organizations/${encodeURIComponent(orgIdForMyBalance)}/balance/me/`,
          { signal: controller.signal },
        );
        const v = data?.current_balance;
        if (!cancelled) setMyCreditsBalance(v != null ? String(v) : null);
      } catch { /* ignore */ }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => { cancelled = true; controller.abort(); clearInterval(interval); };
  }, [orgIdForMyBalance, user, setMyCreditsBalance]);

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
  }, [openDropdown, languageMenuOpen, setOpenDropdown, setLanguageMenuOpen]);

  // Close dropdown / mobile menu on route change
  useEffect(() => { setOpenDropdown(null); }, [location.pathname, setOpenDropdown]);
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname, setMobileMenuOpen]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [closeTimerRef]);
}
