/**
 * State & handlers for SettingsPage, extracted so the page file focuses on JSX.
 */
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useSettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize activeSection from URL hash, fallback to localStorage, then 'profile'
  const getInitialSection = () => {
    const hash = location.hash.replace('#', '');
    if (hash && ['profile', 'security', 'notifications', 'preferences'].includes(hash)) {
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
        console.error(error);
        console.error('Failed to save preferences:', error);
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
        console.error(error);
        console.error('Failed to save profile:', error);
        setProfileSaveStatus('error');
        setTimeout(() => { setProfileSaveStatus('idle'); }, 3000);
      }
    }, 500);
  };

  const handleChangePassword = () => {
    alert('Demo: Password change dialog would appear here.\nIn production, this would open a modal or navigate to a password change page.');
  };

  const handleEnable2FA = () => {
    alert('Demo: Two-factor authentication setup would start here.\nIn production, this would show QR code and setup instructions.');
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
        console.error(error);
        console.error('Failed to save notification settings:', error);
        setNotificationsSaveStatus('error');
        setTimeout(() => { setNotificationsSaveStatus('idle'); }, 3000);
      }
    }, 500);
  };

  const sections = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'preferences', label: 'Preferences' },
  ];

  return {
    activeSection, setActiveSection,
    preferences, profile, notifications,
    saveStatus, profileSaveStatus, notificationsSaveStatus,
    sections,
    handlePreferenceChange, handleSavePreferences,
    handleProfileChange, handleSaveProfile,
    handleChangePassword, handleEnable2FA,
    handleNotificationChange, handleSaveNotifications,
  };
}
