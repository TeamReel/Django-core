import { render, screen } from '@testing-library/react';
import { NavbarNotificationsModal } from './NavbarNotificationsModal';

describe('NavbarNotificationsModal', () => {
  const onClose = vi.fn();
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no notifications', () => {
    render(
      <NavbarNotificationsModal
        notificationsList={[]}
        onClose={onClose}
        onNavigate={onNavigate}
      />
    );
    expect(screen.getByText('Geen notificaties')).toBeInTheDocument();
  });

  it('renders notification count', () => {
    render(
      <NavbarNotificationsModal
        notificationsList={[
          { id: '1', message: 'Hello', is_read: false, created_at: new Date().toISOString() },
          { id: '2', message: 'World', is_read: true, created_at: new Date().toISOString() },
        ]}
        onClose={onClose}
        onNavigate={onNavigate}
      />
    );
    expect(screen.getByText('2 recente notificaties')).toBeInTheDocument();
  });

  it('renders notification messages', () => {
    render(
      <NavbarNotificationsModal
        notificationsList={[
          { id: '1', message: 'Match reminder', is_read: false, created_at: new Date().toISOString() },
        ]}
        onClose={onClose}
        onNavigate={onNavigate}
      />
    );
    expect(screen.getByText('Match reminder')).toBeInTheDocument();
  });

  it('renders title heading', () => {
    render(
      <NavbarNotificationsModal
        notificationsList={[]}
        onClose={onClose}
        onNavigate={onNavigate}
      />
    );
    expect(screen.getByText('Notificaties')).toBeInTheDocument();
  });
});
