import { useState } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { VERB_LABELS, VERB_ICONS, type ActivityLogItem, type ActivityVerbValue } from '@/types/api';
import s from './TopNavbarModals.module.css';
import styles from './NavbarModals.module.css';

export interface NotificationsModalProps {
  notificationsList: Array<{ id: string; message: string; is_read: boolean; created_at: string; title?: string; read?: boolean; action_url?: string | null }>;
  /** Activity feed items from B62 API (admin/coach only) */
  activityItems?: ActivityLogItem[];
  /** Whether the user can see the activity tab */
  showActivityTab?: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

type ModalTab = 'notifications' | 'activity';

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

/** Get the verb icon name */
function getVerbIcon(verb: string): string {
  return VERB_ICONS[verb as ActivityVerbValue] ?? 'activity';
}

export function NavbarNotificationsModal({ notificationsList, activityItems = [], showActivityTab = false, onClose, onNavigate }: NotificationsModalProps) {
  useEscapeKey(onClose);
  const [activeTab, setActiveTab] = useState<ModalTab>('notifications');

  return (
    <div onClick={onClose} className={s.modalOverlay} role="presentation">
        <div onClick={e => e.stopPropagation()} className={`w-full ${s.modalPanel} ${styles.notificationsPanel}`} role="dialog" aria-label="Notificaties">
        <div className={s.modalHeaderRow}>
          <div className="flex-1">
            {showActivityTab ? (
              <div
                className={styles.tabBar}
                role="tablist"
                aria-label="Modal tabs"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const next: ModalTab = activeTab === 'notifications' ? 'activity' : 'notifications';
                    setActiveTab(next);
                    document.getElementById(`tab-${next}`)?.focus();
                  }
                }}
              >
                <button
                  id="tab-notifications"
                  role="tab"
                  aria-selected={activeTab === 'notifications'}
                  aria-controls="tabpanel-notifications"
                  tabIndex={activeTab === 'notifications' ? 0 : -1}
                  className={`${styles.tab} ${activeTab === 'notifications' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('notifications')}
                >
                  Notificaties
                  {notificationsList.length > 0 && (
                    <span className={styles.tabCount}>{notificationsList.length}</span>
                  )}
                </button>
                <button
                  id="tab-activity"
                  role="tab"
                  aria-selected={activeTab === 'activity'}
                  aria-controls="tabpanel-activity"
                  tabIndex={activeTab === 'activity' ? 0 : -1}
                  className={`${styles.tab} ${activeTab === 'activity' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('activity')}
                >
                  Activiteit
                </button>
              </div>
            ) : (
              <>
                <div className={s.modalTitle15}>Notificaties</div>
                <div className={s.modalSubtitle}>{notificationsList.length} recente notificaties</div>
              </>
            )}
          </div>
          <button onClick={() => { onClose(); onNavigate(activeTab === 'activity' ? '/activity' : '/notifications'); }} className={s.btnGhost}>
            {activeTab === 'activity' ? 'Bekijk alles' : 'Alle Notificaties'} {'\u2192'}
          </button>
          <button onClick={onClose} className={s.closeBtn}>{'\u2715'}</button>
        </div>

        <div
          id={`tabpanel-${activeTab}`}
          className="flex-1 overflow-y-auto p-16"
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === 'notifications' && (
            <>
              {notificationsList.length === 0 ? (
                <div className="text-center p-24 text-secondary">
                  <div className={`mb-8 ${s.emptyIcon32}`}>{'\ud83d\udced'}</div>
                  <div className="fs-14">Geen notificaties</div>
                </div>
              ) : (
                <div className="flex-col gap-8">
                  {notificationsList.slice(0, 10).map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-12 rounded-8 ${styles.notifItem}`}
                      data-read={notif.read}
                      onClick={notif.action_url ? () => { onClose(); onNavigate(notif.action_url!); } : undefined}
                      style={notif.action_url ? { cursor: 'pointer' } : undefined}
                      role={notif.action_url ? 'button' : undefined}
                      tabIndex={notif.action_url ? 0 : undefined}
                      onKeyDown={notif.action_url ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); onNavigate(notif.action_url!); } } : undefined}
                    >
                      <div className={`${s.notifMessage} ${styles.notifMessageText}`} data-read={notif.read}>
                        {notif.title || notif.message}
                      </div>
                      {notif.message && notif.title && (
                        <div className={s.notifDetail}>{notif.message}</div>
                      )}
                      <div className={s.textSecondary10}>{new Date(notif.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'activity' && (
            <>
              {activityItems.length === 0 ? (
                <div className="text-center p-24 text-secondary">
                  <div className={`mb-8 ${s.emptyIcon32}`}>{'\u{1F4CA}'}</div>
                  <div className="fs-14">Nog geen activiteit</div>
                </div>
              ) : (
                <div className="flex-col gap-4">
                  {activityItems.slice(0, 10).map((item) => (
                    <div key={item.id} className={`${styles.activityItem}`}>
                      <div className={styles.activityIcon} data-verb={getVerbIcon(item.verb)} aria-hidden="true">
                        {getVerbIconChar(item.verb)}
                      </div>
                      <div className={styles.activityContent}>
                        <div className={styles.activityText}>
                          <span className={styles.activityActor}>
                            {item.actor_email?.split('@')[0] ?? 'Systeem'}
                          </span>
                          {' '}
                          <span className={styles.activityVerb}>{getVerbLabel(item.verb)}</span>
                        </div>
                        <div className={s.textSecondary10}>{formatRelativeTime(item.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Simple emoji icon for activity verb (lightweight, no icon lib dependency in modal) */
function getVerbIconChar(verb: string): string {
  const map: Record<string, string> = {
    'content.created': '\u{1F4DD}',
    'content.approved': '\u2705',
    'content.rejected': '\u274C',
    'member.added': '\u{1F464}',
    'member.confirmed': '\u2714\uFE0F',
    'match.created': '\u{1F3C6}',
    'match.lineup_set': '\u{1F465}',
    'season.started': '\u{1F3AC}',
    'lineup.published': '\u{1F4E2}',
  };
  return map[verb] ?? '\u{1F4CB}';
}
