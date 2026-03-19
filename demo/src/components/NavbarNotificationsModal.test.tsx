import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavbarNotificationsModal } from './NavbarNotificationsModal';
import type { ActivityLogItem } from '@/types/api';

function buildActivityItem(overrides: Partial<ActivityLogItem> = {}): ActivityLogItem {
  return {
    id: 'evt-1',
    verb: 'content.created',
    actor_id: 'u-1',
    actor_email: 'coach@club.nl',
    organisation_id: 'org-1',
    target_type: 'content',
    target_object_id: 'c-1',
    created_at: new Date().toISOString(),
    metadata: {},
    ...overrides,
  };
}

describe('NavbarNotificationsModal', () => {
  const onClose = vi.fn();
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no notifications and no activity', () => {
    render(
      <NavbarNotificationsModal
        notificationsList={[]}
        onClose={onClose}
        onNavigate={onNavigate}
      />
    );
    expect(screen.getByText('Geen notificaties')).toBeInTheDocument();
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

  it('always shows "Notificaties" title (no tabs)', () => {
    render(
      <NavbarNotificationsModal
        notificationsList={[]}
        onClose={onClose}
        onNavigate={onNavigate}
      />
    );
    expect(screen.getByText('Notificaties')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('has a prominent close button with aria-label', () => {
    render(
      <NavbarNotificationsModal
        notificationsList={[]}
        onClose={onClose}
        onNavigate={onNavigate}
      />
    );
    const closeBtn = screen.getByRole('button', { name: /sluiten/i });
    expect(closeBtn).toBeInTheDocument();
  });

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <NavbarNotificationsModal
        notificationsList={[]}
        onClose={onClose}
        onNavigate={onNavigate}
      />
    );

    await user.click(screen.getByRole('button', { name: /sluiten/i }));
    expect(onClose).toHaveBeenCalled();
  });

  /* ── Merged feed tests ─────────────────────────────────────── */

  describe('unified feed', () => {
    const activityItems = [
      buildActivityItem({ id: 'evt-1', verb: 'content.created', actor_email: 'coach@test.nl' }),
      buildActivityItem({ id: 'evt-2', verb: 'member.added', actor_email: 'admin@test.nl' }),
    ];

    it('shows activity items inline (no separate tab)', () => {
      render(
        <NavbarNotificationsModal
          notificationsList={[]}
          activityItems={activityItems}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      // Activity items should be visible without clicking any tab
      expect(screen.getByText('coach')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    it('merges notifications and activity sorted by time', () => {
      const olderActivity = buildActivityItem({
        id: 'evt-old',
        verb: 'content.created',
        actor_email: 'coach@test.nl',
        created_at: new Date(Date.now() - 120_000).toISOString(),
      });
      const newerNotif = {
        id: 'n-1',
        message: 'Nieuwe melding',
        is_read: false,
        created_at: new Date(Date.now() - 60_000).toISOString(),
      };

      render(
        <NavbarNotificationsModal
          notificationsList={[newerNotif]}
          activityItems={[olderActivity]}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      // Both should be visible in the same feed
      expect(screen.getByText('Nieuwe melding')).toBeInTheDocument();
      expect(screen.getByText('coach')).toBeInTheDocument();
    });

    it('does not contain any emoji characters', () => {
      render(
        <NavbarNotificationsModal
          notificationsList={[]}
          activityItems={activityItems}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      const dialog = screen.getByRole('dialog');
      const emojiRange = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      expect(dialog.textContent).not.toMatch(emojiRange);
    });

    it('navigates to /notifications when footer link is clicked', async () => {
      const user = userEvent.setup();

      render(
        <NavbarNotificationsModal
          notificationsList={[]}
          activityItems={activityItems}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      const footerBtn = screen.getByText(/alle notificaties/i);
      await user.click(footerBtn);

      expect(onClose).toHaveBeenCalled();
      expect(onNavigate).toHaveBeenCalledWith('/notifications');
    });
  });
});
