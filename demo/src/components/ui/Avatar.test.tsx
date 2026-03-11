import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders initials when no src is given', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders single initial for single-word name', () => {
    render(<Avatar name="Admin" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders "?" when no name and no src', () => {
    render(<Avatar />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders image when src is provided', () => {
    render(<Avatar src="https://example.com/photo.jpg" alt="User photo" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
    expect(img).toHaveAttribute('alt', 'User photo');
  });

  it('falls back to initials on image error', () => {
    render(<Avatar src="https://broken.jpg" name="Jane Smith" />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('shows status dot when status is provided', () => {
    render(<Avatar name="Test" status="online" />);
    expect(screen.getByLabelText('online')).toBeInTheDocument();
  });

  it('does not show status dot when no status', () => {
    render(<Avatar name="Test" />);
    expect(screen.queryByLabelText('online')).not.toBeInTheDocument();
  });

  it('has button role when onClick is provided', () => {
    const onClick = vi.fn();
    render(<Avatar name="Click Me" onClick={onClick} />);
    const el = screen.getByRole('button');
    fireEvent.click(el);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not have button role without onClick', () => {
    render(<Avatar name="No Click" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('uses aria-label from alt or name', () => {
    render(<Avatar name="Maria" />);
    expect(screen.getByLabelText('Maria')).toBeInTheDocument();
  });
});
