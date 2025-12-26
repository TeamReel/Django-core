import React, { useEffect, useState } from 'react';
import {
  PageHeader,
  PageContent,
  Card,
  Button,
  Badge,
  Alert,
} from '@django-core/design-system';
import { useTheme, themeVars } from '@django-core/theme-system';
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

export const PreferencesPage: React.FC = () => {
  const { setTheme, mode, resolvedMode } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [initialPreferences, setInitialPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

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
    };

    loadPreferences();

    return () => {
      isMounted = false;
    };
  }, []); // Run once on mount

  // Sync local state with global mode changes (e.g. when storage loads)
  useEffect(() => {
    if (preferences && initialPreferences) {
      const currentGlobalTheme = mode === 'system' ? 'auto' : mode;

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

  const handleSavePreferences = async () => {
    if (!preferences) return;

    setSaving(true);
    setSuccess(false);

    // Simulate API save
    await new Promise(r => setTimeout(r, 600));

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
      <div style={{
        position: 'relative',
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <PageHeader
          title="Preferences"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Config' },
            { label: 'Preferences' },
          ]}
        />

        <PageContent style={{ flex: 1, paddingBottom: '120px' }}>
          {success && (
            <div style={{ marginBottom: '24px' }}>
                <Alert type="success" data-testid="prefs-success-alert">
                Preferences saved successfully
                </Alert>
            </div>
          )}

          <div>
            {/* Theme Section */}
            <Card>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px', color: themeVars.color.text.primary }}>Appearance</h3>
              <div style={{ maxWidth: '800px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '12px', color: themeVars.color.text.secondary }}>
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
                      border: preferences?.theme === 'light' || (preferences?.theme === 'auto' && mode === 'light') ? '2px solid #3b82f6' : '1px solid #e5e5e5',
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
                      border: preferences?.theme === 'dark' || (preferences?.theme === 'auto' && mode === 'dark') ? '2px solid #3b82f6' : '1px solid #e5e5e5',
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

                <p style={{ fontSize: '0.875rem', color: themeVars.color.text.tertiary, marginTop: '24px' }}>
                  Select your preferred interface theme. "Auto" will sync with your operating system settings.
                </p>
              </div>
            </Card>

            {/* Localisation Section */}
            <Card style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px', color: themeVars.color.text.primary }}>Localisation</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px', color: themeVars.color.text.secondary }}>
                    Language
                  </label>
                  <select
                    value={preferences?.language || 'en'}
                    onChange={(e) => setPreferences(prev => prev ? ({ ...prev, language: e.target.value }) : null)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${themeVars.color.border.default}`,
                      fontSize: '0.875rem',
                      backgroundColor: themeVars.color.bg.surface,
                      color: themeVars.color.text.primary
                    }}
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
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px', color: themeVars.color.text.secondary }}>
                    Timezone
                  </label>
                  <select
                    value={preferences?.timezone || 'UTC'}
                    onChange={(e) => setPreferences(prev => prev ? ({ ...prev, timezone: e.target.value }) : null)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${themeVars.color.border.default}`,
                      fontSize: '0.875rem',
                      backgroundColor: themeVars.color.bg.surface,
                      color: themeVars.color.text.primary
                    }}
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

            {/* Notifications Section */}
            <Card style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px', color: themeVars.color.text.primary }}>Notifications</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', height: '20px' }}>
                    <input
                      type="checkbox"
                      checked={preferences?.email_notifications || false}
                      onChange={(e) => setPreferences(prev => prev ? ({ ...prev, email_notifications: e.target.checked }) : null)}
                      style={{ height: '16px', width: '16px', borderRadius: '4px', borderColor: themeVars.color.border.default, color: themeVars.color.action.primary }}
                    />
                  </div>
                  <div style={{ marginLeft: '12px', fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 500, color: themeVars.color.text.primary, display: 'block' }}>Email Notifications</span>
                    <p style={{ color: themeVars.color.text.secondary, marginTop: '4px' }}>Receive notifications about important account activity.</p>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', borderTop: `1px solid ${themeVars.color.border.subtle}`, paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', height: '20px' }}>
                    <input
                      type="checkbox"
                      checked={preferences?.marketing_email || false}
                      onChange={(e) => setPreferences(prev => prev ? ({ ...prev, marketing_email: e.target.checked }) : null)}
                      style={{ height: '16px', width: '16px', borderRadius: '4px', borderColor: themeVars.color.border.default, color: themeVars.color.action.primary }}
                    />
                  </div>
                  <div style={{ marginLeft: '12px', fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 500, color: themeVars.color.text.primary, display: 'block' }}>Marketing Emails</span>
                    <p style={{ color: themeVars.color.text.secondary, marginTop: '4px' }}>Receive updates about new features and special offers.</p>
                  </div>
                </label>
              </div>
            </Card>

            {/* Debug Info - Temporary for validation */}
            <div style={{ marginTop: '24px', padding: '12px', border: '1px dashed #ccc', borderRadius: '4px', fontSize: '12px', color: themeVars.color.text.secondary }}>
              <strong>Debug Storage (django_core_theme):</strong> {typeof window !== 'undefined' ? localStorage.getItem('django_core_theme') || 'null' : 'N/A'}
              <br />
              <strong>Current Mode:</strong> {mode} | <strong>Resolved:</strong> {resolvedMode}
            </div>
          </div>

          {/* Sticky Footer Action Bar */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 24px',
            backgroundColor: 'var(--app-surface)',
            borderTop: '1px solid var(--app-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 100
          }}>
             <div style={{ fontSize: '0.875rem', color: 'var(--app-text)', opacity: 0.7, fontStyle: 'italic', marginRight: '16px' }}>
               Changes are saved locally for this demo.
             </div>
             <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
               <Button
                 variant="outline"
                 onClick={handleCancel}
                 disabled={saving}
               >
                 Cancel
               </Button>
               <Button
                 variant="primary"
                 onClick={handleSavePreferences}
                 disabled={saving}
                 data-testid="prefs-save-button"
               >
                 {saving ? 'Saving...' : 'Save Preferences'}
               </Button>
             </div>
          </div>

        </PageContent>
      </div>
    </AppShell>
  );
};

export default PreferencesPage;
