import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import AppsPage from './AppsPage';

vi.mock('@django-core/context-switcher', () => ({
  useContextSwitcher: () => ({ context: { organisation: { slug: 'demo' } } }),
}));

vi.mock('../hooks/useAppSelection', () => ({
  useAppSelection: () => ({}),
}));

describe('AppsPage', () => {
  it('renders page title', () => {
    renderWithProviders(<AppsPage />);
    expect(screen.getByText('Apps')).toBeInTheDocument();
  });

  it('renders app tiles', () => {
    renderWithProviders(<AppsPage />);
    expect(screen.getByText('Federation')).toBeInTheDocument();
    expect(screen.getByText('Clubs')).toBeInTheDocument();
    expect(screen.getByText('Seasons')).toBeInTheDocument();
    expect(screen.getByText('Competitions')).toBeInTheDocument();
    expect(screen.getByText('Matches')).toBeInTheDocument();
  });
});
