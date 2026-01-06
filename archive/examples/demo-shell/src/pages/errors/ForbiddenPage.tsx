import { Link } from 'react-router-dom';
import AppShell from '../../components/AppShell';

export default function ForbiddenPage() {
  return (
    <AppShell>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center',
        padding: '60px 20px'
      }}>
        <div style={{ fontSize: '72px', marginBottom: '24px' }}>🚫</div>

        <h1 style={{ fontSize: '48px', marginBottom: '16px', color: '#dc3545' }}>
          403
        </h1>

        <h2 style={{ fontSize: '24px', marginBottom: '24px', color: '#333' }}>
          Access Forbidden
        </h2>

        <p style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
          You don't have permission to access this resource.
          Please contact your administrator if you believe this is an error.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link
            to="/dashboard"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          >
            Go to Dashboard
          </Link>

          <button
            onClick={() => window.history.back()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>

        <div style={{
          marginTop: '48px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          textAlign: 'left'
        }}>
          <h3 style={{ marginTop: 0, fontSize: '18px' }}>Common Reasons:</h3>
          <ul style={{ color: '#666', lineHeight: '1.8' }}>
            <li>You don't have the required role (admin, member, etc.)</li>
            <li>Your access to this organization or project has been revoked</li>
            <li>The resource requires a specific permission you don't have</li>
            <li>You're not logged in or your session has expired</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
