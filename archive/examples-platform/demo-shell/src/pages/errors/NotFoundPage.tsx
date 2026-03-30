import { Link } from 'react-router-dom';
import AppShell from '../../components/AppShell';

export default function NotFoundPage() {
  return (
    <AppShell>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center',
        padding: '60px 20px'
      }}>
        <div style={{ fontSize: '72px', marginBottom: '24px' }}>🔍</div>

        <h1 style={{ fontSize: '48px', marginBottom: '16px', color: '#6c757d' }}>
          404
        </h1>

        <h2 style={{ fontSize: '24px', marginBottom: '24px', color: '#333' }}>
          Page Not Found
        </h2>

        <p style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
          The page you're looking for doesn't exist or has been moved.
          Please check the URL or return to the dashboard.
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
          <h3 style={{ marginTop: 0, fontSize: '18px' }}>What you can do:</h3>
          <ul style={{ color: '#666', lineHeight: '1.8' }}>
            <li>Check the URL for typos</li>
            <li>Use the navigation menu to find what you need</li>
            <li>Return to the dashboard and start fresh</li>
            <li>Contact support if you think this is an error</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
