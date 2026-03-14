import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import ForbiddenPage from './ForbiddenPage';

describe('ForbiddenPage', () => {
  it('renders 403 heading', () => {
    renderWithProviders(<ForbiddenPage />);
    expect(screen.getByText('403')).toBeInTheDocument();
  });

  it('renders title', () => {
    renderWithProviders(<ForbiddenPage />);
    expect(screen.getByText('Access Forbidden')).toBeInTheDocument();
  });

  it('has link to dashboard', () => {
    renderWithProviders(<ForbiddenPage />);
    const link = screen.getByText('Go to Dashboard');
    expect(link).toHaveAttribute('href', '/dashboard');
  });
});
