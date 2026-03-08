import { useOnlineStatus } from '../hooks/useOnlineStatus';

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
      className="flex-row flex-center gap-8 fw-600 fs-13"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '8px 16px',
        textAlign: 'center',
        backgroundColor: isOnline ? 'var(--color-green-600)' : 'var(--color-red-600)',
        color: 'white',
        transition: 'background-color 0.3s, opacity 0.3s',
        opacity: 1,
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
