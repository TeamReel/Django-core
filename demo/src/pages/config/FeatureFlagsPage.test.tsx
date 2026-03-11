import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { FeatureFlagsPage } from './FeatureFlagsPage';

vi.mock('@django-core/design-system', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Alert: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@django-core/page-templates', () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
  PageContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('./useFeatureFlagsData', () => ({
  useFeatureFlagsData: () => ({
    displayFlags: [],
    uniqueTypes: [],
    uniqueSubtypes: [],
    uniqueStyles: [],
    loading: false,
    seedMessage: null,
    apiError: null,
    useApi: false,
    filterType: 'all',
    setFilterType: vi.fn(),
    filterSubtype: 'all',
    setFilterSubtype: vi.fn(),
    filterStyle: 'all',
    setFilterStyle: vi.fn(),
    selectedIds: new Set(),
    allSelected: false,
    someSelected: false,
    bulkUpdating: false,
    syncing: false,
    toggleFlag: vi.fn(),
    toggleSelect: vi.fn(),
    toggleSelectAll: vi.fn(),
    bulkEnable: vi.fn(),
    bulkDisable: vi.fn(),
    handleSeed: vi.fn(),
    handleSync: vi.fn(),
  }),
}));

describe('FeatureFlagsPage', () => {
  it('renders title', () => {
    renderWithProviders(<FeatureFlagsPage />);
    expect(screen.getByText('Feature Flags - Global Management')).toBeInTheDocument();
  });
});
