import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { PreferencesPage } from './PreferencesPage';

vi.mock('@django-core/design-system', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  Alert: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@django-core/page-templates', () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
  PageContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../providers/BackNavigationProvider', () => ({
  useSetBackNavigation: () => vi.fn(),
}));

vi.mock('./usePreferencesData', () => ({
  usePreferencesData: () => ({
    user: { id: '1', full_name: 'Test', email: 'test@t.com' },
    preferences: { theme: 'light', language: 'en', timezone: 'UTC' },
    setPreferences: vi.fn(),
    handleSavePreferences: vi.fn(),
    loading: false,
    saving: false,
    success: false,
    resolvedMode: 'light',
    activeTab: 'profile',
    setActiveTab: vi.fn(),
    organisations: [],
    clubs: [],
    teams: [],
    seasons: [],
    competitions: [],
    matches: [],
    channelPrefs: [],
    demoMode: true,
    myAuditEvents: [],
    isProfileModalOpen: false,
    isPasswordModalOpen: false,
    isAvatarModalOpen: false,
    openModal: vi.fn(),
    closeModal: vi.fn(),
    updatePreference: vi.fn(),
    updateNotification: vi.fn(),
    updateProfile: vi.fn(),
    notifications: { email: true },
    modals: {},
  }),
}));

vi.mock('./PreferencesModals', () => ({ PreferencesModals: () => null }));
vi.mock('./PreferencesProfileTab', () => ({ PreferencesProfileTab: () => <div>ProfileTab</div> }));
vi.mock('./PreferencesSettingsTabs', () => ({
  PersonalisationTab: () => <div>PersonalisationTab</div>,
  AuditTab: () => <div>AuditTab</div>,
  NotificationsTab: () => <div>NotificationsTab</div>,
}));

describe('PreferencesPage', () => {
  it('renders title', () => {
    renderWithProviders(<PreferencesPage />);
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });

  it('renders profile tab', () => {
    renderWithProviders(<PreferencesPage />);
    expect(screen.getByText('ProfileTab')).toBeInTheDocument();
  });
});
