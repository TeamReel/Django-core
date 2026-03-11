import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import SmartEmptyState from './SmartEmptyState';

describe('SmartEmptyState', () => {
  it('renders default title for "matches" type', () => {
    renderWithProviders(<SmartEmptyState type="matches" />);
    expect(screen.getByText('Geen wedstrijden gevonden')).toBeInTheDocument();
  });

  it('renders default description for "matches" type', () => {
    renderWithProviders(<SmartEmptyState type="matches" />);
    expect(screen.getByText(/Voeg een wedstrijd toe/)).toBeInTheDocument();
  });

  it('overrides title when custom title is provided', () => {
    renderWithProviders(<SmartEmptyState type="matches" title="Custom title" />);
    expect(screen.getByText('Custom title')).toBeInTheDocument();
  });

  it('overrides description when custom description is provided', () => {
    renderWithProviders(
      <SmartEmptyState type="generic" description="Custom desc" />
    );
    expect(screen.getByText('Custom desc')).toBeInTheDocument();
  });

  it('renders generic type', () => {
    renderWithProviders(<SmartEmptyState type="generic" />);
    expect(screen.getByText('Nog niets hier')).toBeInTheDocument();
  });

  it('renders search type', () => {
    renderWithProviders(<SmartEmptyState type="search" />);
    expect(screen.getByText('Geen resultaten')).toBeInTheDocument();
  });

  it('hides actions when hideActions is true', () => {
    const { container } = renderWithProviders(
      <SmartEmptyState type="members" hideActions />
    );
    // Should not render any buttons
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('renders for all supported types without crashing', () => {
    const types = [
      'content', 'matches', 'members', 'files', 'images', 'videos',
      'search', 'generic', 'projects', 'teams', 'clubs', 'users',
      'seasons', 'competitions', 'audit', 'transactions', 'media',
    ] as const;

    for (const type of types) {
      const { unmount } = renderWithProviders(<SmartEmptyState type={type} />);
      unmount();
    }
  });
});
