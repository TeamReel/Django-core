import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders title in h1', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
  });

  it('renders subtitle when provided', () => {
    render(<PageHeader title="T" subtitle="Sub info" />);
    expect(screen.getByText('Sub info')).toBeInTheDocument();
  });

  it('omits subtitle when not provided', () => {
    const { container } = render(<PageHeader title="T" />);
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  it('renders actions slot', () => {
    render(<PageHeader title="T" actions={<button>Save</button>} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders children below header', () => {
    render(<PageHeader title="T">Extra content</PageHeader>);
    expect(screen.getByText('Extra content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<PageHeader title="T" className="custom" />);
    expect(container.firstChild).toHaveClass('custom');
  });
});
