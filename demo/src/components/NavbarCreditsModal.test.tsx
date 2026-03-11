import { render, screen, fireEvent } from '@testing-library/react';
import { NavbarCreditsModal } from './NavbarCreditsModal';

describe('NavbarCreditsModal', () => {
  const defaultProps = {
    myCreditsBalance: '150',
    onClose: vi.fn(),
    onNavigate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders credit balance', () => {
    render(<NavbarCreditsModal {...defaultProps} />);
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('renders credits label', () => {
    render(<NavbarCreditsModal {...defaultProps} />);
    expect(screen.getByText('beschikbare credits')).toBeInTheDocument();
  });

  it('renders link to credits overview', () => {
    render(<NavbarCreditsModal {...defaultProps} />);
    expect(screen.getByText(/Bekijk Credits Overzicht/)).toBeInTheDocument();
  });

  it('calls onClose when overlay is clicked', () => {
    const { container } = render(<NavbarCreditsModal {...defaultProps} />);
    // Click the overlay (first child)
    fireEvent.click(container.firstChild!);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('navigates to credits page via link', () => {
    render(<NavbarCreditsModal {...defaultProps} />);
    fireEvent.click(screen.getByText(/Bekijk Credits Overzicht/));
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('/credits');
  });
});
