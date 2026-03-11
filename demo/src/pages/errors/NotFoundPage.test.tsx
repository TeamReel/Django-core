import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import NotFoundPage from './NotFoundPage';

describe('NotFoundPage', () => {
  it('renders 404 heading', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders title', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('has link to dashboard', () => {
    renderWithProviders(<NotFoundPage />);
    const link = screen.getByText('Go to Dashboard');
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('has Go Back button', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });
});
