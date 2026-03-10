import { useAuth, useSignOut } from '@django-core/auth-ui';
import { ContextSwitcher, useContextSwitcher } from '@django-core/context-switcher';
import type { Organisation } from '@django-core/context-switcher';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTheme } from '@django-core/theme-system';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import styles from './TopNavigation.module.css';

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
  const themeToggleEnabled = true; // Always show toggle

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
        const data = await api.get<NotificationResponse>('/user-notifications/');
        const unread = data.results?.filter(n => !n.is_read).length || 0;
        setUnreadCount(unread);
      } catch (err) {
        logger.error('Failed to fetch notification count', err);
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
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <h1 className={styles.title}>Django Core-App Demo</h1>
        {/* Context switcher removed from header - now embedded in breadcrumbs */}
      </div>

      {user && (
        <div className={styles.rightSection}>
          {/* Theme Toggle */}
          {themeToggleEnabled && (
            <button
              onClick={toggleTheme}
              className={styles.themeToggle}
              title={`Switch to ${currentThemeMode === 'light' ? 'dark' : 'light'} mode`}
              aria-label={`Switch to ${currentThemeMode === 'light' ? 'dark' : 'light'} mode`}
            >
              {currentThemeMode === 'light' ? 'Dark' : 'Light'}
            </button>
          )}

          {/* Language Switcher */}
          <div className={`language-menu-container ${styles.languageMenuContainer}`}>
            <button
              onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
              className={styles.languageTrigger}
              aria-label="Select language"
            >
              🌐 {language} <span className={styles.languageArrow}>{languageMenuOpen ? '▴' : '▾'}</span>
            </button>

            {languageMenuOpen && (
              <div className={styles.languageDropdown}>
                {(['EN', 'NL', 'DE'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className={styles.languageOption}
                    data-active={language === lang}
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
            className={styles.notificationButton}
            title="Notifications"
          >
            🔔
            {/* Unread badge - only show if count > 0 */}
            {unreadCount > 0 && (
              <span className={styles.unreadBadge}>
                {unreadCount}
              </span>
            )}
          </button>

          <span className={styles.userEmail}>{user.email}</span>
          <button
            onClick={signOut}
            disabled={loading}
            className={styles.signOutButton}
          >
            {loading ? 'Logging out...' : 'Log Out'}
          </button>
        </div>
      )}
    </header>
  );
}
