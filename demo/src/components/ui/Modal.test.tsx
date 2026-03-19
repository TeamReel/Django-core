import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <p>Modal body</p>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(<Modal {...defaultProps} isOpen={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders subtitle when provided', () => {
    render(<Modal {...defaultProps} subtitle="Extra info" />);
    expect(screen.getByText('Extra info')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(<Modal {...defaultProps} footer={<button>Save</button>} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('calls onClose on backdrop click', () => {
    render(<Modal {...defaultProps} />);
    // The backdrop is the outermost div with the overlay role
    // The dialog element itself is the backdrop
    fireEvent.click(screen.getByRole('dialog'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape key', () => {
    render(<Modal {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('does not call onClose on Escape when preventClose is true', () => {
    render(<Modal {...defaultProps} preventClose />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('has dialog role with aria-modal', () => {
    render(<Modal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('renders icon when provided', () => {
    render(<Modal {...defaultProps} icon={<span data-testid="modal-icon">N</span>} />);
    expect(screen.getByTestId('modal-icon')).toBeInTheDocument();
  });

  it('restores body overflow on unmount', () => {
    document.body.style.overflow = '';
    const { unmount } = render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
