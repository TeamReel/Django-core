import { useEscapeKey } from '../hooks/useEscapeKey';
import s from './TopNavbar.module.css';
import styles from './NavbarModals.module.css';

export interface NotificationsModalProps {
  notificationsList: Array<{ id: string; message: string; is_read: boolean; created_at: string; title?: string; read?: boolean; action_url?: string | null }>;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export function NavbarNotificationsModal({ notificationsList, onClose, onNavigate }: NotificationsModalProps) {
  useEscapeKey(onClose);
  return (
    <div onClick={onClose} className={s.modalOverlay} role="presentation">
        <div onClick={e => e.stopPropagation()} className={`w-full ${s.modalPanel} ${styles.notificationsPanel}`} role="dialog">
        <div className={s.modalHeaderRow}>
          <div className="flex-1">
            <div className={s.modalTitle15}>Notificaties</div>
            <div className={s.modalSubtitle}>{notificationsList.length} recente notificaties</div>
          </div>
          <button onClick={() => { onClose(); onNavigate('/notifications'); }} className={s.btnGhost}>
            Alle Notificaties {'\u2192'}
          </button>
          <button onClick={onClose} className={s.closeBtn}>{'\u2715'}</button>
        </div>
        <div className="flex-1 overflow-y-auto p-16">
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
                  role={notif.action_url ? 'link' : undefined}
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
        </div>
      </div>
    </div>
  );
}
