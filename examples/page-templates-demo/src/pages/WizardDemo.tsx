import { useState } from 'react';
import { Wizard } from '@django-core/page-templates';

const steps = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'profile', label: 'Profile' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'review', label: 'Review' },
];

export default function WizardDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    notifications: true,
    theme: 'light',
  });

  const handleComplete = () => {
    alert('Onboarding completed! Form data: ' + JSON.stringify(formData, null, 2));
    setCurrentStep(0);
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel onboarding?')) {
      setCurrentStep(0);
      setFormData({ name: '', email: '', notifications: true, theme: 'light' });
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Wizard
          steps={steps}
          stepIndex={currentStep}
          onStepIndexChange={setCurrentStep}
          onComplete={handleComplete}
          onCancel={handleCancel}
        >
          <Wizard.Step stepId="welcome">
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '1rem' }}>
                Welcome! 👋
              </h2>
              <p style={{ fontSize: '1.125rem', color: '#6b7280', marginBottom: '2rem' }}>
                Let's get you set up. This will only take a few minutes.
              </p>
              <div
                style={{
                  padding: '1.5rem',
                  background: '#eff6ff',
                  borderRadius: '0.5rem',
                  border: '1px solid #bfdbfe',
                }}
              >
                <p style={{ color: '#1e40af' }}>
                  We'll guide you through setting up your profile and preferences.
                </p>
              </div>
            </div>
          </Wizard.Step>

          <Wizard.Step stepId="profile">
            <div style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                Create Your Profile
              </h2>
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
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                    }}
                  />
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
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                    }}
                  />
                </div>
              </div>
            </div>
          </Wizard.Step>

          <Wizard.Step stepId="preferences">
            <div style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                Set Your Preferences
              </h2>
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
                    <input
                      type="checkbox"
                      checked={formData.notifications}
                      onChange={(e) =>
                        setFormData({ ...formData, notifications: e.target.checked })
                      }
                      style={{ width: '1rem', height: '1rem' }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Enable email notifications
                    </span>
                  </label>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                    Receive updates about your account activity
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
                    Theme
                  </label>
                  <select
                    value={formData.theme}
                    onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                    }}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
              </div>
            </div>
          </Wizard.Step>

          <Wizard.Step stepId="review">
            <div style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                Review Your Information
              </h2>
              <div
                style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '1.5rem',
                  display: 'grid',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    Name
                  </div>
                  <div style={{ fontWeight: 500 }}>{formData.name || 'Not provided'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    Email
                  </div>
                  <div style={{ fontWeight: 500 }}>{formData.email || 'Not provided'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    Notifications
                  </div>
                  <div style={{ fontWeight: 500 }}>
                    {formData.notifications ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    Theme
                  </div>
                  <div style={{ fontWeight: 500 }}>
                    {formData.theme.charAt(0).toUpperCase() + formData.theme.slice(1)}
                  </div>
                </div>
              </div>
            </div>
          </Wizard.Step>
        </Wizard>
      </div>
    </div>
  );
}
