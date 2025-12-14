import { useAuth, useSignOut } from '@django-core/auth-ui';
import { ContextSwitcher } from '@django-core/context-switcher';

export default function TopNavigation() {
  const { user } = useAuth();
  const { signOut, loading } = useSignOut();

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: '1px solid #eee',
      backgroundColor: '#fff'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Django Core-App Demo</h1>
        <ContextSwitcher variant="horizontal" />
      </div>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>{user.email}</span>
          <button
            onClick={signOut}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: loading ? '#6c757d' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Logging out...' : 'Log Out'}
          </button>
        </div>
      )}
    </header>
  );
}
