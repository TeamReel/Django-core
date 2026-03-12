/**
 * ShareButton tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ShareButton } from './ShareButton';

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  writable: true,
});

// Helper to render with router
function renderWithRouter(ui: React.ReactElement, initialRoute = '/test-page') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      {ui}
    </MemoryRouter>
  );
}

describe('ShareButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator.share mock
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: mockWriteText },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders share button with label', () => {
    renderWithRouter(<ShareButton />);
    expect(screen.getByRole('button', { name: /deel/i })).toBeInTheDocument();
  });

  it('renders in compact mode without label', () => {
    renderWithRouter(<ShareButton compact />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // In compact mode, text is hidden via CSS
  });

  it('copies URL to clipboard on click (desktop)', async () => {
    renderWithRouter(<ShareButton url="https://example.com/test" />);

    const button = screen.getByRole('button', { name: /deel/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('https://example.com/test');
    });
  });

  it('shows "Gekopieerd" feedback after copy', async () => {
    renderWithRouter(<ShareButton />);

    const button = screen.getByRole('button', { name: /deel/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Gekopieerd')).toBeInTheDocument();
    });
  });

  it('uses current pathname when no url prop provided', async () => {
    renderWithRouter(<ShareButton />, '/my-test-path');

    const button = screen.getByRole('button', { name: /deel/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('/my-test-path'));
    });
  });

  it('renders QR button when showQR is true', () => {
    renderWithRouter(<ShareButton showQR />);

    expect(screen.getByRole('button', { name: /qr/i })).toBeInTheDocument();
  });

  it('does not render QR button by default', () => {
    renderWithRouter(<ShareButton />);

    expect(screen.queryByRole('button', { name: /qr/i })).not.toBeInTheDocument();
  });

  it('opens QR modal when QR button clicked', async () => {
    renderWithRouter(<ShareButton showQR />);

    const qrButton = screen.getByRole('button', { name: /qr/i });
    fireEvent.click(qrButton);

    await waitFor(() => {
      expect(screen.getByText('QR-code')).toBeInTheDocument();
      expect(screen.getByText(/scan om direct/i)).toBeInTheDocument();
    });
  });

  it('closes QR modal when close button clicked', async () => {
    renderWithRouter(<ShareButton showQR />);

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /qr/i }));
    await waitFor(() => {
      expect(screen.getByText('QR-code')).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /sluiten/i }));
    await waitFor(() => {
      expect(screen.queryByText('QR-code')).not.toBeInTheDocument();
    });
  });

  it('closes QR modal when overlay clicked', async () => {
    renderWithRouter(<ShareButton showQR />);

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /qr/i }));
    await waitFor(() => {
      expect(screen.getByText('QR-code')).toBeInTheDocument();
    });

    // Click outside modal (on overlay)
    const overlay = document.querySelector('[class*="modalOverlay"]');
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay!);

    await waitFor(() => {
      expect(screen.queryByText('QR-code')).not.toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = renderWithRouter(<ShareButton className="custom-class" />);

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
