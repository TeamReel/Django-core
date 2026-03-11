import { render, screen } from '@testing-library/react';
import { Section } from './Section';

describe('Section', () => {
  it('renders title', () => {
    render(<Section title="Settings">Body</Section>);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Settings');
  });

  it('renders children', () => {
    render(<Section title="S">Section body content</Section>);
    expect(screen.getByText('Section body content')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<Section title="Title" description="Some extra info">Body</Section>);
    expect(screen.getByText('Some extra info')).toBeInTheDocument();
  });

  it('omits description element when not provided', () => {
    const { container } = render(<Section title="Title">Body</Section>);
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  it('applies custom className', () => {
    const { container } = render(<Section title="T" className="extra">Body</Section>);
    expect(container.firstChild).toHaveClass('extra');
  });
});
