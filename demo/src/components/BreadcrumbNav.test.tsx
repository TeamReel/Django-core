import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { BreadcrumbNav, type BreadcrumbItem } from './BreadcrumbNav';

const items: BreadcrumbItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'FC Test', path: '/org/fc-test' },
  { label: 'Match Detail', path: '/org/fc-test/match/1', isLeaf: true },
];

describe('BreadcrumbNav', () => {
  it('renders a back link to the parent', () => {
    renderWithProviders(<BreadcrumbNav items={items} />);
    // "FC Test" is the immediate parent (last non-leaf)
    expect(screen.getByText('FC Test')).toBeInTheDocument();
  });

  it('renders nav with back aria label', () => {
    const { container } = renderWithProviders(<BreadcrumbNav items={items} />);
    expect(container.querySelector('nav[aria-label="Back"]')).toBeInTheDocument();
  });

  it('returns null when no parent items', () => {
    const { container } = renderWithProviders(
      <BreadcrumbNav items={[{ label: 'Only Leaf', path: '/', isLeaf: true }]} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders a link element', () => {
    renderWithProviders(<BreadcrumbNav items={items} />);
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
  });
});
