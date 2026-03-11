import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import ContentPage from './ContentPage';

describe('ContentPage', () => {
  it('renders title', () => {
    renderWithProviders(<ContentPage />);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders tile links', () => {
    renderWithProviders(<ContentPage />);
    expect(screen.getByText('Content Library')).toBeInTheDocument();
    expect(screen.getByText('Media Library')).toBeInTheDocument();
    expect(screen.getByText('AI Studio')).toBeInTheDocument();
  });
});
