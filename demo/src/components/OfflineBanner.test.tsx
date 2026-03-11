import { render, screen } from '@testing-library/react';
import { OfflineBanner } from './OfflineBanner';

// Mock useOnlineStatus hook
vi.mock('../hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}));

import { useOnlineStatus } from '../hooks/useOnlineStatus';
const mockUseOnlineStatus = vi.mocked(useOnlineStatus);

describe('OfflineBanner', () => {
  it('renders nothing when online and was never offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: true, wasOffline: false });
    const { container } = render(<OfflineBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('shows offline message when not online', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false, wasOffline: false });
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Geen internetverbinding/);
  });

  it('shows reconnected message when back online after being offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: true, wasOffline: true });
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Verbinding hersteld/);
  });

  it('has role="alert" for accessibility', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false, wasOffline: false });
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
