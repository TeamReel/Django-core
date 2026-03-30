import { useAuth, useSignOut } from '@django-core/auth-ui';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';

export function DashboardPage() {
  const { user, status } = useAuth();
  const { signOut } = useSignOut();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (status === 'loading') {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    navigate('/login');
    return null;
  }

  return (
    <PageLayout title="Dashboard">
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <h1>Welcome to Your Dashboard</h1>

        <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
          <h2>User Information</h2>
          <p><strong>Name:</strong> {user?.first_name} {user?.last_name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>User ID:</strong> {user?.id}</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleSignOut}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Sign Out
          </button>
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#e7f3ff', borderRadius: '8px' }}>
          <h3>Demo Information</h3>
          <p>
            This is a demo application showcasing <code>@django-core/auth-ui</code> components.
          </p>
          <p>Features demonstrated:</p>
          <ul>
            <li>✅ Sign in with email/password</li>
            <li>✅ Protected route (this dashboard)</li>
            <li>✅ Password reset flow</li>
            <li>✅ User profile display</li>
            <li>✅ Sign out functionality</li>
          </ul>
        </div>
      </div>
    </PageLayout>
  );
}
