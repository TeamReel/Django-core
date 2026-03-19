import { useEscapeKey } from '../hooks/useEscapeKey';
import { VERB_LABELS, type ActivityLogItem, type ActivityVerbValue } from '@/types/api';
import s from './TopNavbarModals.module.css';
import styles from './NavbarModals.module.css';

export interface NotificationsModalProps {
  notificationsList: Array<{ id: string; message: string; is_read: boolean; created_at: string; title?: string; read?: boolean; action_url?: string | null }>;
  /** Activity feed items from B62 API — merged into notifications feed */
  activityItems?: ActivityLogItem[];
  onClose: () => void;
  onNavigate: (path: string) => void;
}

/* ── Unified feed item for merged display ────────────────────── */

interface FeedItem {
  id: string;
  type: 'notification' | 'activity';
  text: string;
  subtext?: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string | null;
  verbCategory?: string;
}

/** Format relative time in Dutch */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'zojuist';
  if (diffMin < 60) return `${diffMin} min geleden`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} uur geleden`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'gisteren';
  if (diffDays < 7) return `${diffDays} dagen geleden`;
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

/** Get the verb label for display */
function getVerbLabel(verb: string): string {
  return VERB_LABELS[verb as ActivityVerbValue] ?? verb;
}

/** Derive verb category for CSS colour indicator */
function getVerbCategory(verb: string): string {
  if (verb.startsWith('content.')) return 'content';
  if (verb.startsWith('member.')) return 'member';
  if (verb.startsWith('match.') || verb === 'lineup.published') return 'match';
  if (verb.startsWith('season.')) return 'season';
  return 'default';
}

/** Merge notifications + activity into one chronological feed */
function buildFeed(
  notifications: NotificationsModalProps['notificationsList'],
  activityItems: ActivityLogItem[],
): FeedItem[] {
  const notifItems: FeedItem[] = notifications.map((n) => ({
    id: `notif-${n.id}`,
    type: 'notification' as const,
    text: n.title || n.message,
    subtext: n.title && n.message ? n.message : undefined,
    timestamp: n.created_at,
    isRead: n.read ?? n.is_read,
    actionUrl: n.action_url,
  }));

  const actItems: FeedItem[] = activityItems.map((a) => ({
    id: `act-${a.id}`,
    type: 'activity' as const,
    text: `${a.actor_email?.split('@')[0] ?? 'Systeem'} ${getVerbLabel(a.verb)}`,
    timestamp: a.created_at,
    isRead: true,
    verbCategory: getVerbCategory(a.verb),
  }));

  return [...notifItems, ...actItems]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15);
}

export function NavbarNotificationsModal({ notificationsList, activityItems = [], onClose, onNavigate }: NotificationsModalProps) {
  useEscapeKey(onClose);
  const feed = buildFeed(notificationsList, activityItems);

  return (
    <div onClick={onClose} className={s.modalOverlay} role="presentation">
      <div onClick={(e) => e.stopPropagation()} className={`w-full ${s.modalPanel} ${styles.notificationsPanel}`} role="dialog" aria-label="Notificaties">
        {/* ── Header: title + close ── */}
        <div className={s.modalHeaderRow}>
          <div className="flex-1">
            <div className={s.modalTitle15}>Notificaties</div>
          </div>
          <button onClick={onClose} className={styles.closeBtnMobile} aria-label="Sluiten">
            {'\u2715'}
          </button>
        </div>

        {/* ── Unified feed ── */}
        <div className="flex-1 overflow-y-auto p-16">
          {feed.length === 0 ? (
            <div className="text-center p-24 text-secondary">
              <div className="fs-14">Geen notificaties</div>
            </div>
          ) : (
            <div className="flex-col gap-8">
              {feed.map((item) => (
                <div
                  key={item.id}
                  className={`p-12 rounded-8 ${styles.notifItem}`}
                  data-read={item.isRead}
                  onClick={item.actionUrl ? () => { onClose(); onNavigate(item.actionUrl!); } : undefined}
                  style={item.actionUrl ? { cursor: 'pointer' } : undefined}
                  role={item.actionUrl ? 'button' : undefined}
                  tabIndex={item.actionUrl ? 0 : undefined}
                  onKeyDown={item.actionUrl ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); onNavigate(item.actionUrl!); } } : undefined}
                >
                  <div className="flex items-start gap-8">
                    {item.type === 'activity' && (
                      <span className={styles.verbDot} data-category={item.verbCategory} aria-hidden="true" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`${s.notifMessage} ${styles.notifMessageText}`} data-read={item.isRead}>
                        {item.text}
                      </div>
                      {item.subtext && <div className={s.notifDetail}>{item.subtext}</div>}
                      <div className={s.textSecondary10}>{formatRelativeTime(item.timestamp)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer: safe-tap link to full page ── */}
        <div className={styles.modalFooterLink}>
          <button
            onClick={() => { onClose(); onNavigate('/notifications'); }}
            className={s.btnGhost}
          >
            Alle notificaties {'\u2192'}
          </button>
        </div>
      </div>
    </div>
  );
}
