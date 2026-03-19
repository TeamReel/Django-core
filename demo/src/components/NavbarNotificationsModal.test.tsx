import { render, screen, within } from '@testing-library/react';
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

  it('renders title heading without tabs when showActivityTab is false', () => {
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

  /* ── Activity tab tests ─────────────────────────────────────── */

  describe('with activity tab', () => {
    const activityItems = [
      buildActivityItem({ id: 'evt-1', verb: 'content.created', actor_email: 'coach@test.nl' }),
      buildActivityItem({ id: 'evt-2', verb: 'member.added', actor_email: 'admin@test.nl' }),
    ];

    it('shows tab bar when showActivityTab is true', () => {
      render(
        <NavbarNotificationsModal
          notificationsList={[]}
          activityItems={activityItems}
          showActivityTab
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /notificaties/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /activiteit/i })).toBeInTheDocument();
    });

    it('shows tab count badge for notifications', () => {
      render(
        <NavbarNotificationsModal
          notificationsList={[
            { id: '1', message: 'Hello', is_read: false, created_at: new Date().toISOString() },
          ]}
          activityItems={activityItems}
          showActivityTab
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      const notifTab = screen.getByRole('tab', { name: /notificaties/i });
      expect(within(notifTab).getByText('1')).toBeInTheDocument();
    });

    it('defaults to notifications tab', () => {
      render(
        <NavbarNotificationsModal
          notificationsList={[]}
          activityItems={activityItems}
          showActivityTab
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      const notifTab = screen.getByRole('tab', { name: /notificaties/i });
      expect(notifTab).toHaveAttribute('aria-selected', 'true');
    });

    it('switches to activity tab on click', async () => {
      const user = userEvent.setup();

      render(
        <NavbarNotificationsModal
          notificationsList={[]}
          activityItems={activityItems}
          showActivityTab
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      const activityTab = screen.getByRole('tab', { name: /activiteit/i });
      await user.click(activityTab);

      expect(activityTab).toHaveAttribute('aria-selected', 'true');
      // Activity items should be visible
      expect(screen.getByText('coach')).toBeInTheDocument();
    });

    it('displays activity item actor and verb', async () => {
      const user = userEvent.setup();

      render(
        <NavbarNotificationsModal
          notificationsList={[]}
          activityItems={activityItems}
          showActivityTab
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      await user.click(screen.getByRole('tab', { name: /activiteit/i }));

      // Actor should show username part (before @)
      expect(screen.getByText('coach')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    it('shows empty state when no activity items', async () => {
      const user = userEvent.setup();

      render(
        <NavbarNotificationsModal
          notificationsList={[]}
          activityItems={[]}
          showActivityTab
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      await user.click(screen.getByRole('tab', { name: /activiteit/i }));
      expect(screen.getByText('Nog geen activiteit')).toBeInTheDocument();
    });

    it('navigates to /activity when clicking "Bekijk alles" on activity tab', async () => {
      const user = userEvent.setup();

      render(
        <NavbarNotificationsModal
          notificationsList={[]}
          activityItems={activityItems}
          showActivityTab
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      await user.click(screen.getByRole('tab', { name: /activiteit/i }));

      const viewAllBtn = screen.getByText(/bekijk alles/i);
      await user.click(viewAllBtn);

      expect(onClose).toHaveBeenCalled();
      expect(onNavigate).toHaveBeenCalledWith('/activity');
    });

    it('has correct ARIA attributes for accessibility', () => {
      render(
        <NavbarNotificationsModal
          notificationsList={[]}
          activityItems={activityItems}
          showActivityTab
          onClose={onClose}
          onNavigate={onNavigate}
        />
      );

      const notifTab = screen.getByRole('tab', { name: /notificaties/i });
      const activityTab = screen.getByRole('tab', { name: /activiteit/i });

      // Active tab should have tabindex 0, inactive should have -1
      expect(notifTab).toHaveAttribute('tabindex', '0');
      expect(activityTab).toHaveAttribute('tabindex', '-1');

      // Tabs should have aria-controls
      expect(notifTab).toHaveAttribute('aria-controls', 'tabpanel-notifications');
      expect(activityTab).toHaveAttribute('aria-controls', 'tabpanel-activity');

      // Tab panel should exist
      expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tab-notifications');
    });
  });
});
