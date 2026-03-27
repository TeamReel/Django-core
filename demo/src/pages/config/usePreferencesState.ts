/**
 * usePreferencesState — Core preferences state, effects, and handlers.
 *
 * Manages: preferences, effectivePrefs, loading/saving/success state.
 * Extracted from usePreferencesData to reduce its useState count.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@django-core/theme-system';
import { useAuth } from '@django-core/auth-ui';
import { logger } from '@/utils/logger';
import { api } from '@/api';
import type { UserPreferences, I18nEffectivePreferences } from './preferencesTypes';

export interface PreferencesStateReturn {
  preferences: UserPreferences | null;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences | null>>;
  initialPreferences: UserPreferences | null;
  effectivePrefs: I18nEffectivePreferences | null;
  loading: boolean;
  saving: boolean;
  success: boolean;
  activeTab: 'profile' | 'personalisation' | 'notifications' | 'audit';
  setActiveTab: (t: 'profile' | 'personalisation' | 'notifications' | 'audit') => void;
  handleSavePreferences: () => Promise<void>;
  handleCancel: () => void;
}

export function usePreferencesState(): PreferencesStateReturn {
  const location = useLocation();
  const { setTheme, mode } = useTheme();
  const { user } = useAuth();

  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [initialPreferences, setInitialPreferences] = useState<UserPreferences | null>(null);
  const [effectivePrefs, setEffectivePrefs] = useState<I18nEffectivePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'personalisation' | 'notifications' | 'audit'>('profile');

  /* --- Tab sync from URL --- */
  useEffect(() => {
    let tab = '';
    try { tab = String(new URLSearchParams(location.search).get('tab') || '').toLowerCase(); } catch { tab = ''; }
    if (!tab) { setActiveTab('profile'); return; }
    if (tab === 'notifications' || tab === 'notification') { setActiveTab('notifications'); return; }
    if (tab === 'profile' || tab === 'account') { setActiveTab('profile'); return; }
    if (tab === 'audit' || tab === 'my-audit' || tab === 'myaudit') { setActiveTab('audit'); return; }
    if (tab === 'personalisation' || tab === 'personalization' || tab === 'general' || tab === 'prefs') { setActiveTab('personalisation'); return; }
    setActiveTab('profile');
  }, [location.search]);

  /* --- Load preferences on mount --- */
  useEffect(() => {
    let isMounted = true;
    const loadPreferences = async () => {
      setLoading(true);
      await new Promise(r => setTimeout(r, 400));
      if (!isMounted) return;
      const currentTheme = mode === 'system' ? 'auto' : mode;
      const demoLang = localStorage.getItem('demo_language') || 'EN';
      const langMap: Record<string, string> = { 'EN': 'en', 'NL': 'nl', 'DE': 'de' };
      const fullLangCode = langMap[demoLang] || 'en';
      const emailNotifications = localStorage.getItem('email_notifications');
      const marketingEmail = localStorage.getItem('marketing_email');
      const loadedPrefs: UserPreferences = {
        theme: currentTheme as 'auto' | 'dark' | 'light',
        language: fullLangCode,
        timezone: 'UTC',
        email_notifications: emailNotifications !== null ? emailNotifications === 'true' : true,
        marketing_email: marketingEmail !== null ? marketingEmail === 'true' : false,
      };
      setPreferences(loadedPrefs);
      setInitialPreferences(loadedPrefs);
      setLoading(false);

      try {
        const effective = await api.get<I18nEffectivePreferences>(`/preferences/me/`);
        if (isMounted) setEffectivePrefs(effective);
      } catch (_e: unknown) {
        const e = _e as { status?: number };
        const fallback: I18nEffectivePreferences = {
          language: fullLangCode, timezone: 'UTC', date_format: 'YYYY-MM-DD',
          time_format: '24h', currency: 'USD',
          resolved_from: e?.status === 404 ? 'user' : 'system',
        };
        if (isMounted) setEffectivePrefs(fallback);
      }
    };
    void loadPreferences();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount to load initial preferences
  }, []);

  /* --- Sync local state with global mode changes --- */
  useEffect(() => {
    if (preferences && initialPreferences) {
      const currentGlobalTheme = (mode === 'system' ? 'auto' : mode) as 'auto' | 'dark' | 'light';
      if (preferences.theme !== currentGlobalTheme && preferences.theme === initialPreferences.theme) {
        const newPrefs = { ...preferences, theme: currentGlobalTheme };
        setPreferences(newPrefs);
        setInitialPreferences(newPrefs);
      }
    }
  }, [mode, preferences, initialPreferences]);

  /* --- Language change listener --- */
  useEffect(() => {
    const handleLanguageChange = () => {
      const demoLang = localStorage.getItem('demo_language') || 'EN';
      const langMap: Record<string, string> = { 'EN': 'en', 'NL': 'nl', 'DE': 'de' };
      const fullLangCode = langMap[demoLang] || 'en';
      if (preferences && preferences.language !== fullLangCode) {
        setPreferences(prev => prev ? { ...prev, language: fullLangCode } : null);
      }
    };
    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, [preferences]);

  /* --- Save --- */
  const handleSavePreferences = async () => {
    if (!preferences) return;
    setSaving(true);
    setSuccess(false);

    try {
      await api.patch(`/preferences/me/`, { language: preferences.language, timezone: preferences.timezone });
    } catch (err) {
      logger.error('Failed to save preferences to backend', err);
    }

    await new Promise(r => setTimeout(r, 300));

    if (preferences.theme === 'auto') setTheme({ mode: 'system' });
    else setTheme({ mode: preferences.theme });

    document.documentElement.setAttribute('lang', preferences.language);
    const reverseLangMap: Record<string, string> = { 'en': 'EN', 'nl': 'NL', 'de': 'DE', 'es': 'ES', 'fr': 'FR', 'ja': 'JA' };
    const shortCode = reverseLangMap[preferences.language] || 'EN';
    localStorage.setItem('demo_language', shortCode);
    localStorage.setItem('language', preferences.language);
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: shortCode } }));

    localStorage.setItem('email_notifications', String(preferences.email_notifications));
    localStorage.setItem('marketing_email', String(preferences.marketing_email));

    setInitialPreferences(preferences);
    setSuccess(true);
    setSaving(false);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleCancel = () => {
    if (initialPreferences) { setPreferences(initialPreferences); setSuccess(false); }
  };

  // Suppress unused variable warning for user (kept for future profile save integration)
  void user;

  return {
    preferences, setPreferences,
    initialPreferences,
    effectivePrefs,
    loading, saving, success,
    activeTab, setActiveTab,
    handleSavePreferences, handleCancel,
  };
}
