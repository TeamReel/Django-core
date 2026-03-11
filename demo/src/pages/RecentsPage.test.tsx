import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import RecentsPage from './RecentsPage';

vi.mock('../hooks/useNavItems', () => ({
  useNavRecents: vi.fn(() => []),
  useNavFavorites: vi.fn(() => []),
}));

vi.mock('../utils/navStorage', () => ({
  clearRecents: vi.fn(),
  removeRecent: vi.fn(),
  toggleFavorite: vi.fn(),
}));

describe('RecentsPage', () => {
  it('renders title', () => {
    renderWithProviders(<RecentsPage />);
    expect(screen.getByText('Recents')).toBeInTheDocument();
  });

  it('shows empty state when no recents', () => {
    renderWithProviders(<RecentsPage />);
    expect(screen.getByText(/no recent/i)).toBeInTheDocument();
  });

  it('has link to favorites', () => {
    renderWithProviders(<RecentsPage />);
    expect(screen.getByText('Favorites')).toBeInTheDocument();
  });
});
