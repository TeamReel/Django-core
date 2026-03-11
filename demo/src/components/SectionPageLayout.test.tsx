import { render, screen } from '@testing-library/react';
import { SectionPageLayout } from './SectionPageLayout';

describe('SectionPageLayout', () => {
  it('renders title', () => {
    render(<SectionPageLayout title="Settings">Body</SectionPageLayout>);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<SectionPageLayout title="T">Page content here</SectionPageLayout>);
    expect(screen.getByText('Page content here')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <SectionPageLayout title="T" description="Manage your preferences">
        Body
      </SectionPageLayout>
    );
    expect(screen.getByText('Manage your preferences')).toBeInTheDocument();
  });

  it('omits description when not provided', () => {
    const { container } = render(<SectionPageLayout title="T">Body</SectionPageLayout>);
    // Title text exists but no description — only 1 text-like child in header
    expect(screen.getByText('T')).toBeInTheDocument();
    // The description would add a second Text element
    const texts = container.querySelectorAll('p, span');
    const withDesc = Array.from(texts).filter(el =>
      el.textContent?.includes('Manage')
    );
    expect(withDesc).toHaveLength(0);
  });
});
