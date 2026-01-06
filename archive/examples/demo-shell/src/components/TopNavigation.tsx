import { useAuth, useSignOut } from '@django-core/auth-ui';
import { ContextSwitcher, useContextSwitcher } from '@django-core/context-switcher';
import type { Organisation } from '@django-core/context-switcher';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTheme } from '@django-core/theme-system';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useUserRole } from '../hooks/useUserRole';

interface NotificationResponse {
  count: number;
  results: Array<{
    id: string;
    is_read: boolean;
  }>;
}

export default function TopNavigation() {
  const { user } = useAuth();
  const { signOut, loading } = useSignOut();
  const navigate = useNavigate();
  const { context, organisations, switchContext } = useContextSwitcher();
  const [hasSelectedOrg, setHasSelectedOrg] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { mode: theme, setTheme } = useTheme();
  const [language, setLanguage] = useState<'EN' | 'NL' | 'DE'>('EN');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const { isSystemAdmin } = useUserRole();

  // Check if theme toggle feature is enabled (from feature flags system)
  const themeToggleEnabled = useFeatureFlag('dark_mode', true); // Resolved with org overrides
  const [themeToggleGlobalEnabled, setThemeToggleGlobalEnabled] = useState<boolean>(true); // Global value for superadmins

  // For superadmins: Fetch the global flag value (not resolved with org overrides)
  useEffect(() => {
    if (!isSystemAdmin) return;

    const fetchGlobalFlag = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${baseUrl}/api/v1/settings/feature-flags/resolve-all/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const flags = data.data?.results || data.results || data.data || data || [];
          const themeFlag = flags.find((f: any) => f.key === 'dark_mode');

          if (themeFlag) {
            const globalValue = themeFlag.global_value !== null && themeFlag.global_value !== undefined
              ? themeFlag.global_value
              : true;
            setThemeToggleGlobalEnabled(globalValue);
          }
        }
      } catch (err) {
        console.error('[TopNavigation] Error fetching global flag:', err);
      }
    };

    fetchGlobalFlag();

    // Listen for feature flag changes
    const handleFlagChange = () => {
      fetchGlobalFlag();
    };

    window.addEventListener('storage', handleFlagChange);
    window.addEventListener('featureFlagsChanged' as any, handleFlagChange);

    return () => {
      window.removeEventListener('storage', handleFlagChange);
      window.removeEventListener('featureFlagsChanged' as any, handleFlagChange);
    };
  }, [isSystemAdmin]);

  // Load language from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('demo_language') as 'EN' | 'NL' | 'DE';
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  // Close language menu when clicking outside
  useEffect(() => {
    if (!languageMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.language-menu-container')) {
        setLanguageMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [languageMenuOpen]);

  const handleLanguageChange = (lang: 'EN' | 'NL' | 'DE') => {
    setLanguage(lang);
    localStorage.setItem('demo_language', lang);
    setLanguageMenuOpen(false);
  };

  const toggleTheme = () => {
    const newMode = theme === 'light' ? 'dark' : 'light';
    setTheme({ mode: newMode });
  };

  const currentThemeMode = theme || 'light';

  // Save selected org to localStorage
  useEffect(() => {
    if (context.organisation) {
      localStorage.setItem('demo_selected_org_id', context.organisation.id.toString());
      setHasSelectedOrg(true);
    }
  }, [context.organisation]);

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${apiBaseUrl}/api/v1/user-notifications/`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data: NotificationResponse = await response.json();
          const unread = data.results?.filter(n => !n.is_read).length || 0;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error('Failed to fetch notification count:', err);
      }
    };

    fetchUnreadCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    // Listen for notification changes
    const handleNotificationChange = () => fetchUnreadCount();
    window.addEventListener('notificationChanged', handleNotificationChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationChanged', handleNotificationChange);
    };
  }, [user]);

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: '1px solid var(--app-border)',
      backgroundColor: 'var(--app-surface)',
      color: 'var(--app-text)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Django Core-App Demo</h1>
        {/* Context switcher removed from header - now embedded in breadcrumbs */}
      </div>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Theme Toggle - for superadmin: check global flag only, for others: check resolved flag (with org overrides) */}
          {(isSystemAdmin ? themeToggleGlobalEnabled : themeToggleEnabled) && (
            <button
              onClick={toggleTheme}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '20px',
              }}
              title={`Switch to ${currentThemeMode === 'light' ? 'dark' : 'light'} mode`}
              aria-label={`Switch to ${currentThemeMode === 'light' ? 'dark' : 'light'} mode`}
            >
              {currentThemeMode === 'light' ? '🌙' : '☀️'}
            </button>
          )}

          {/* Language Switcher */}
          <div className="language-menu-container" style={{ position: 'relative' }}>
            <button
              onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
              style={{
                padding: '8px 12px',
                backgroundColor: 'transparent',
                border: '1px solid var(--app-border)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                color: 'var(--app-text)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              aria-label="Select language"
            >
              🌐 {language} <span style={{ fontSize: '10px' }}>{languageMenuOpen ? '▴' : '▾'}</span>
            </button>

            {languageMenuOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                backgroundColor: 'var(--app-surface)',
                border: '1px solid var(--app-border)',
                borderRadius: '6px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                minWidth: '120px',
                zIndex: 1000,
              }}>
                {(['EN', 'NL', 'DE'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px 16px',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: language === lang ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      color: language === lang ? '#2563eb' : 'var(--app-text)',
                      fontWeight: language === lang ? 600 : 400,
                      fontSize: '14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--app-border)',
                    }}
                    onMouseEnter={(e) => {
                      if (language !== lang) {
                        e.currentTarget.style.backgroundColor = 'var(--app-surface-secondary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (language !== lang) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification Icon */}
          <button
            onClick={() => navigate('/notifications')}
            style={{
              position: 'relative',
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '20px'
            }}
            title="Notifications"
          >
            🔔
            {/* Unread badge - only show if count > 0 */}
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                backgroundColor: '#dc3545',
                color: 'white',
                borderRadius: '10px',
                padding: '2px 6px',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          <span style={{ fontSize: '14px', color: 'var(--app-text)', opacity: 0.7 }}>{user.email}</span>
          <button
            onClick={signOut}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: loading ? '#6c757d' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Logging out...' : 'Log Out'}
          </button>
        </div>
      )}
    </header>
  );
}
