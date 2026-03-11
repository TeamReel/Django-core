import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import ErrorBoundary from './ErrorBoundary';

function ThrowingChild() {
  throw new Error('Test render error');
}

function GoodChild() {
  return <div>All good</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    renderWithProviders(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );
    // Should show some form of error fallback — look for common error UI text
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows reload button in error state', () => {
    renderWithProviders(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );
    // Error boundary typically has a reload/retry button
    const reloadBtn = screen.queryByRole('button');
    expect(reloadBtn).toBeTruthy();
  });
});
