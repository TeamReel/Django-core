import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import FavoritesPage from './FavoritesPage';

vi.mock('../hooks/useNavItems', () => ({
  useNavFavorites: vi.fn(() => []),
}));

vi.mock('../utils/navStorage', () => ({
  clearFavorites: vi.fn(),
  removeFavorite: vi.fn(),
}));

describe('FavoritesPage', () => {
  it('renders title', () => {
    renderWithProviders(<FavoritesPage />);
    expect(screen.getByText('Favorites')).toBeInTheDocument();
  });

  it('shows empty state when no favorites', () => {
    renderWithProviders(<FavoritesPage />);
    expect(screen.getByText(/no favorites/i)).toBeInTheDocument();
  });

  it('has link to recents', () => {
    renderWithProviders(<FavoritesPage />);
    expect(screen.getByText('Back to Recents')).toBeInTheDocument();
  });
});
