import { useAuth } from '@django-core/auth-ui';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // AuthProvider handles redirect to login page
  };

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #eee' }}>
        <h1>Welcome, {user?.first_name || user?.email}!</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Log Out
        </button>
      </header>

      <main style={{ padding: '20px' }}>
        <p>You are logged in to the Django Core-App Demo Shell.</p>
        <p>Explore features using the navigation (coming in WP03).</p>
        
        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h2>Your Profile</h2>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Name:</strong> {user?.first_name || 'Not set'}</p>
          <p><strong>User ID:</strong> {user?.id}</p>
        </div>
      </main>
    </div>
  );
}
