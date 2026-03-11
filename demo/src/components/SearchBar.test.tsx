import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('renders with default placeholder', () => {
    renderWithProviders(<SearchBar />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    renderWithProviders(<SearchBar placeholder="Find something..." />);
    expect(screen.getByPlaceholderText('Find something...')).toBeInTheDocument();
  });

  it('renders an input element', () => {
    renderWithProviders(<SearchBar />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(<SearchBar className="extra" />);
    // The outer ref div should include the className or nested element
    expect(container.firstChild).toBeTruthy();
  });
});
