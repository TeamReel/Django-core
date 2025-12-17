import AppShell from '../components/AppShell';

export default function NotificationsPage() {
  // Mock notifications data
  const notifications = [
    {
      id: 1,
      type: 'info',
      title: 'Welcome to Django Core',
      message: 'This is a demo notification. Real notifications will be implemented in F04.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      read: false
    }
  ];

  return (
    <AppShell>
      <div style={{ padding: '20px' }}>
        <h1 style={{ marginTop: 0, marginBottom: '8px' }}>Notifications</h1>
        <p style={{ color: '#666', marginBottom: '32px' }}>
          View all your system notifications and updates
        </p>

        <div style={{ maxWidth: '800px' }}>
          {notifications.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              color: '#666'
            }}>
              No notifications yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    padding: '16px',
                    backgroundColor: notification.read ? '#f8f9fa' : '#e3f2fd',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${
                      notification.type === 'info' ? '#2196f3' :
                      notification.type === 'success' ? '#4caf50' :
                      notification.type === 'warning' ? '#ff9800' :
                      '#f44336'
                    }`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '8px'
                  }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                      {notification.title}
                    </h3>
                    <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                      {new Date(notification.timestamp).toLocaleString('nl-NL', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                    {notification.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: '#fff3cd',
          borderRadius: '8px',
          borderLeft: '4px solid #ffc107'
        }}>
          <strong>Demo Mode:</strong> This is a placeholder notification system.
          The full notifications feature (F04) is planned for future implementation.
        </div>
      </div>
    </AppShell>
  );
}
