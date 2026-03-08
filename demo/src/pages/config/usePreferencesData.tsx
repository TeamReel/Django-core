/**
 * PreferencesPage — Orchestrator hook
 *
 * Composes useCascadingEntitySelection and manages preferences,
 * notification prefs, audit events, profile modals, and handlers.
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@django-core/theme-system';
import { useAuth } from '@django-core/auth-ui';
import type { AuditEvent } from '../../types';
import { getApiBaseUrl } from '../../utils/apiBase';
import { getCsrfToken } from '../../utils/csrf';

import type {
  UserPreferences,
  I18nEffectivePreferences,
  NotificationPreference,
  EventTypeGroup,
  PreferencesDataReturn,
} from './preferencesTypes';
import { useCascadingEntitySelection } from './useCascadingEntitySelection';

export type { UserPreferences, I18nEffectivePreferences, NotificationPreference, EventTypeGroup, PreferencesDataReturn };

/* ------------------------------------------------------------------ */
/*  Hook implementation                                                */
/* ------------------------------------------------------------------ */

export function usePreferencesData(): PreferencesDataReturn {
  const location = useLocation();
  const { setTheme, mode, resolvedMode } = useTheme();
  const { user, setUser } = useAuth();

  /* ---------- cascading entities (sub-hook) ---------------------- */
  const entities = useCascadingEntitySelection();

  /* ---------- preferences state ---------------------------------- */
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [initialPreferences, setInitialPreferences] = useState<UserPreferences | null>(null);
  const [effectivePrefs, setEffectivePrefs] = useState<I18nEffectivePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  /* ---------- notification channel prefs ------------------------- */
  const [channelPrefs, setChannelPrefs] = useState<EventTypeGroup[]>([]);
  const [channelPrefsLoading, setChannelPrefsLoading] = useState(true);
  const [channelPrefsSaving, setChannelPrefsSaving] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  /* ---------- tabs ----------------------------------------------- */
  const [activeTab, setActiveTab] = useState<'profile' | 'personalisation' | 'notifications' | 'audit'>('profile');

  /* ---------- audit ---------------------------------------------- */
  const [myAuditEvents, setMyAuditEvents] = useState<AuditEvent[]>([]);
  const [myAuditLoading, setMyAuditLoading] = useState(false);
  const [myAuditError, setMyAuditError] = useState<string | null>(null);

  /* ---------- profile modals ------------------------------------- */
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileTwoFactorEnabled, setProfileTwoFactorEnabled] = useState(false);
  const [profileCurrentPassword, setProfileCurrentPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNext, setPasswordNext] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  /* ---------- derived label maps --------------------------------- */
  const organisationLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    const userOrgs: any[] = Array.isArray(user?.organisations) ? user.organisations : [];
    for (const o of [...entities.organisations, ...userOrgs]) {
      const id = String(o?.id || '').trim();
      const slug = String(o?.slug || '').trim();
      const label = String(o?.name || o?.title || o?.label || o?.slug || o?.id || '').trim();
      if (label) { if (id) map.set(id, label); if (slug) map.set(slug, label); }
    }
    return map;
  }, [entities.organisations, user]);

  const projectLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    const userProjects: any[] = Array.isArray(user?.projects) ? user.projects : [];
    for (const p of [...entities.clubs, ...entities.teams, ...userProjects]) {
      const id = String(p?.id || '').trim();
      const slug = String(p?.slug || '').trim();
      const key = String(p?.key || '').trim();
      const label = String(p?.name || p?.title || p?.label || p?.slug || p?.id || '').trim();
      if (label) { if (id) map.set(id, label); if (slug) map.set(slug, label); if (key) map.set(key, label); }
    }
    return map;
  }, [entities.clubs, entities.teams, user]);

  /* ---------- notification helpers ------------------------------- */
  const groupPreferencesByEventType = (prefs: NotificationPreference[]): EventTypeGroup[] => {
    const eventTypes = new Set(prefs.map(p => p.event_type));
    return Array.from(eventTypes).map(event_type => {
      const eventPrefs = prefs.filter(p => p.event_type === event_type);
      return {
        event_type,
        channels: {
          email: eventPrefs.find(p => p.channel === 'email')?.enabled ?? false,
          push: eventPrefs.find(p => p.channel === 'push')?.enabled ?? false,
          in_app: eventPrefs.find(p => p.channel === 'in_app')?.enabled ?? false,
        },
      };
    });
  };

  const getMockChannelPreferences = (): EventTypeGroup[] => [
    { event_type: 'project.updated', channels: { email: true, push: true, in_app: true } },
    { event_type: 'task.assigned', channels: { email: true, push: false, in_app: true } },
    { event_type: 'comment.added', channels: { email: false, push: false, in_app: true } },
  ];

  const formatEventType = (eventType: string): string =>
    eventType.split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' \u2192 ');

  /* ---------- notification toggle -------------------------------- */
  const handleToggleChannel = async (eventType: string, channel: 'email' | 'push' | 'in_app') => {
    const currentGroup = channelPrefs.find(g => g.event_type === eventType);
    if (!currentGroup) return;
    const newEnabledValue = !currentGroup.channels[channel];

    // Optimistic update
    setChannelPrefs(prev =>
      prev.map(group =>
        group.event_type === eventType ? { ...group, channels: { ...group.channels, [channel]: newEnabledValue } } : group,
      ),
    );
    if (demoMode) return;

    setChannelPrefsSaving(true);
    try {
      const userId = user?.id;
      if (!userId) throw new Error('User ID not available');
      const baseUrl = getApiBaseUrl();
      const response = await fetch(
        `${baseUrl}/api/v1/contextual-notifications/preferences/?user=${userId}&event_type=${eventType}&channel=${channel}`,
        { headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include' },
      );

      if (response.ok) {
        const result = await response.json();
        let existingPrefs: NotificationPreference[] = [];
        if (result.data?.results) existingPrefs = result.data.results;
        else if (result.data && Array.isArray(result.data)) existingPrefs = result.data;
        else if (Array.isArray(result)) existingPrefs = result;

        if (existingPrefs.length > 0) {
          const updateResponse = await fetch(
            `${baseUrl}/api/v1/contextual-notifications/preferences/${existingPrefs[0].id}/`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
              credentials: 'include',
              body: JSON.stringify({ enabled: newEnabledValue }),
            },
          );
          if (!updateResponse.ok) throw new Error('Update failed');
        } else {
          const createResponse = await fetch(`${baseUrl}/api/v1/contextual-notifications/preferences/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
            credentials: 'include',
            body: JSON.stringify({ user: userId, event_type: eventType, channel, enabled: newEnabledValue }),
          });
          if (!createResponse.ok) throw new Error('Create failed');
        }
      }
    } catch {
      setChannelPrefs(prev =>
        prev.map(group =>
          group.event_type === eventType ? { ...group, channels: { ...group.channels, [channel]: !newEnabledValue } } : group,
        ),
      );
    } finally {
      setChannelPrefsSaving(false);
    }
  };

  /* ---------- save / cancel -------------------------------------- */
  const handleSavePreferences = async () => {
    if (!preferences) return;
    setSaving(true);
    setSuccess(false);

    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/v1/preferences/me/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({ language: preferences.language, timezone: preferences.timezone }),
      });
    } catch (err) {
      console.error(err);
      console.error('[PreferencesPage] Failed to save preferences to backend:', err);
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

  /* ================================================================
   *  Effects
   * ============================================================== */

  // Tab sync from URL
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

  // Audit events
  useEffect(() => {
    if (activeTab !== 'audit') return;
    const myUserId = String(user?.id || '').trim();
    const myEmail = String(user?.email || '').trim().toLowerCase();
    if (!myUserId && !myEmail) return;

    let cancelled = false;
    const run = async () => {
      try {
        setMyAuditLoading(true);
        setMyAuditError(null);
        const baseUrl = getApiBaseUrl();
        const params = new URLSearchParams();
        params.set('limit', '200');
        params.set('offset', '0');
        const response = await fetch(`${baseUrl}/api/v1/activity/?${params.toString()}`, {
          headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        });
        if (!response.ok) throw new Error(`Failed to load audit events (${response.status})`);
        const raw = await response.json();
        const data = (raw?.data ?? raw);
        const results: AuditEvent[] = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        const filtered = results
          .filter((e) => {
            const uid = String(e?.user?.id || '').trim();
            const email = String(e?.user?.email || '').trim().toLowerCase();
            return (myUserId && uid === myUserId) || (myEmail && email === myEmail);
          })
          .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
        if (!cancelled) setMyAuditEvents(filtered);
      } catch (e) {
        console.error(e);
        if (!cancelled) setMyAuditError(e instanceof Error ? e.message : 'Failed to load audit events');
      } finally {
        if (!cancelled) setMyAuditLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [activeTab, user]);

  // Load preferences on mount
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
        theme: currentTheme,
        language: fullLangCode,
        timezone: 'UTC',
        email_notifications: emailNotifications !== null ? emailNotifications === 'true' : true,
        marketing_email: marketingEmail !== null ? marketingEmail === 'true' : false,
      };
      setPreferences(loadedPrefs);
      setInitialPreferences(loadedPrefs);
      setLoading(false);

      try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/v1/preferences/me/`, {
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
        });
        if (response.ok) {
          const effective = await response.json();
          setEffectivePrefs(effective);
        } else if (response.status === 404) {
          setEffectivePrefs({ language: fullLangCode, timezone: 'UTC', date_format: 'YYYY-MM-DD', time_format: '24h', currency: 'USD', resolved_from: 'user' });
        }
      } catch {
        setEffectivePrefs({ language: fullLangCode, timezone: 'UTC', date_format: 'YYYY-MM-DD', time_format: '24h', currency: 'USD', resolved_from: 'system' });
      }
    };
    loadPreferences();
    return () => { isMounted = false; };
  }, []);

  // Sync local state with global mode changes
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

  // Language change listener
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

  // Load notification channel preferences
  useEffect(() => {
    const loadChannelPreferences = async () => {
      setChannelPrefsLoading(true);
      if (!user || !user.id) { setChannelPrefsLoading(false); return; }
      const userId = user.id;
      try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/v1/contextual-notifications/preferences/?user=${userId}`, {
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
        });
        if (response.ok) {
          const result = await response.json();
          let prefs: NotificationPreference[] = [];
          if (result.data?.results) prefs = result.data.results;
          else if (result.data && Array.isArray(result.data)) prefs = result.data;
          else if (Array.isArray(result)) prefs = result;
          if (prefs.length === 0) { setDemoMode(false); setChannelPrefs(getMockChannelPreferences()); }
          else { setChannelPrefs(groupPreferencesByEventType(prefs)); setDemoMode(false); }
        } else {
          setDemoMode(true); setChannelPrefs(getMockChannelPreferences());
        }
      } catch {
        setDemoMode(true); setChannelPrefs(getMockChannelPreferences());
      } finally {
        setChannelPrefsLoading(false);
      }
    };
    loadChannelPreferences();
  }, [user]);

  /* ----------------------------------------------------------------
   *  Return
   * -------------------------------------------------------------- */

  return {
    resolvedMode,
    user, setUser,
    preferences, setPreferences,
    initialPreferences, effectivePrefs,
    loading, saving, success,

    // Spread cascading entity selection
    activeContext: entities.activeContext,
    activeContextLoading: entities.activeContextLoading,
    activeContextError: entities.activeContextError,
    savingContext: entities.savingContext,
    selectedOrgId: entities.selectedOrgId, setSelectedOrgId: entities.setSelectedOrgId,
    selectedClubId: entities.selectedClubId, setSelectedClubId: entities.setSelectedClubId,
    selectedTeamId: entities.selectedTeamId, setSelectedTeamId: entities.setSelectedTeamId,
    selectedSeasonId: entities.selectedSeasonId, setSelectedSeasonId: entities.setSelectedSeasonId,
    selectedCompetitionId: entities.selectedCompetitionId, setSelectedCompetitionId: entities.setSelectedCompetitionId,
    selectedMatchId: entities.selectedMatchId, setSelectedMatchId: entities.setSelectedMatchId,
    hasEditedContext: entities.hasEditedContext, setHasEditedContext: entities.setHasEditedContext,
    organisations: entities.organisations,
    clubs: entities.clubs,
    teams: entities.teams,
    seasons: entities.seasons,
    competitions: entities.competitions,
    matches: entities.matches,
    loadingOrgs: entities.loadingOrgs,
    loadingClubs: entities.loadingClubs,
    loadingTeams: entities.loadingTeams,
    loadingSeasons: entities.loadingSeasons,
    loadingCompetitions: entities.loadingCompetitions,
    loadingMatches: entities.loadingMatches,
    applyActiveContextSelection: entities.applyActiveContextSelection,

    channelPrefs, channelPrefsLoading, channelPrefsSaving, demoMode,
    activeTab, setActiveTab,
    myAuditEvents, myAuditLoading, myAuditError,
    organisationLabelByKey, projectLabelByKey,
    isProfileModalOpen, setIsProfileModalOpen,
    isPasswordModalOpen, setIsPasswordModalOpen,
    isAvatarModalOpen, setIsAvatarModalOpen,
    profileFirstName, setProfileFirstName,
    profileLastName, setProfileLastName,
    profileEmail, setProfileEmail,
    profileTwoFactorEnabled, setProfileTwoFactorEnabled,
    profileCurrentPassword, setProfileCurrentPassword,
    profileSaving, setProfileSaving,
    profileError, setProfileError,
    passwordCurrent, setPasswordCurrent,
    passwordNext, setPasswordNext,
    passwordConfirm, setPasswordConfirm,
    passwordSaving, setPasswordSaving,
    passwordError, setPasswordError,
    passwordSuccess, setPasswordSuccess,
    avatarFile, setAvatarFile,
    avatarSaving, setAvatarSaving,
    avatarError, setAvatarError,
    handleSavePreferences, handleCancel,
    handleToggleChannel, formatEventType,
  };
}
