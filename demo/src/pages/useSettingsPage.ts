/**
 * State & handlers for SettingsPage, extracted so the page file focuses on JSX.
 */
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { useTrash } from '@/hooks/useTrash';
import { useUserRole } from '@/hooks/useUserRole';

export function useSettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  // Initialize activeSection from URL hash, fallback to localStorage, then 'profile'
  const getInitialSection = () => {
    const hash = location.hash.replace('#', '');
    if (hash && ['profile', 'security', 'notifications', 'preferences', 'trash'].includes(hash)) {
      return hash;
    }
    return localStorage.getItem('demo_settings_section') || 'profile';
  };

  const [activeSection, setActiveSection] = useState(getInitialSection());

  // Update URL hash when section changes
  useEffect(() => {
    navigate(`#${activeSection}`, { replace: true });
    localStorage.setItem('demo_settings_section', activeSection);
  }, [activeSection, navigate]);

  // Load preferences from localStorage or use defaults
  const [preferences, setPreferences] = useState({
    theme: localStorage.getItem('demo_theme') || 'light',
    language: localStorage.getItem('demo_language') || 'en',
    timezone: localStorage.getItem('demo_timezone') || 'utc',
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Profile state
  const [profile, setProfile] = useState({
    fullName: localStorage.getItem('demo_profile_name') || 'John Doe',
    email: localStorage.getItem('demo_profile_email') || 'john.doe@example.com',
    bio: localStorage.getItem('demo_profile_bio') || 'Full-stack developer passionate about building great products.',
  });
  const [profileSaveStatus, setProfileSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Notifications state
  const loadNotificationSettings = () => {
    const saved = localStorage.getItem('demo_notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {
          emailNotifications: true,
          projectUpdates: true,
          securityAlerts: true,
          marketingEmails: false,
        };
      }
    }
    return {
      emailNotifications: true,
      projectUpdates: true,
      securityAlerts: true,
      marketingEmails: false,
    };
  };

  const [notifications, setNotifications] = useState(loadNotificationSettings());
  const [notificationsSaveStatus, setNotificationsSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handlePreferenceChange = (key: string, value: string) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSavePreferences = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      try {
        localStorage.setItem('demo_theme', preferences.theme);
        localStorage.setItem('demo_language', preferences.language);
        localStorage.setItem('demo_timezone', preferences.timezone);
        setSaveStatus('success');
        setTimeout(() => { setSaveStatus('idle'); }, 3000);
      } catch (error) {
        logger.error('Failed to save preferences', error);
        setSaveStatus('error');
        setTimeout(() => { setSaveStatus('idle'); }, 3000);
      }
    }, 500);
  };

  const handleProfileChange = (key: string, value: string) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = () => {
    setProfileSaveStatus('saving');
    setTimeout(() => {
      try {
        localStorage.setItem('demo_profile_name', profile.fullName);
        localStorage.setItem('demo_profile_email', profile.email);
        localStorage.setItem('demo_profile_bio', profile.bio);
        setProfileSaveStatus('success');
        setTimeout(() => { setProfileSaveStatus('idle'); }, 3000);
      } catch (error) {
        logger.error('Failed to save profile', error);
        setProfileSaveStatus('error');
        setTimeout(() => { setProfileSaveStatus('idle'); }, 3000);
      }
    }, 500);
  };

  const handleChangePassword = () => {
    pushToast({ message: 'Demo: Password change dialog would appear here. In production, this would open a modal or navigate to a password change page.', type: 'info' });
  };

  const handleEnable2FA = () => {
    pushToast({ message: 'Demo: Two-factor authentication setup would start here. In production, this would show QR code and setup instructions.', type: 'info' });
  };

  const handleNotificationChange = (key: string, checked: boolean) => {
    setNotifications((prev: typeof notifications) => ({ ...prev, [key]: checked }));
  };

  const handleSaveNotifications = () => {
    setNotificationsSaveStatus('saving');
    setTimeout(() => {
      try {
        localStorage.setItem('demo_notifications', JSON.stringify(notifications));
        setNotificationsSaveStatus('success');
        setTimeout(() => { setNotificationsSaveStatus('idle'); }, 3000);
      } catch (error) {
        logger.error('Failed to save notification settings', error);
        setNotificationsSaveStatus('error');
        setTimeout(() => { setNotificationsSaveStatus('idle'); }, 3000);
      }
    }, 500);
  };

  const sections = [
    { id: 'profile', label: 'Profiel' },
    { id: 'security', label: 'Beveiliging' },
    { id: 'notifications', label: 'Meldingen' },
    { id: 'preferences', label: 'Voorkeuren' },
    { id: 'trash', label: 'Prullenbak' },
  ];

  // Trash management
  const { isSystemAdmin } = useUserRole();
  const [trashContentTypeFilter, setTrashContentTypeFilter] = useState<number | undefined>(undefined);
  const trash = useTrash({ contentType: trashContentTypeFilter });

  // Get unique content types from stats for filter dropdown
  const trashContentTypes = trash.stats.map(s => ({
    id: s.content_type,
    label: s.content_type.split('.').pop() || s.content_type,
    count: s.count,
  }));

  // Handle restore with confirmation
  const handleTrashRestore = useCallback(async (id: string, objectRepr?: string) => {
    await trash.restore(id, objectRepr);
  }, [trash]);

  // Handle permanent delete with confirmation
  const handleTrashPermanentDelete = useCallback(async (id: string, objectRepr?: string) => {
    if (window.confirm(`Weet je zeker dat je "${objectRepr || 'dit item'}" definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
      await trash.permanentDelete(id, objectRepr);
    }
  }, [trash]);

  // Handle empty trash with confirmation
  const handleEmptyTrash = useCallback(async () => {
    if (window.confirm('Weet je zeker dat je de hele prullenbak wilt legen? Dit kan niet ongedaan worden gemaakt.')) {
      await trash.emptyTrash();
    }
  }, [trash]);

  return {
    activeSection, setActiveSection,
    preferences, profile, notifications,
    saveStatus, profileSaveStatus, notificationsSaveStatus,
    sections,
    handlePreferenceChange, handleSavePreferences,
    handleProfileChange, handleSaveProfile,
    handleChangePassword, handleEnable2FA,
    handleNotificationChange, handleSaveNotifications,
    // Trash
    isSystemAdmin,
    trash,
    trashContentTypeFilter, setTrashContentTypeFilter,
    trashContentTypes,
    handleTrashRestore, handleTrashPermanentDelete, handleEmptyTrash,
  };
}
