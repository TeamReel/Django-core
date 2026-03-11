import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import SettingsPage from './SettingsPage';

vi.mock('@django-core/page-templates', () => ({
  Settings: Object.assign(
    ({ children }: any) => <div>{children}</div>,
    { Section: ({ title, description, children }: any) => <div><h2>{title}</h2><p>{description}</p>{children}</div> },
  ),
}));

vi.mock('../providers/BackNavigationProvider', () => ({
  useSetBackNavigation: () => vi.fn(),
}));

vi.mock('./useSettingsPage', () => ({
  useSettingsPage: () => ({
    activeSection: 'profile',
    setActiveSection: vi.fn(),
    profile: { fullName: 'Test User', email: 'test@test.com', bio: '' },
    setProfile: vi.fn(),
    profileSaveStatus: 'idle',
    handleProfileSave: vi.fn(),
    preferences: { theme: 'light', language: 'en', timezone: 'UTC' },
    setPreferences: vi.fn(),
    handlePreferencesSave: vi.fn(),
    preferencesSaveStatus: 'idle',
    notifications: { email: true, projectUpdates: true, securityAlerts: true, marketing: false },
    setNotifications: vi.fn(),
    handleNotificationsSave: vi.fn(),
    notificationsSaveStatus: 'idle',
  }),
}));

describe('SettingsPage', () => {
  it('renders profile settings section', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
  });

  it('renders security settings section', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Security Settings')).toBeInTheDocument();
  });

  it('renders notification preferences section', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  });

  it('renders application preferences section', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Application Preferences')).toBeInTheDocument();
  });
});
