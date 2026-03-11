import { useOnlineStatus } from '../hooks/useOnlineStatus';
import styles from './OfflineBanner.module.css';

/**
 * OfflineBanner — shows a slim fixed banner when the browser is offline.
 *
 * When the connection comes back it briefly shows a "back online" message.
 *
 * Place once near the top of the app shell (above the main content).
 */
export function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus();

  if (isOnline && !wasOffline) return null;

  return (
    <div
      role="alert"
      className={`flex-row flex-center gap-8 fw-600 fs-13 ${styles.banner}`}
      style={{
        backgroundColor: isOnline ? 'var(--color-green-600)' : 'var(--color-red-600)',
      }}
    >
      {isOnline ? (
        <>
          <span></span>
          <span>Verbinding hersteld</span>
        </>
      ) : (
        <>
          <span></span>
          <span>Geen internetverbinding — sommige functies zijn beperkt</span>
        </>
      )}
    </div>
  );
}
