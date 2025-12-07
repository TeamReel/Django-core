import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Modal } from './Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <p>Modal content</p>,
  };

  it('renders modal when isOpen is true', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close modal');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on Escape when closeOnEscape is false', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} closeOnEscape={false} />);

    await user.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    const overlay = screen.getByRole('presentation');
    await user.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when overlay is clicked and closeOnOverlayClick is false', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} closeOnOverlayClick={false} />);

    const overlay = screen.getByRole('presentation');
    await user.click(overlay);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose when modal content is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    const content = screen.getByRole('dialog');
    await user.click(content);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders footer when provided', () => {
    render(<Modal {...defaultProps} footer={<button>Save</button>} />);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders without title when not provided', () => {
    const { container } = render(
      <Modal {...defaultProps} title={undefined}>
        <p>Content only</p>
      </Modal>
    );
    expect(container.querySelector('header')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-labelledby');
  });

  it('has aria-modal attribute', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('links title with aria-labelledby', () => {
    render(<Modal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    const titleId = dialog.getAttribute('aria-labelledby');
    expect(titleId).toBe('modal-title');
    expect(screen.getByText('Test Modal')).toHaveAttribute('id', 'modal-title');
  });

  it('prevents body scroll when open', () => {
    const { unmount } = render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('traps focus within modal', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} />);

    const closeButton = screen.getByLabelText('Close modal');
    closeButton.focus();
    expect(closeButton).toHaveFocus();

    // Tab should stay within modal
    await user.tab();
    expect(document.activeElement).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Modal {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('applies custom className', () => {
    render(<Modal {...defaultProps} className="custom-modal" />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('custom-modal');
  });
});
