import { render, screen } from '@testing-library/react';
import LoadingState, { LoadingOverlay } from './LoadingState';

describe('LoadingState', () => {
  it('renders spinner by default', () => {
    const { container } = render(<LoadingState />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders message when provided', () => {
    render(<LoadingState message="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('renders skeleton lines for skeleton type', () => {
    const { container } = render(<LoadingState type="skeleton" lines={4} />);
    // Should render a container with 4 skeleton line divs
    const skeletonContainer = container.firstChild as HTMLElement;
    expect(skeletonContainer.children.length).toBe(4);
  });

  it('renders inline spinner for inline type', () => {
    const { container } = render(<LoadingState type="inline" />);
    expect(container.firstChild).toBeInstanceOf(HTMLSpanElement);
  });
});

describe('LoadingOverlay', () => {
  it('renders with default message', () => {
    render(<LoadingOverlay />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingOverlay message="Saving changes..." />);
    expect(screen.getByText('Saving changes...')).toBeInTheDocument();
  });
});
