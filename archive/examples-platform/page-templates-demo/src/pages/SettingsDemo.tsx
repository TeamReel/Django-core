import { Settings } from '@django-core/page-templates';

const sections = [
  { id: 'general', label: 'General' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'appearance', label: 'Appearance' },
];

export default function SettingsDemo() {
  return (
    <div style={{ height: 'calc(100vh - 80px)' }}>
      <Settings sections={sections}>
        <Settings.Section sectionId="general" title="General Settings">
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: '0.5rem',
                }}
              >
                Account Name
              </label>
              <input
                type="text"
                placeholder="Your account name"
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                }}
              />
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                This is your public display name
              </p>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: '0.5rem',
                }}
              >
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                }}
              />
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Your email address for account notifications
              </p>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: '0.5rem',
                }}
              >
                Language
              </label>
              <select
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                }}
              >
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </div>

            <div>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </Settings.Section>

        <Settings.Section sectionId="security" title="Security Settings">
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Password
              </h4>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  background: 'white',
                  cursor: 'pointer',
                }}
              >
                Change Password
              </button>
            </div>

            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Two-Factor Authentication
              </h4>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                Add an extra layer of security to your account
              </p>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: '#10b981',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Enable 2FA
              </button>
            </div>

            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Active Sessions
              </h4>
              <div
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  marginBottom: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>Current Session</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Windows • Chrome • Last active: Now
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      background: '#dcfce7',
                      color: '#166534',
                      fontSize: '0.75rem',
                    }}
                  >
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Settings.Section>

        <Settings.Section sectionId="notifications" title="Notification Preferences">
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                <input type="checkbox" defaultChecked style={{ width: '1rem', height: '1rem' }} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Email Notifications</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Receive email updates about your account
                  </div>
                </div>
              </label>
            </div>

            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                <input type="checkbox" defaultChecked style={{ width: '1rem', height: '1rem' }} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Push Notifications</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Receive push notifications in your browser
                  </div>
                </div>
              </label>
            </div>

            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                <input type="checkbox" style={{ width: '1rem', height: '1rem' }} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Marketing Emails</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Receive emails about new features and updates
                  </div>
                </div>
              </label>
            </div>

            <div>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </Settings.Section>

        <Settings.Section sectionId="appearance" title="Appearance">
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: '0.5rem',
                }}
              >
                Theme
              </label>
              <select
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                }}
              >
                <option>Light</option>
                <option>Dark</option>
                <option>Auto</option>
              </select>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Choose your interface theme
              </p>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: '0.5rem',
                }}
              >
                Density
              </label>
              <select
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                }}
              >
                <option>Comfortable</option>
                <option>Compact</option>
                <option>Spacious</option>
              </select>
            </div>

            <div>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Apply Changes
              </button>
            </div>
          </div>
        </Settings.Section>
      </Settings>
    </div>
  );
}
