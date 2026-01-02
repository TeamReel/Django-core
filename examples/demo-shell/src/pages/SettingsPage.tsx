import { useState, useEffect } from 'react';
import { Settings } from '@django-core/page-templates';
import AppShell from '../components/AppShell';
import { useLocation, useNavigate } from 'react-router-dom';

export default function SettingsPage() {
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

    // Simulate API call delay
    setTimeout(() => {
      try {
        // Save to localStorage (in real app, this would be an API call)
        localStorage.setItem('demo_theme', preferences.theme);
        localStorage.setItem('demo_language', preferences.language);
        localStorage.setItem('demo_timezone', preferences.timezone);

        setSaveStatus('success');

        // Reset success message after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      } catch (error) {
        console.error('Failed to save preferences:', error);
        setSaveStatus('error');

        // Reset error message after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
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

        setTimeout(() => {
          setProfileSaveStatus('idle');
        }, 3000);
      } catch (error) {
        console.error('Failed to save profile:', error);
        setProfileSaveStatus('error');

        setTimeout(() => {
          setProfileSaveStatus('idle');
        }, 3000);
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

        setTimeout(() => {
          setNotificationsSaveStatus('idle');
        }, 3000);
      } catch (error) {
        console.error('Failed to save notification settings:', error);
        setNotificationsSaveStatus('error');

        setTimeout(() => {
          setNotificationsSaveStatus('idle');
        }, 3000);
      }
    }, 500);
  };

  const sections = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'preferences', label: 'Preferences' },
  ];

  return (
    <AppShell>
      <div style={{ height: 'calc(100vh - 120px)' }}>
        <Settings
          sections={sections}
          activeSection={activeSection}
          onActiveSectionChange={setActiveSection}
          aria-label="User Settings"
        >
          {/* Profile Section */}
          <Settings.Section sectionId="profile">
            <div style={{ maxWidth: '600px' }}>
              <h2 style={{ marginTop: 0, marginBottom: '8px' }}>Profile Settings</h2>
              <p style={{ color: '#666', marginBottom: '32px' }}>
                Manage your personal information and public profile
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => handleProfileChange('fullName', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Your email is used for notifications and account recovery
                  </small>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileSaveStatus === 'saving'}
                    style={{
                      padding: '10px 20px',
                      backgroundColor:
                        profileSaveStatus === 'success' ? '#28a745' :
                        profileSaveStatus === 'error' ? '#dc3545' :
                        profileSaveStatus === 'saving' ? '#6c757d' :
                        '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: profileSaveStatus === 'saving' ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {profileSaveStatus === 'saving' ? 'Saving...' :
                     profileSaveStatus === 'success' ? '✓ Saved!' :
                     profileSaveStatus === 'error' ? '✗ Failed' :
                     'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </Settings.Section>

          {/* Security Section */}
          <Settings.Section sectionId="security">
            <div style={{ maxWidth: '600px' }}>
              <h2 style={{ marginTop: 0, marginBottom: '8px' }}>Security Settings</h2>
              <p style={{ color: '#666', marginBottom: '32px' }}>
                Manage your password, two-factor authentication, and security preferences
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: '#f8f9fa'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '16px' }}>Password</h3>
                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                    Last changed 3 months ago
                  </p>
                  <button
                    onClick={handleChangePassword}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'white',
                      color: '#333',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Change Password
                  </button>
                </div>

                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: '#f8f9fa'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '16px' }}>Two-Factor Authentication</h3>
                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                    Add an extra layer of security to your account
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: '#dc354520',
                      color: '#dc3545'
                    }}>
                      Not Enabled
                    </span>
                    <button
                      onClick={handleEnable2FA}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Enable 2FA
                    </button>
                  </div>
                </div>

                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: '#f8f9fa'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '16px' }}>Active Sessions</h3>
                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                    Manage devices where you're currently logged in
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>Windows PC</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Last active: Just now</div>
                      </div>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: '#28a74520',
                        color: '#28a745'
                      }}>
                        Current
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Settings.Section>

          {/* Notifications Section */}
          <Settings.Section sectionId="notifications">
            <div style={{ maxWidth: '600px' }}>
              <h2 style={{ marginTop: 0, marginBottom: '8px' }}>Notification Preferences</h2>
              <p style={{ color: '#666', marginBottom: '32px' }}>
                Choose what notifications you want to receive
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive important updates via email' },
                  { key: 'projectUpdates', label: 'Project Updates', description: 'Get notified about project changes' },
                  { key: 'securityAlerts', label: 'Security Alerts', description: 'Critical security notifications' },
                  { key: 'marketingEmails', label: 'Marketing Emails', description: 'Product updates and tips' },
                ].map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: '#f8f9fa'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={notifications[item.key as keyof typeof notifications]}
                      onChange={(e) => handleNotificationChange(item.key, e.target.checked)}
                      style={{ marginTop: '4px', marginRight: '12px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{item.label}</div>
                      <div style={{ fontSize: '14px', color: '#666' }}>{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '20px' }}>
                <button
                  onClick={handleSaveNotifications}
                  disabled={notificationsSaveStatus === 'saving'}
                  style={{
                    padding: '10px 20px',
                    backgroundColor:
                      notificationsSaveStatus === 'success' ? '#28a745' :
                      notificationsSaveStatus === 'error' ? '#dc3545' :
                      notificationsSaveStatus === 'saving' ? '#6c757d' :
                      '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: notificationsSaveStatus === 'saving' ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    transition: 'background-color 0.2s'
                  }}
                >
                  {notificationsSaveStatus === 'saving' ? 'Saving...' :
                   notificationsSaveStatus === 'success' ? '✓ Saved!' :
                   notificationsSaveStatus === 'error' ? '✗ Failed' :
                   'Save Notification Settings'}
                </button>
              </div>
            </div>
          </Settings.Section>

          {/* Preferences Section */}
          <Settings.Section sectionId="preferences">
            <div style={{ maxWidth: '600px' }}>
              <h2 style={{ marginTop: 0, marginBottom: '8px' }}>Application Preferences</h2>
              <p style={{ color: '#666', marginBottom: '32px' }}>
                Customize your application experience
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    Theme
                  </label>
                  <select
                    value={preferences.theme}
                    onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    Language
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) => handlePreferenceChange('language', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="it">Italian</option>
                    <option value="de">German</option>
                    <option value="nl">Nederlands</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    Timezone
                  </label>
                  <select
                    value={preferences.timezone}
                    onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="utc">UTC</option>
                    <option value="est">Eastern Time (ET)</option>
                    <option value="pst">Pacific Time (PT)</option>
                    <option value="cet">Central European Time (CET)</option>
                  </select>
                </div>

                <div>
                  <button
                    onClick={handleSavePreferences}
                    disabled={saveStatus === 'saving'}
                    style={{
                      padding: '10px 20px',
                      backgroundColor:
                        saveStatus === 'success' ? '#28a745' :
                        saveStatus === 'error' ? '#dc3545' :
                        saveStatus === 'saving' ? '#6c757d' :
                        '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {saveStatus === 'saving' ? 'Saving...' :
                     saveStatus === 'success' ? '✓ Saved!' :
                     saveStatus === 'error' ? '✗ Failed' :
                     'Save Preferences'}
                  </button>
                </div>
              </div>
            </div>
          </Settings.Section>
        </Settings>
      </div>
    </AppShell>
  );
}
