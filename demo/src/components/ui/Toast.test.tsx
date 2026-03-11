import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast, ToastContainer } from './Toast';

function TestConsumer() {
  const { pushToast } = useToast();
  return (
    <button onClick={() => pushToast({ message: 'Saved!', type: 'success' })}>
      Push
    </button>
  );
}

function TestApp({ autoDismissMs = 5000 }: { autoDismissMs?: number }) {
  return (
    <ToastProvider autoDismissMs={autoDismissMs}>
      <TestConsumer />
      <ToastContainer />
    </ToastProvider>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows toast after pushToast', () => {
    render(<TestApp />);
    fireEvent.click(screen.getByText('Push'));
    expect(screen.getByRole('alert')).toHaveTextContent('Saved!');
  });

  it('auto-dismisses after timeout', () => {
    render(<TestApp autoDismissMs={3000} />);
    fireEvent.click(screen.getByText('Push'));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('dismisses on click', () => {
    render(<TestApp />);
    fireEvent.click(screen.getByText('Push'));
    const toast = screen.getByRole('alert');
    fireEvent.click(toast);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders nothing when no toasts', () => {
    const { container } = render(<TestApp />);
    // ToastContainer returns null when empty
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(0);
  });

  it('throws when useToast is used outside provider', () => {
    function Bad() {
      useToast();
      return null;
    }
    expect(() => render(<Bad />)).toThrow('useToast must be used within <ToastProvider>');
  });
});
