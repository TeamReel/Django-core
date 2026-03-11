/**
 * Integration test — MediaLibraryPage
 *
 * Tests: render page → search → asset display.
 * Hook returns full shape matching UseMediaLibDataReturn.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test';

const mockSetSearchQuery = vi.fn();

vi.mock('../../pages/medialib/useMediaLibData', () => ({
  useMediaLibData: () => ({
    orgId: 'org-1',
    orgSlug: 'test-org',
    isSuperAdmin: false,
    activeLevel: 'organisation',
    brandAssets: [
      { id: 'a1', name: 'Logo Primary', asset_type: 'logo' },
      { id: 'a2', name: 'Match Photo', asset_type: 'photo' },
    ],
    memberMedia: [],
    files: [],
    filteredBrandAssets: [
      { id: 'a1', name: 'Logo Primary', asset_type: 'logo' },
      { id: 'a2', name: 'Match Photo', asset_type: 'photo' },
    ],
    filteredFiles: [],
    filteredMemberMedia: [],
    filteredTeams: [],
    subTabCounts: { assets: 2, kits: 0 },
    fileTypeCounts: { all: 0, image: 0, video: 0, document: 0, font: 0 },
    organisations: [{ id: 'org-1', name: 'Test Org' }],
    clubs: [],
    teams: [],
    selectedOrgId: 'org-1',
    setSelectedOrgId: vi.fn(),
    selectedClubId: '',
    setSelectedClubId: vi.fn(),
    selectedTeamId: '',
    setSelectedTeamId: vi.fn(),
    subFilter: 'assets',
    setSubFilter: vi.fn(),
    kitFilter: '',
    setKitFilter: vi.fn(),
    fileTypeFilter: '',
    setFileTypeFilter: vi.fn(),
    searchQuery: '',
    setSearchQuery: mockSetSearchQuery,
    previewItem: null,
    setPreviewItem: vi.fn(),
    loading: false,
    error: null,
    handleDownload: vi.fn(),
    clearFilters: vi.fn(),
  }),
}));

// Mock sub-components — all from MediaLibCards barrel
vi.mock('../../pages/medialib/MediaLibCards', () => ({
  AssetCard: ({ asset }: any) => <div data-testid="asset-card">{asset?.name || 'Asset'}</div>,
  FileCard: () => null,
  MemberMediaCard: () => null,
  PreviewModal: () => null,
  FilterChip: ({ label }: any) => <span>{label}</span>,
}));

vi.mock('../../components/SmartEmptyState', () => ({
  default: () => <div>Empty</div>,
}));

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

let MediaLibraryPage: React.ComponentType;

beforeAll(async () => {
  const mod = await import('../../pages/medialib/index');
  MediaLibraryPage = mod.default;
});

describe('MediaLibraryPage integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders page title', () => {
    renderWithProviders(<MediaLibraryPage />);
    expect(screen.getByText(/Media Library/i)).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithProviders(<MediaLibraryPage />);
    expect(screen.getByPlaceholderText(/zoeken|search/i)).toBeInTheDocument();
  });

  it('updates search on input', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MediaLibraryPage />);
    const search = screen.getByPlaceholderText(/zoeken|search/i);
    await user.type(search, 'logo');
    expect(mockSetSearchQuery).toHaveBeenCalled();
  });

  it('renders asset cards', () => {
    renderWithProviders(<MediaLibraryPage />);
    expect(screen.getAllByTestId('asset-card').length).toBeGreaterThanOrEqual(1);
  });
});
