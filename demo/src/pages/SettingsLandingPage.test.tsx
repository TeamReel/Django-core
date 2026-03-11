import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import SettingsLandingPage from './SettingsLandingPage';

vi.mock('../components/PermissionGuards', () => ({
  useUserRole: () => ({ isSystemAdmin: true, isOrgAdmin: true, isLandAdmin: true }),
}));

vi.mock('../providers/BackNavigationProvider', () => ({
  useSetBackNavigation: () => vi.fn(),
}));

vi.mock('../components/SectionPageLayout', () => ({
  SectionPageLayout: ({ title, children }: any) => <div><h1>{title}</h1>{children}</div>,
}));

vi.mock('../components/TileGrid', () => ({
  TileGrid: ({ items }: any) => <div>{items?.map((it: any, i: number) => <div key={i}><span>{it.label}</span><span>{it.description}</span></div>)}</div>,
  TileItem: ({ label, description }: any) => <div><span>{label}</span><span>{description}</span></div>,
}));

describe('SettingsLandingPage', () => {
  it('renders title', () => {
    renderWithProviders(<SettingsLandingPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders tile items', () => {
    renderWithProviders(<SettingsLandingPage />);
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
    expect(screen.getByText('Organisation')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
  });

  it('renders Feature Flags tile for admin', () => {
    renderWithProviders(<SettingsLandingPage />);
    expect(screen.getByText('Feature Flags')).toBeInTheDocument();
  });
});
