import { Settings } from '@django-core/page-templates';
import AppShell from '../components/AppShell';
import { useSettingsPage } from './useSettingsPage';

export default function SettingsPage() {
  const {
    activeSection, setActiveSection,
    preferences, profile, notifications,
    saveStatus, profileSaveStatus, notificationsSaveStatus,
    sections,
    handlePreferenceChange, handleSavePreferences,
    handleProfileChange, handleSaveProfile,
    handleChangePassword, handleEnable2FA,
    handleNotificationChange, handleSaveNotifications,
  } = useSettingsPage();

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
            <div className="max-w-600">
              <h2 className="mb-8" style={{ marginTop: 0 }}>Profile Settings</h2>
              <p className="text-muted mb-32">
                Manage your personal information and public profile
              </p>

              <div className="flex-col gap-20">
                <div>
                  <label className="block mb-8 fw-600">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => handleProfileChange('fullName', e.target.value)}
                    className="w-full border rounded-4 fs-14"
                    style={{ padding: '10px 12px' }}
                  />
                </div>

                <div>
                  <label className="block mb-8 fw-600">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    className="w-full border rounded-4 fs-14"
                    style={{ padding: '10px 12px' }}
                  />
                  <small className="text-muted fs-12 mt-4 block">
                    Your email is used for notifications and account recovery
                  </small>
                </div>

                <div>
                  <label className="block mb-8 fw-600">
                    Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                    rows={4}
                    className="w-full border rounded-4 fs-14"
                    style={{
                      padding: '10px 12px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileSaveStatus === 'saving'}
                    className="border-none rounded-4 fs-14 fw-600"
                    style={{
                      padding: '10px 20px',
                      backgroundColor:
                        profileSaveStatus === 'success' ? '#28a745' :
                        profileSaveStatus === 'error' ? '#dc3545' :
                        profileSaveStatus === 'saving' ? '#6c757d' :
                        '#007bff',
                      color: 'white',
                      cursor: profileSaveStatus === 'saving' ? 'not-allowed' : 'pointer',
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
            <div className="max-w-600">
              <h2 className="mb-8" style={{ marginTop: 0 }}>Security Settings</h2>
              <p className="text-muted mb-32">
                Manage your password, two-factor authentication, and security preferences
              </p>

              <div className="flex-col gap-24">
                <div className="border rounded-8 p-20" style={{ backgroundColor: '#f8f9fa' }}>
                  <h3 className="mb-8 fs-16" style={{ marginTop: 0 }}>Password</h3>
                  <p className="text-muted fs-14 mb-16">
                    Last changed 3 months ago
                  </p>
                  <button
                    onClick={handleChangePassword}
                    className="py-8 px-16 border rounded-4 fs-14 cursor-pointer fw-600"
                    style={{
                      backgroundColor: 'white',
                      color: '#333'
                    }}
                  >
                    Change Password
                  </button>
                </div>

                <div className="border rounded-8 p-20" style={{ backgroundColor: '#f8f9fa' }}>
                  <h3 className="mb-8 fs-16" style={{ marginTop: 0 }}>Two-Factor Authentication</h3>
                  <p className="text-muted fs-14 mb-16">
                    Add an extra layer of security to your account
                  </p>
                  <div className="flex-row gap-12">
                    <span
                      className="inline-block py-4 px-12 fs-12 fw-600"
                      style={{
                        borderRadius: '16px',
                        backgroundColor: '#dc354520',
                        color: '#dc3545'
                      }}
                    >
                      Not Enabled
                    </span>
                    <button
                      onClick={handleEnable2FA}
                      className="py-8 px-16 border-none rounded-4 fs-14 cursor-pointer fw-600"
                      style={{
                        backgroundColor: '#28a745',
                        color: 'white'
                      }}
                    >
                      Enable 2FA
                    </button>
                  </div>
                </div>

                <div className="border rounded-8 p-20" style={{ backgroundColor: '#f8f9fa' }}>
                  <h3 className="mb-8 fs-16" style={{ marginTop: 0 }}>Active Sessions</h3>
                  <p className="text-muted fs-14 mb-16">
                    Manage devices where you're currently logged in
                  </p>
                  <div className="flex-col gap-12">
                    <div className="flex-between">
                      <div>
                        <div className="fw-600 fs-14">Windows PC</div>
                        <div className="fs-12 text-muted">Last active: Just now</div>
                      </div>
                      <span
                        className="py-4 px-12 fs-12 fw-600"
                        style={{
                          borderRadius: '16px',
                          backgroundColor: '#28a74520',
                          color: '#28a745'
                        }}
                      >
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
            <div className="max-w-600">
              <h2 className="mb-8" style={{ marginTop: 0 }}>Notification Preferences</h2>
              <p className="text-muted mb-32">
                Choose what notifications you want to receive
              </p>

              <div className="flex-col gap-16">
                {[
                  { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive important updates via email' },
                  { key: 'projectUpdates', label: 'Project Updates', description: 'Get notified about project changes' },
                  { key: 'securityAlerts', label: 'Security Alerts', description: 'Critical security notifications' },
                  { key: 'marketingEmails', label: 'Marketing Emails', description: 'Product updates and tips' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-16 border rounded-8"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      backgroundColor: '#f8f9fa'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={notifications[item.key as keyof typeof notifications]}
                      onChange={(e) => handleNotificationChange(item.key, e.target.checked)}
                      className="mt-4"
                      style={{ marginRight: '12px' }}
                    />
                    <div className="flex-1">
                      <div className="fw-600 mb-4">{item.label}</div>
                      <div className="fs-14 text-muted">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '20px' }}>
                <button
                  onClick={handleSaveNotifications}
                  disabled={notificationsSaveStatus === 'saving'}
                  className="border-none rounded-4 fs-14 fw-600"
                  style={{
                    padding: '10px 20px',
                    backgroundColor:
                      notificationsSaveStatus === 'success' ? '#28a745' :
                      notificationsSaveStatus === 'error' ? '#dc3545' :
                      notificationsSaveStatus === 'saving' ? '#6c757d' :
                      '#007bff',
                    color: 'white',
                    cursor: notificationsSaveStatus === 'saving' ? 'not-allowed' : 'pointer',
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
            <div className="max-w-600">
              <h2 className="mb-8" style={{ marginTop: 0 }}>Application Preferences</h2>
              <p className="text-muted mb-32">
                Customize your application experience
              </p>

              <div className="flex-col gap-20">
                <div>
                  <label className="block mb-8 fw-600">
                    Theme
                  </label>
                  <select
                    value={preferences.theme}
                    onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                    className="w-full border rounded-4 fs-14"
                    style={{ padding: '10px 12px' }}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-8 fw-600">
                    Language
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) => handlePreferenceChange('language', e.target.value)}
                    className="w-full border rounded-4 fs-14"
                    style={{ padding: '10px 12px' }}
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
                  <label className="block mb-8 fw-600">
                    Timezone
                  </label>
                  <select
                    value={preferences.timezone}
                    onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                    className="w-full border rounded-4 fs-14"
                    style={{ padding: '10px 12px' }}
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
                    className="border-none rounded-4 fs-14 fw-600"
                    style={{
                      padding: '10px 20px',
                      backgroundColor:
                        saveStatus === 'success' ? '#28a745' :
                        saveStatus === 'error' ? '#dc3545' :
                        saveStatus === 'saving' ? '#6c757d' :
                        '#007bff',
                      color: 'white',
                      cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
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
