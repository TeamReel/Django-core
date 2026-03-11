import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import ProfileHubPage from './ProfileHubPage';

vi.mock('@django-core/auth-ui', () => ({
  useSignOut: vi.fn(() => ({ signOut: vi.fn(), isLoading: false })),
}));

vi.mock('./config/usePreferencesData', () => ({
  usePreferencesData: () => ({
    user: { id: '1', full_name: 'Test User', email: 'test@test.com', avatar_url: '' },
    preferences: { theme: 'light', language: 'nl', timezone: 'Europe/Amsterdam' },
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
  }),
}));

vi.mock('../providers/BackNavigationProvider', () => ({
  useBackNavigation: () => ({ backTarget: null, setBackTarget: vi.fn(), goBack: vi.fn() }),
  useSetBackNavigation: () => undefined,
}));

vi.mock('./config/PreferencesModals', () => ({
  PreferencesModals: () => null,
}));

describe('ProfileHubPage', () => {
  it('renders account section', () => {
    renderWithProviders(<ProfileHubPage />);
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('renders Edit Profile option', () => {
    renderWithProviders(<ProfileHubPage />);
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  it('renders sign out button', () => {
    renderWithProviders(<ProfileHubPage />);
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('renders theme section', () => {
    renderWithProviders(<ProfileHubPage />);
    expect(screen.getByText('Theme')).toBeInTheDocument();
  });
});
