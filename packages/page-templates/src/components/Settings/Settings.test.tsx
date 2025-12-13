import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Settings } from './Settings';

const mockSections = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
];

describe('Settings', () => {
  describe('Basic Rendering', () => {
    it('renders settings with children', () => {
      render(
        <Settings sections={mockSections}>
          <Settings.Section sectionId="profile">Profile Content</Settings.Section>
          <Settings.Section sectionId="security">Security Content</Settings.Section>
          <Settings.Section sectionId="notifications">Notifications Content</Settings.Section>
        </Settings>
      );

      expect(screen.getByText('Profile Content')).toBeInTheDocument();
      expect(screen.queryByText('Security Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Notifications Content')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <Settings sections={mockSections} className="custom-settings">
          <Settings.Section sectionId="profile">Content</Settings.Section>
        </Settings>
      );

      expect(container.querySelector('.custom-settings')).toBeInTheDocument();
    });

    it('applies custom aria-label', () => {
      render(
        <Settings sections={mockSections} aria-label="User Settings">
          <Settings.Section sectionId="profile">Content</Settings.Section>
        </Settings>
      );

      expect(screen.getByLabelText('User Settings')).toBeInTheDocument();
    });
  });

  describe('Section Navigation', () => {
    it('renders first section by default', () => {
      render(
        <Settings sections={mockSections}>
          <Settings.Section sectionId="profile">Profile Content</Settings.Section>
          <Settings.Section sectionId="security">Security Content</Settings.Section>
        </Settings>
      );

      expect(screen.getByText('Profile Content')).toBeInTheDocument();
      expect(screen.queryByText('Security Content')).not.toBeInTheDocument();
    });

    it('navigates to clicked section', () => {
      render(
        <Settings sections={mockSections}>
          <Settings.Section sectionId="profile">Profile Content</Settings.Section>
          <Settings.Section sectionId="security">Security Content</Settings.Section>
          <Settings.Section sectionId="notifications">Notifications Content</Settings.Section>
        </Settings>
      );

      expect(screen.getByText('Profile Content')).toBeInTheDocument();

      const securityButton = screen.getByText('Security');
      fireEvent.click(securityButton);

      expect(screen.queryByText('Profile Content')).not.toBeInTheDocument();
      expect(screen.getByText('Security Content')).toBeInTheDocument();
    });

    it('highlights active section', () => {
      render(
        <Settings sections={mockSections}>
          <Settings.Section sectionId="profile">Profile Content</Settings.Section>
        </Settings>
      );

      const profileButton = screen.getByRole('button', { name: /Profile/ });
      expect(profileButton).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Controlled State', () => {
    it('supports controlled activeSection', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <Settings
          sections={mockSections}
          activeSection="profile"
          onActiveSectionChange={handleChange}
        >
          <Settings.Section sectionId="profile">Profile Content</Settings.Section>
          <Settings.Section sectionId="security">Security Content</Settings.Section>
        </Settings>
      );

      expect(screen.getByText('Profile Content')).toBeInTheDocument();

      const securityButton = screen.getByText('Security');
      fireEvent.click(securityButton);

      expect(handleChange).toHaveBeenCalledWith('security');

      // Simulate parent updating controlled prop
      rerender(
        <Settings
          sections={mockSections}
          activeSection="security"
          onActiveSectionChange={handleChange}
        >
          <Settings.Section sectionId="profile">Profile Content</Settings.Section>
          <Settings.Section sectionId="security">Security Content</Settings.Section>
        </Settings>
      );

      expect(screen.queryByText('Profile Content')).not.toBeInTheDocument();
      expect(screen.getByText('Security Content')).toBeInTheDocument();
    });

    it('supports uncontrolled with defaultActiveSection', () => {
      render(
        <Settings sections={mockSections} defaultActiveSection="security">
          <Settings.Section sectionId="profile">Profile Content</Settings.Section>
          <Settings.Section sectionId="security">Security Content</Settings.Section>
        </Settings>
      );

      expect(screen.queryByText('Profile Content')).not.toBeInTheDocument();
      expect(screen.getByText('Security Content')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates with Enter key', () => {
      render(
        <Settings sections={mockSections}>
          <Settings.Section sectionId="profile">Profile Content</Settings.Section>
          <Settings.Section sectionId="security">Security Content</Settings.Section>
        </Settings>
      );

      const securityButton = screen.getByText('Security');
      fireEvent.keyDown(securityButton, { key: 'Enter' });

      expect(screen.queryByText('Profile Content')).not.toBeInTheDocument();
      expect(screen.getByText('Security Content')).toBeInTheDocument();
    });

    it('navigates with Space key', () => {
      render(
        <Settings sections={mockSections}>
          <Settings.Section sectionId="profile">Profile Content</Settings.Section>
          <Settings.Section sectionId="security">Security Content</Settings.Section>
        </Settings>
      );

      const securityButton = screen.getByText('Security');
      fireEvent.keyDown(securityButton, { key: ' ' });

      expect(screen.queryByText('Profile Content')).not.toBeInTheDocument();
      expect(screen.getByText('Security Content')).toBeInTheDocument();
    });

    it('navigates with ArrowDown key', () => {
      render(
        <Settings sections={mockSections}>
          <Settings.Section sectionId="profile">Profile Content</Settings.Section>
          <Settings.Section sectionId="security">Security Content</Settings.Section>
          <Settings.Section sectionId="notifications">Notifications Content</Settings.Section>
        </Settings>
      );

      const profileButton = screen.getByRole('button', { name: /Profile/ });
      fireEvent.keyDown(profileButton, { key: 'ArrowDown' });

      expect(screen.queryByText('Profile Content')).not.toBeInTheDocument();
      expect(screen.getByText('Security Content')).toBeInTheDocument();
    });

    it('navigates with ArrowUp key', () => {
      render(
        <Settings sections={mockSections} defaultActiveSection="security">
          <Settings.Section sectionId="profile">Profile Content</Settings.Section>
          <Settings.Section sectionId="security">Security Content</Settings.Section>
        </Settings>
      );

      const securityButton = screen.getByRole('button', { name: /Security/ });
      fireEvent.keyDown(securityButton, { key: 'ArrowUp' });

      expect(screen.getByText('Profile Content')).toBeInTheDocument();
      expect(screen.queryByText('Security Content')).not.toBeInTheDocument();
    });

    it('wraps around with ArrowDown at last section', () => {
      render(
        <Settings sections={mockSections} defaultActiveSection="notifications">
          <Settings.Section sectionId="profile">Profile Content</Settings.Section>
          <Settings.Section sectionId="security">Security Content</Settings.Section>
          <Settings.Section sectionId="notifications">Notifications Content</Settings.Section>
        </Settings>
      );

      const notificationsButton = screen.getByRole('button', { name: /Notifications/ });
      fireEvent.keyDown(notificationsButton, { key: 'ArrowDown' });

      expect(screen.getByText('Profile Content')).toBeInTheDocument();
      expect(screen.queryByText('Notifications Content')).not.toBeInTheDocument();
    });
  });

  describe('Section Configuration', () => {
    it('validates invalid activeSection and defaults to first', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(
        <Settings sections={mockSections} defaultActiveSection="invalid-section">
          <Settings.Section sectionId="profile">Profile Content</Settings.Section>
        </Settings>
      );

      expect(screen.getByText('Profile Content')).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Active section "invalid-section" not found')
      );

      consoleSpy.mockRestore();
    });

    it('displays section title from config', () => {
      render(
        <Settings sections={mockSections}>
          <Settings.Section sectionId="profile">Content</Settings.Section>
        </Settings>
      );

      expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    });

    it('allows section title override', () => {
      render(
        <Settings sections={mockSections}>
          <Settings.Section sectionId="profile" title="My Profile">
            Content
          </Settings.Section>
        </Settings>
      );

      expect(screen.getByText('My Profile')).toBeInTheDocument();
    });

    it('displays section description when provided', () => {
      const sectionsWithDesc = [
        { id: 'profile', label: 'Profile', description: 'Manage your profile information' },
      ];

      render(
        <Settings sections={sectionsWithDesc}>
          <Settings.Section sectionId="profile">Content</Settings.Section>
        </Settings>
      );

      expect(screen.getByText('Manage your profile information')).toBeInTheDocument();
    });
  });

  describe('Compound Components', () => {
    it('attaches Section sub-component', () => {
      expect(Settings.Section).toBeDefined();
      expect(typeof Settings.Section).toBe('function');
    });

    it('attaches Navigation sub-component', () => {
      expect(Settings.Navigation).toBeDefined();
      expect(typeof Settings.Navigation).toBe('function');
    });
  });
});

describe('SettingsSection', () => {
  it('renders only when active', () => {
    render(
      <Settings sections={mockSections}>
        <Settings.Section sectionId="profile">Profile Content</Settings.Section>
        <Settings.Section sectionId="security">Security Content</Settings.Section>
      </Settings>
    );

    expect(screen.getByText('Profile Content')).toBeInTheDocument();
    expect(screen.queryByText('Security Content')).not.toBeInTheDocument();
  });

  it('renders with divider when specified', () => {
    const { container } = render(
      <Settings sections={mockSections}>
        <Settings.Section sectionId="profile" showDivider>
          Content
        </Settings.Section>
      </Settings>
    );

    const divider = container.querySelector('hr');
    expect(divider).toBeInTheDocument();
  });
});

describe('SettingsNavigation', () => {
  it('renders all section labels', () => {
    render(
      <Settings sections={mockSections}>
        <Settings.Section sectionId="profile">Content</Settings.Section>
      </Settings>
    );

    expect(screen.getByRole('button', { name: /Profile/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Security/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Notifications/ })).toBeInTheDocument();
  });

  it('renders section icons when provided', () => {
    const IconComponent = () => <svg data-testid="test-icon" />;
    const sectionsWithIcons = [{ id: 'profile', label: 'Profile', icon: IconComponent }];

    render(
      <Settings sections={sectionsWithIcons}>
        <Settings.Section sectionId="profile">Content</Settings.Section>
      </Settings>
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });
});
