import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Badge,
  Alert,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import { useTheme } from '@django-core/theme-system';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useAuth } from "@django-core/auth-ui";
import AppShell from '../../components/AppShell';

/**
 * T015 - Preferences Page
 *
 * Purpose: Persist theme/language/timezone via B12 preferences API
 * - Theme toggle with F07 hook integration
 * - Language dropdown (i18n integration)
 * - Timezone selection
 * - Immediate UI update on save
 * - Persists across navigation
 */

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  email_notifications: boolean;
  marketing_email: boolean;
}

interface I18nEffectivePreferences {
  language: string;
  timezone: string;
  date_format: string;
  time_format: string;
  currency: string;
  resolved_from: 'user' | 'org' | 'system';
}

interface NotificationPreference {
  id: number;
  event_type: string;
  channel: 'email' | 'push' | 'in_app';
  enabled: boolean;
}

interface EventTypeGroup {
  event_type: string;
  channels: {
    email: boolean;
    push: boolean;
    in_app: boolean;
  };
}

export const PreferencesPage: React.FC = () => {
  const { setTheme, mode, resolvedMode } = useTheme();
  const { user } = useAuth();
  const darkModeEnabled = useFeatureFlag('dark_mode', true); // Default enabled
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [initialPreferences, setInitialPreferences] = useState<UserPreferences | null>(null);
  const [effectivePrefs, setEffectivePrefs] = useState<I18nEffectivePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Notification channel preferences state
  const [channelPrefs, setChannelPrefs] = useState<EventTypeGroup[]>([]);
  const [channelPrefsLoading, setChannelPrefsLoading] = useState(true);
  const [channelPrefsSaving, setChannelPrefsSaving] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  // Initialize preferences from Theme System + Defaults
  useEffect(() => {
    let isMounted = true;

    const loadPreferences = async () => {
      setLoading(true);

      // Simulate network delay for realism
      await new Promise(r => setTimeout(r, 400));

      if (!isMounted) return;

      // In a real app, we would fetch /api/preferences/ here.
      // For this demo, we treat the Theme System as the source of truth for the theme,
      // and use defaults for the rest.

      // Note: We use the current mode ref/value at the time of execution
      // But since this runs on mount, it might capture 'system' before storage loads.
      // The separate useEffect below handles the sync when storage updates mode.
      const currentTheme = mode === 'system' ? 'auto' : mode;

      // Map from demo_language short codes (EN/NL/DE) to full codes
      const demoLang = localStorage.getItem('demo_language') || 'EN';
      const langMap: Record<string, string> = { 'EN': 'en', 'NL': 'nl', 'DE': 'de' };
      const fullLangCode = langMap[demoLang] || 'en';

      // Load notification preferences from localStorage
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

      // Fetch effective i18n preferences from backend (or demo data)
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        // Correct endpoint is /api/v1/preferences/me/ (mapped in config/urls.py)
        const response = await fetch(`${baseUrl}/api/v1/preferences/me/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const effective = await response.json();
          setEffectivePrefs(effective);
        } else if (response.status === 404) {
          // Demo mode: Use mock effective preferences
          setEffectivePrefs({
            language: fullLangCode,
            timezone: 'UTC',
            date_format: 'YYYY-MM-DD',
            time_format: '24h',
            currency: 'USD',
            resolved_from: 'user',
          });
        }
      } catch (err) {
        console.error('Failed to load effective preferences:', err);
        // Fallback to demo data
        setEffectivePrefs({
          language: fullLangCode,
          timezone: 'UTC',
          date_format: 'YYYY-MM-DD',
          time_format: '24h',
          currency: 'USD',
          resolved_from: 'system',
        });
      }
    };

    loadPreferences();

    return () => {
      isMounted = false;
    };
  }, []); // Run once on mount

  // Sync local state with global mode changes (e.g. when storage loads)
  useEffect(() => {
    if (preferences && initialPreferences) {
      const currentGlobalTheme = (mode === 'system' ? 'auto' : mode) as 'auto' | 'dark' | 'light';

      // If the global mode is different from our local state,
      // AND our local state hasn't been modified by the user (matches initial),
      // THEN update local state to match global.
      if (preferences.theme !== currentGlobalTheme && preferences.theme === initialPreferences.theme) {
        const newPrefs = { ...preferences, theme: currentGlobalTheme };
        setPreferences(newPrefs);
        setInitialPreferences(newPrefs);
      }
    }
  }, [mode, preferences, initialPreferences]);

  // Listen for language changes from TopNavbar
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

      // Only load if we have user info
      if (!user || !(user as any).id) {
        console.log('[PreferencesPage] No user ID available yet, skipping channel prefs load');
        setChannelPrefsLoading(false);
        return;
      }

      const userId = (user as any).id;
      console.log('[PreferencesPage] Loading channel preferences for user ID:', userId);

      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${baseUrl}/api/v1/contextual-notifications/preferences/?user=${userId}`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        console.log('[PreferencesPage] Channel preferences response status:', response.status);

        if (response.ok) {
          const result = await response.json();
          console.log('[PreferencesPage] Channel preferences API result:', result);

          // Extract preferences from B13 envelope
          let prefs: NotificationPreference[] = [];
          if (result.data?.results) {
            prefs = result.data.results;
          } else if (result.data && Array.isArray(result.data)) {
            prefs = result.data;
          } else if (Array.isArray(result)) {
            prefs = result;
          }

          console.log('[PreferencesPage] Extracted preferences:', prefs);

          // If no preferences exist, use default structure but allow saving (not demo mode)
          if (prefs.length === 0) {
            console.log('[PreferencesPage] No preferences found, initializing with defaults');
            setDemoMode(false); // Allow saving to backend
            setChannelPrefs(getMockChannelPreferences());
          } else {
            // Group by event_type
            const grouped = groupPreferencesByEventType(prefs);
            console.log('[PreferencesPage] Grouped preferences:', grouped);
            setChannelPrefs(grouped);
            setDemoMode(false);
          }
        } else if (response.status === 404) {
          console.log('[PreferencesPage] 404 - using demo data');
          // Demo mode: use mock data
          setDemoMode(true);
          setChannelPrefs(getMockChannelPreferences());
        } else {
          console.log('[PreferencesPage] Error status:', response.status, '- using demo data');
          setDemoMode(true);
          setChannelPrefs(getMockChannelPreferences());
        }
      } catch (err) {
        console.error('[PreferencesPage] Failed to load channel preferences:', err);
        // Fallback to demo mode
        setDemoMode(true);
        setChannelPrefs(getMockChannelPreferences());
      } finally {
        setChannelPrefsLoading(false);
      }
    };

    loadChannelPreferences();
  }, [user]);

  // Helper: Group preferences by event_type
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

  // Helper: Get mock channel preferences for demo mode
  const getMockChannelPreferences = (): EventTypeGroup[] => {
    console.log('[PreferencesPage] Generating mock channel preferences');
    const mockData = [
      {
        event_type: 'project.updated',
        channels: { email: true, push: true, in_app: true },
      },
      {
        event_type: 'task.assigned',
        channels: { email: true, push: false, in_app: true },
      },
      {
        event_type: 'comment.added',
        channels: { email: false, push: false, in_app: true },
      },
    ];
    console.log('[PreferencesPage] Mock data generated:', mockData);
    return mockData;
  };

  // Handler: Toggle channel for event type
  const handleToggleChannel = async (eventType: string, channel: 'email' | 'push' | 'in_app') => {
    const currentGroup = channelPrefs.find(g => g.event_type === eventType);
    if (!currentGroup) return;

    const newEnabledValue = !currentGroup.channels[channel];

    // Optimistic update
    setChannelPrefs(prev => {
      return prev.map(group => {
        if (group.event_type === eventType) {
          return {
            ...group,
            channels: {
              ...group.channels,
              [channel]: newEnabledValue,
            },
          };
        }
        return group;
      });
    });

    if (demoMode) {
      // Demo mode: just update local state
      console.log('[PreferencesPage] Demo mode: toggle', eventType, channel, 'to', newEnabledValue);
      return;
    }

    // Backend update
    setChannelPrefsSaving(true);

    // Get CSRF token
    const getCsrfToken = () => {
      const match = document.cookie.match(/csrftoken=([^;]+)/);
      return match ? match[1] : '';
    };

    try {
      // Get current user ID
      const userId = (user as any)?.id;
      if (!userId) {
        console.error('[PreferencesPage] Cannot update preference: no user ID');
        throw new Error('User ID not available');
      }

      // Find existing preference ID for this combination
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(
        `${baseUrl}/api/v1/contextual-notifications/preferences/?user=${userId}&event_type=${eventType}&channel=${channel}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        }
      );

      console.log('[PreferencesPage] Fetch response for', eventType, channel, ':', response.status);

      if (response.ok) {
        const result = await response.json();

        // Extract existing preference
        let existingPrefs: NotificationPreference[] = [];
        if (result.data?.results) {
          existingPrefs = result.data.results;
        } else if (result.data && Array.isArray(result.data)) {
          existingPrefs = result.data;
        } else if (Array.isArray(result)) {
          existingPrefs = result;
        }

        console.log('[PreferencesPage] Existing preferences:', existingPrefs);

        if (existingPrefs.length > 0) {
          // Update existing preference with PATCH
          const existingPref = existingPrefs[0];
          console.log('[PreferencesPage] PATCH preference ID:', existingPref.id, 'enabled:', newEnabledValue);

          const updateResponse = await fetch(
            `${baseUrl}/api/v1/contextual-notifications/preferences/${existingPref.id}/`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCsrfToken(),
              },
              credentials: 'include',
              body: JSON.stringify({
                enabled: newEnabledValue,
              }),
            }
          );

          console.log('[PreferencesPage] PATCH response status:', updateResponse.status);

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('[PreferencesPage] PATCH failed:', updateResponse.status, errorText);
            throw new Error('Update failed');
          }
        } else {
          // Create new preference with POST
          console.log('[PreferencesPage] POST new preference:', eventType, channel, newEnabledValue);

          // Get current user ID
          const userId = (user as any)?.id;
          if (!userId) {
            console.error('[PreferencesPage] Cannot create preference: no user ID');
            throw new Error('User ID not available');
          }

          const createResponse = await fetch(`${baseUrl}/api/v1/contextual-notifications/preferences/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify({
              user: userId,
              event_type: eventType,
              channel: channel,
              enabled: newEnabledValue,
            }),
          });

          console.log('[PreferencesPage] POST response status:', createResponse.status);

          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('[PreferencesPage] POST failed:', createResponse.status, errorText);
            throw new Error('Create failed');
          }
        }
      }
    } catch (err) {
      console.error('[PreferencesPage] Error updating channel preference:', err);
      // Revert optimistic update
      setChannelPrefs(prev => {
        return prev.map(group => {
          if (group.event_type === eventType) {
            return {
              ...group,
              channels: {
                ...group.channels,
                [channel]: !newEnabledValue,
              },
            };
          }
          return group;
        });
      });
    } finally {
      setChannelPrefsSaving(false);
    }
  };

  // Helper: Format event type for display
  const formatEventType = (eventType: string): string => {
    return eventType
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' → ');
  };

  const handleSavePreferences = async () => {
    if (!preferences) return;

    setSaving(true);
    setSuccess(false);

    // Save to backend (i18n preferences)
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const getCsrfToken = () => {
        const match = document.cookie.match(/csrftoken=([^;]+)/);
        return match ? match[1] : '';
      };

      await fetch(`${baseUrl}/api/v1/preferences/me/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          language: preferences.language,
          timezone: preferences.timezone,
        }),
      });
    } catch (err) {
      console.error('[PreferencesPage] Failed to save preferences to backend:', err);
      // Continue to update local state anyway
    }

    // Simulate API save (legacy delay)
    await new Promise(r => setTimeout(r, 300));

    // 1. Apply Theme
    if (preferences.theme === 'auto') {
      setTheme({ mode: 'system' });
    } else {
      setTheme({ mode: preferences.theme });
    }

    // 2. Apply Language
    document.documentElement.setAttribute('lang', preferences.language);

    // Sync with demo_language key used by TopNavbar
    const reverseLangMap: Record<string, string> = { 'en': 'EN', 'nl': 'NL', 'de': 'DE', 'es': 'ES', 'fr': 'FR', 'ja': 'JA' };
    const shortCode = reverseLangMap[preferences.language] || 'EN';
    localStorage.setItem('demo_language', shortCode);
    localStorage.setItem('language', preferences.language);

    // Dispatch event for TopNavbar to update
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: shortCode } }));

    // 3. Save notification preferences
    localStorage.setItem('email_notifications', String(preferences.email_notifications));
    localStorage.setItem('marketing_email', String(preferences.marketing_email));

    // 4. Update "Initial" state to match the new saved state
    setInitialPreferences(preferences);

    setSuccess(true);
    setSaving(false);

    // Clear success message after 3s
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleCancel = () => {
    if (initialPreferences) {
      setPreferences(initialPreferences);
      setSuccess(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader
          title="Preferences"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Config' },
            { label: 'Preferences' },
          ]}
        />
        <PageContent>
          <Card>
            <div className="text-center py-12 text-gray-500">
              Loading preferences...
            </div>
          </Card>
        </PageContent>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Preferences"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Config' },
          { label: 'Preferences' },
        ]}
      />

      <PageContent>
          {success && (
            <div style={{ marginBottom: '24px' }}>
                <Alert variant="success" data-testid="prefs-success-alert">
                Preferences saved successfully
                </Alert>
            </div>
          )}

          <div>
            {/* Theme Section - gated by dark_mode feature flag */}
            {darkModeEnabled ? (
              <Card>
                <h3 className="text-lg font-semibold mb-4">Appearance</h3>
                <div style={{ maxWidth: '800px' }}>
                  <label className="block text-sm font-medium mb-3">
                    Theme
                  </label>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }} role="group" aria-label="Theme selection">
                    {['light', 'dark', 'auto'].map((t) => {
                      const isActive = preferences?.theme === t;
                      return (
                        <Button
                          key={t}
                          variant={isActive ? 'primary' : 'outline'}
                          onClick={() => setPreferences(prev => prev ? ({ ...prev, theme: t as any }) : null)}
                        >
                          {t === 'auto' ? 'Auto (System)' : t.charAt(0).toUpperCase() + t.slice(1)}
                        </Button>
                      );
                    })}
                  </div>

                  {/* Preview Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div
                      style={{
                        padding: '24px',
                        backgroundColor: '#ffffff',
                        border: preferences?.theme === 'light' || (preferences?.theme === 'auto' && resolvedMode === 'light') ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    >
                      <h4 style={{ margin: '0 0 12px 0', color: '#1f2937', fontWeight: 600 }}>Light Theme</h4>
                      <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '4px', marginBottom: '12px' }}>
                        <p style={{ margin: 0, fontSize: '12px', color: '#1f2937' }}>Background: #FFFFFF</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>Text: #1F2937</p>
                      </div>
                      {preferences?.theme === 'light' && <Badge variant="success">Selected</Badge>}
                    </div>

                    <div
                      style={{
                        padding: '24px',
                        backgroundColor: '#1f2937',
                        color: '#f3f4f6',
                        border: preferences?.theme === 'dark' || (preferences?.theme === 'auto' && resolvedMode === 'dark') ? '2px solid #3b82f6' : '1px solid #374151',
                        borderRadius: '8px',
                      }}
                    >
                      <h4 style={{ margin: '0 0 12px 0', color: '#f3f4f6', fontWeight: 600 }}>Dark Theme</h4>
                      <div
                        style={{
                          padding: '12px',
                          backgroundColor: '#111827',
                          borderRadius: '4px',
                          marginBottom: '12px',
                        }}
                      >
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#f3f4f6' }}>Background: #1F2937</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>Text: #F3F4F6</p>
                      </div>
                      {preferences?.theme === 'dark' && <Badge variant="success">Selected</Badge>}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mt-6">
                    Select your preferred interface theme. "Auto" will sync with your operating system settings.
                  </p>
                </div>
              </Card>
            ) : (
              <Card>
                <h3 className="text-lg font-semibold mb-4">Appearance</h3>
                <Alert variant="info">
                  <strong>Theme settings disabled</strong> - The dark mode feature is currently disabled by a feature flag.
                  Contact your administrator to enable theme customization.
                </Alert>
              </Card>
            )}

            {/* Localisation Section */}
            <Card style={{ marginTop: '24px' }}>
              <h3 className="text-lg font-semibold mb-4">Localisation</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Language
                  </label>
                  <select
                    value={preferences?.language || 'en'}
                    onChange={(e) => {
                      const newLang = e.target.value;
                      setPreferences(prev => prev ? ({ ...prev, language: newLang }) : null);
                      // Auto-save to localStorage
                      const langMap: Record<string, string> = { 'en': 'EN', 'nl': 'NL', 'de': 'DE', 'es': 'ES', 'fr': 'FR', 'ja': 'JA' };
                      localStorage.setItem('demo_language', langMap[newLang] || 'EN');
                      window.dispatchEvent(new Event('languageChanged'));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="en">English (EN)</option>
                    <option value="nl">Nederlands (NL)</option>
                    <option value="de">Deutsch (DE)</option>
                    <option value="es">Español (ES)</option>
                    <option value="fr">Français (FR)</option>
                    <option value="ja">日本語 (JA)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Timezone
                  </label>
                  <select
                    value={preferences?.timezone || 'UTC'}
                    onChange={(e) => {
                      const newTimezone = e.target.value;
                      setPreferences(prev => prev ? ({ ...prev, timezone: newTimezone }) : null);
                      // Auto-save to localStorage
                      localStorage.setItem('demo_timezone', newTimezone);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">GMT (London)</option>
                    <option value="Europe/Paris">CET (Paris)</option>
                    <option value="Asia/Tokyo">JST (Tokyo)</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Effective i18n Preferences (Backend-Resolved) */}
            {effectivePrefs && (
              <Card style={{ marginTop: '24px' }}>
                <h3 className="text-lg font-semibold mb-2">
                  Effective Preferences (Server-Resolved)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  These are the actual values used by the system, resolved from your user settings, organization defaults, or system fallbacks.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Language
                    </div>
                    <div className="text-base">
                      {effectivePrefs.language}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Timezone
                    </div>
                    <div className="text-base">
                      {effectivePrefs.timezone}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Date Format
                    </div>
                    <div className="text-base">
                      {effectivePrefs.date_format}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Time Format
                    </div>
                    <div className="text-base">
                      {effectivePrefs.time_format}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Currency
                    </div>
                    <div className="text-base">
                      {effectivePrefs.currency}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Resolved From
                    </div>
                    <Badge variant={effectivePrefs.resolved_from === 'user' ? 'success' : effectivePrefs.resolved_from === 'org' ? 'warning' : 'info'}>
                      {effectivePrefs.resolved_from}
                    </Badge>
                  </div>
                </div>
              </Card>
            )}

            {/* Notifications Section */}
            <Card style={{ marginTop: '24px' }}>
              <h3 className="text-lg font-semibold mb-4">Notifications</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <label className="flex items-start cursor-pointer">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      checked={preferences?.email_notifications || false}
                      onChange={(e) => {
                        const newValue = e.target.checked;
                        setPreferences(prev => prev ? ({ ...prev, email_notifications: newValue }) : null);
                        // Auto-save to localStorage
                        localStorage.setItem('email_notifications', String(newValue));
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <span className="font-medium block">Email Notifications</span>
                    <p className="text-gray-500 mt-1">Receive notifications about important account activity.</p>
                  </div>
                </label>

                <label className="flex items-start cursor-pointer border-t border-gray-200 pt-4">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      checked={preferences?.marketing_email || false}
                      onChange={(e) => {
                        const newValue = e.target.checked;
                        setPreferences(prev => prev ? ({ ...prev, marketing_email: newValue }) : null);
                        // Auto-save to localStorage
                        localStorage.setItem('marketing_email', String(newValue));
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <span className="font-medium block">Marketing Emails</span>
                    <p className="text-gray-500 mt-1">Receive updates about new features and special offers.</p>
                  </div>
                </label>
              </div>
            </Card>

            {/* Notification Channels Section */}
            <Card style={{ marginTop: '24px' }}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Notification Channels</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose which channels you want to receive notifications on for each event type.
                  </p>
                </div>
                {demoMode && (
                  <Badge variant="warning">Demo Mode</Badge>
                )}
              </div>

              {channelPrefsLoading && (
                <div className="text-center py-8 text-gray-500">
                  Loading channel preferences...
                </div>
              )}

              {!channelPrefsLoading && channelPrefs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No notification preferences configured yet.
                </div>
              )}

              {!channelPrefsLoading && channelPrefs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {channelPrefs.map((group) => (
                    <div key={group.event_type} className="border-t border-gray-200 pt-4 first:border-t-0 first:pt-0">
                      <h4 className="text-sm font-semibold mb-3 text-gray-900">
                        {formatEventType(group.event_type)}
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={group.channels.email}
                            onChange={() => handleToggleChannel(group.event_type, 'email')}
                            disabled={channelPrefsSaving}
                            className="h-4 w-4 rounded border-gray-300 mr-2"
                          />
                          <span className="text-sm">📧 Email</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={group.channels.push}
                            onChange={() => handleToggleChannel(group.event_type, 'push')}
                            disabled={channelPrefsSaving}
                            className="h-4 w-4 rounded border-gray-300 mr-2"
                          />
                          <span className="text-sm">🔔 Push</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={group.channels.in_app}
                            onChange={() => handleToggleChannel(group.event_type, 'in_app')}
                            disabled={channelPrefsSaving}
                            className="h-4 w-4 rounded border-gray-300 mr-2"
                          />
                          <span className="text-sm">💬 In-App</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Debug Info - Temporary for validation */}
            <div className="mt-6 p-3 border border-dashed border-gray-300 rounded text-xs text-gray-600">
              <strong>Debug Storage (django_core_theme):</strong> {typeof window !== 'undefined' ? localStorage.getItem('django_core_theme') || 'null' : 'N/A'}
              <br />
              <strong>Current Mode:</strong> {mode} | <strong>Resolved:</strong> {resolvedMode}
            </div>
          </div>
        </PageContent>
    </AppShell>
  );
};

export default PreferencesPage;
