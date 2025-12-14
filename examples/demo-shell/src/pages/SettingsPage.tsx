import { useState } from 'react';
import { Settings } from '@django-core/page-templates';
import AppShell from '../components/AppShell';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');

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
                    defaultValue="John Doe"
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
                    defaultValue="john.doe@example.com"
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
                    defaultValue="Full-stack developer passionate about building great products."
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
                  <button style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}>
                    Save Changes
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
                  <button style={{
                    padding: '8px 16px',
                    backgroundColor: 'white',
                    color: '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}>
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
                    <button style={{
                      padding: '8px 16px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}>
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
                  { label: 'Email Notifications', description: 'Receive important updates via email', checked: true },
                  { label: 'Project Updates', description: 'Get notified about project changes', checked: true },
                  { label: 'Security Alerts', description: 'Critical security notifications', checked: true },
                  { label: 'Marketing Emails', description: 'Product updates and tips', checked: false },
                ].map((item, idx) => (
                  <div
                    key={idx}
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
                      defaultChecked={item.checked}
                      style={{ marginTop: '4px', marginRight: '12px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{item.label}</div>
                      <div style={{ fontSize: '14px', color: '#666' }}>{item.description}</div>
                    </div>
                  </div>
                ))}
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
                    defaultValue="light"
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
                    defaultValue="en"
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
                    <option value="de">German</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    Timezone
                  </label>
                  <select
                    defaultValue="utc"
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
                  <button style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}>
                    Save Preferences
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
