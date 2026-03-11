import { renderWithProviders } from '@/test';

vi.mock('@django-core/design-system', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  Stack: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  Alert: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('../../components/SmartEmptyState', () => ({
  default: ({ title }: any) => <div>{title}</div>,
}));

vi.mock('./medialibHelpers', () => ({
  KIT_TYPES: [],
  SUB_TABS: [],
}));

vi.mock('./MediaLibCards', () => ({
  PreviewModal: () => null,
  AssetCard: () => <div>AssetCard</div>,
  FileCard: () => <div>FileCard</div>,
  MemberMediaCard: () => <div>MemberMediaCard</div>,
  FilterChip: () => null,
}));

vi.mock('./useMediaLibData', () => ({
  useMediaLibData: () => ({
    items: [],
    isLoading: false,
    error: null,
    activeTab: 'all',
    setActiveTab: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
  }),
}));

// Lazy import
const mod = await import('./index');
const MediaLibraryPage = mod.default ?? mod.MediaLibraryPage;

describe('MediaLibraryPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<MediaLibraryPage />);
  });
});
