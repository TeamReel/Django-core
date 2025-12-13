import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Settings } from '../src/components/Settings';
import type { SettingsSectionConfig } from '../src/types';

/**
 * Settings template with section navigation and responsive layout.
 *
 * ## Features
 * - Section-based navigation (sidebar on desktop)
 * - Controlled/uncontrolled active section
 * - Keyboard navigation (Arrow keys, Enter, Space)
 * - Deep linking support via activeSection prop
 * - Responsive: sidebar → tabs → dropdown
 *
 * ## Accessibility
 * - `role="navigation"` on section list
 * - `role="region"` on section content
 * - `aria-current="page"` on active section
 * - Keyboard navigation support
 */
const meta = {
  title: 'Templates/Settings',
  component: Settings,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Settings template for preferences, configuration, and profile management.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    sections: { control: 'object' },
    sidebarLayout: {
      control: 'select',
      options: ['sticky', 'scrollable'],
    },
    mobileLayout: {
      control: 'select',
      options: ['tabs', 'dropdown'],
    },
  },
} satisfies Meta<typeof Settings>;

export default meta;
type Story = StoryObj<typeof meta>;

const basicSections: SettingsSectionConfig[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
];

/**
 * Basic settings with 3 sections.
 */
export const Basic: Story = {
  args: {
    sections: basicSections,
  },
  render: (args) => (
    <Settings {...args}>
      <Settings.Section sectionId="profile">
        <div style={{ maxWidth: '600px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Full Name
            <input
              type="text"
              defaultValue="John Doe"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginTop: '0.25rem',
              }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Email
            <input
              type="email"
              defaultValue="john@example.com"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginTop: '0.25rem',
              }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Bio
            <textarea
              defaultValue="Software developer"
              rows={3}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginTop: '0.25rem',
              }}
            />
          </label>
        </div>
      </Settings.Section>
      <Settings.Section sectionId="security">
        <div style={{ maxWidth: '600px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Current Password
            <input
              type="password"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginTop: '0.25rem',
              }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            New Password
            <input
              type="password"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginTop: '0.25rem',
              }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Confirm Password
            <input
              type="password"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginTop: '0.25rem',
              }}
            />
          </label>
        </div>
      </Settings.Section>
      <Settings.Section sectionId="notifications">
        <div style={{ maxWidth: '600px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <input type="checkbox" defaultChecked style={{ marginRight: '0.5rem' }} />
            <span>Email notifications</span>
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <input type="checkbox" style={{ marginRight: '0.5rem' }} />
            <span>SMS notifications</span>
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <input type="checkbox" defaultChecked style={{ marginRight: '0.5rem' }} />
            <span>Push notifications</span>
          </label>
        </div>
      </Settings.Section>
    </Settings>
  ),
};

/**
 * Controlled settings with external state management.
 */
export const Controlled: Story = {
  render: () => {
    const [activeSection, setActiveSection] = useState('profile');

    return (
      <div>
        <div
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>
            External State: Active section = "{activeSection}"
          </p>
          <div style={{ marginTop: '0.5rem' }}>
            <button
              onClick={() => setActiveSection('profile')}
              style={{
                padding: '0.25rem 0.75rem',
                marginRight: '0.5rem',
                fontSize: '12px',
              }}
            >
              Go to Profile
            </button>
            <button
              onClick={() => setActiveSection('security')}
              style={{
                padding: '0.25rem 0.75rem',
                marginRight: '0.5rem',
                fontSize: '12px',
              }}
            >
              Go to Security
            </button>
            <button
              onClick={() => setActiveSection('notifications')}
              style={{ padding: '0.25rem 0.75rem', fontSize: '12px' }}
            >
              Go to Notifications
            </button>
          </div>
        </div>
        <Settings
          sections={basicSections}
          activeSection={activeSection}
          onActiveSectionChange={setActiveSection}
        >
          <Settings.Section sectionId="profile">
            <div style={{ maxWidth: '600px' }}>
              <p>
                This is the <strong>Profile</strong> section. The parent component controls which
                section is active.
              </p>
            </div>
          </Settings.Section>
          <Settings.Section sectionId="security">
            <div style={{ maxWidth: '600px' }}>
              <p>
                This is the <strong>Security</strong> section. External buttons can navigate
                between sections.
              </p>
            </div>
          </Settings.Section>
          <Settings.Section sectionId="notifications">
            <div style={{ maxWidth: '600px' }}>
              <p>
                This is the <strong>Notifications</strong> section. Useful for deep linking or
                analytics tracking.
              </p>
            </div>
          </Settings.Section>
        </Settings>
      </div>
    );
  },
};

/**
 * Settings with icons in navigation.
 */
export const WithIcons: Story = {
  render: () => {
    const IconProfile = () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
      </svg>
    );

    const IconSecurity = () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
      </svg>
    );

    const IconNotifications = () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
      </svg>
    );

    const sectionsWithIcons: SettingsSectionConfig[] = [
      { id: 'profile', label: 'Profile', icon: IconProfile },
      { id: 'security', label: 'Security', icon: IconSecurity },
      { id: 'notifications', label: 'Notifications', icon: IconNotifications },
    ];

    return (
      <Settings sections={sectionsWithIcons}>
        <Settings.Section sectionId="profile">
          <div style={{ maxWidth: '600px' }}>
            <p>Profile settings with icon in navigation.</p>
          </div>
        </Settings.Section>
        <Settings.Section sectionId="security">
          <div style={{ maxWidth: '600px' }}>
            <p>Security settings with icon in navigation.</p>
          </div>
        </Settings.Section>
        <Settings.Section sectionId="notifications">
          <div style={{ maxWidth: '600px' }}>
            <p>Notification settings with icon in navigation.</p>
          </div>
        </Settings.Section>
      </Settings>
    );
  },
};

/**
 * Settings with many sections (scrolling navigation).
 */
export const ManySections: Story = {
  render: () => {
    const sections: SettingsSectionConfig[] = [
      { id: 'profile', label: 'Profile' },
      { id: 'account', label: 'Account' },
      { id: 'security', label: 'Security' },
      { id: 'notifications', label: 'Notifications' },
      { id: 'privacy', label: 'Privacy' },
      { id: 'billing', label: 'Billing' },
      { id: 'integrations', label: 'Integrations' },
      { id: 'advanced', label: 'Advanced' },
    ];

    return (
      <Settings sections={sections} sidebarLayout="scrollable">
        {sections.map((section) => (
          <Settings.Section key={section.id} sectionId={section.id}>
            <div style={{ maxWidth: '600px' }}>
              <p>Content for {section.label} section.</p>
              <p style={{ color: '#666', fontSize: '0.875rem' }}>
                This demonstrates navigation with many sections. The sidebar uses scrollable layout
                instead of sticky.
              </p>
            </div>
          </Settings.Section>
        ))}
      </Settings>
    );
  },
};

/**
 * Settings with section descriptions.
 */
export const WithDescriptions: Story = {
  render: () => {
    const sections: SettingsSectionConfig[] = [
      {
        id: 'profile',
        label: 'Profile',
        description: 'Manage your public profile information',
      },
      {
        id: 'security',
        label: 'Security',
        description: 'Password, two-factor authentication, and security settings',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        description: 'Choose how you want to be notified',
      },
    ];

    return (
      <Settings sections={sections}>
        <Settings.Section sectionId="profile">
          <div style={{ maxWidth: '600px' }}>
            <p>Profile content goes here.</p>
          </div>
        </Settings.Section>
        <Settings.Section sectionId="security">
          <div style={{ maxWidth: '600px' }}>
            <p>Security content goes here.</p>
          </div>
        </Settings.Section>
        <Settings.Section sectionId="notifications">
          <div style={{ maxWidth: '600px' }}>
            <p>Notification content goes here.</p>
          </div>
        </Settings.Section>
      </Settings>
    );
  },
};

/**
 * Settings starting on a specific section (deep linking).
 */
export const DeepLink: Story = {
  args: {
    sections: basicSections,
    defaultActiveSection: 'security',
  },
  render: (args) => (
    <Settings {...args}>
      <Settings.Section sectionId="profile">
        <div style={{ maxWidth: '600px' }}>
          <p>Profile section.</p>
        </div>
      </Settings.Section>
      <Settings.Section sectionId="security">
        <div style={{ maxWidth: '600px' }}>
          <p>
            <strong>This section is shown by default</strong> because `defaultActiveSection="security"`.
          </p>
          <p>Useful for deep linking from emails or notifications.</p>
        </div>
      </Settings.Section>
      <Settings.Section sectionId="notifications">
        <div style={{ maxWidth: '600px' }}>
          <p>Notifications section.</p>
        </div>
      </Settings.Section>
    </Settings>
  ),
};

// ============================================================================
// State Override Stories
// ============================================================================

export const CustomLoadingState: Story = {
  name: 'Custom Loading State',
  args: {
    sections: [
      { id: 'profile', label: 'Profile' },
      { id: 'security', label: 'Security' },
    ],
    loading: true,
    renderLoading: () => (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚙️</div>
          <h3>Loading Settings...</h3>
          <p style={{ color: '#6b7280' }}>Fetching your preferences</p>
        </div>
      </div>
    ),
  },
  render: (args) => (
    <Settings {...args}>
      <Settings.Section sectionId="profile"><div>Content</div></Settings.Section>
      <Settings.Section sectionId="security"><div>Content</div></Settings.Section>
    </Settings>
  ),
};

export const CustomEmptyState: Story = {
  name: 'Custom Empty State',
  args: {
    sections: [],
    isEmpty: true,
    renderEmpty: () => (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '400px', margin: '0 auto' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔧</div>
        <h3>No Settings Available</h3>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Settings sections haven't been configured yet. Contact your administrator.
        </p>
        <button
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            backgroundColor: '#fff',
            cursor: 'pointer',
          }}
        >
          Go Back
        </button>
      </div>
    ),
  },
  render: (args) => <Settings {...args}>{/* No sections */}</Settings>,
};

export const CustomErrorState: Story = {
  name: 'Custom Error State',
  args: {
    sections: [
      { id: 'profile', label: 'Profile' },
      { id: 'security', label: 'Security' },
    ],
    error: new Error('Failed to load settings'),
    renderError: (error) => (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '400px', margin: '0 auto' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#dc2626' }}>❗</div>
        <h3 style={{ color: '#dc2626' }}>Settings Unavailable</h3>
        <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
          {error?.message || 'Could not load settings'}
        </p>
        <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1.5rem' }}>
          Your changes may not be saved. Please try again.
        </p>
        <button
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            backgroundColor: '#fff',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    ),
  },
  render: (args) => (
    <Settings {...args}>
      <Settings.Section sectionId="profile"><div>Content</div></Settings.Section>
      <Settings.Section sectionId="security"><div>Content</div></Settings.Section>
    </Settings>
  ),
};

export const CustomPermissionDeniedState: Story = {
  name: 'Custom Permission Denied State',
  args: {
    sections: [
      { id: 'billing', label: 'Billing' },
      { id: 'team', label: 'Team' },
    ],
    permissionDenied: true,
    renderPermissionDenied: () => (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '400px', margin: '0 auto' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
        <h3>Admin Only</h3>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          These settings are restricted to account administrators. Contact your admin to make changes.
        </p>
        <button
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            backgroundColor: '#fff',
            cursor: 'pointer',
          }}
        >
          Contact Admin
        </button>
      </div>
    ),
  },
  render: (args) => (
    <Settings {...args}>
      <Settings.Section sectionId="billing"><div>Content</div></Settings.Section>
      <Settings.Section sectionId="team"><div>Content</div></Settings.Section>
    </Settings>
  ),
};
