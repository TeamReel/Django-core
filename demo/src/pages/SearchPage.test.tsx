import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import SearchPage from './SearchPage';

vi.mock('../hooks/useSearch', () => ({
  useSearch: () => ({
    results: null,
    grouped: null,
    isLoading: false,
    error: null,
    totalCount: 0,
    search: vi.fn(),
    clearResults: vi.fn(),
  }),
}));

vi.mock('../components/HierarchyTreeView', () => ({
  default: () => <div>HierarchyTreeView</div>,
}));

vi.mock('../components/SmartEmptyState', () => ({
  default: ({ title }: any) => <div>{title}</div>,
}));

vi.mock('@django-core/design-system', () => ({
  BottomSheet: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

describe('SearchPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<SearchPage />);
  });


});
