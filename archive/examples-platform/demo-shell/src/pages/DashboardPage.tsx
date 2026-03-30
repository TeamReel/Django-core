import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell';

export default function DashboardPage() {
  const { user } = useAuth();
  const { context } = useContextSwitcher();

  // Mock: DataLab org has low credits (25% remaining = 250/1000)
  const showLowCreditAlert = context.organisation?.slug === 'datalab';

  return (
    <AppShell>
      <div style={{ backgroundColor: 'var(--app-bg)', minHeight: '100%' }}>
        {/* Mock Credit Alert (F05 integration point) */}
        {showLowCreditAlert && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: 'var(--app-surface-2)',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            color: 'var(--app-text)'
          }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <strong>Low Credits Warning</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
                You're using 75% of your credit limit (250/1000 remaining). Consider upgrading to avoid service interruptions.
              </p>
            </div>
            <button style={{
              padding: '8px 16px',
              backgroundColor: '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 500
            }}>
              Upgrade Plan
            </button>
          </div>
        )}

        <h1 style={{ color: 'var(--app-text)' }}>Welcome, {user?.first_name || user?.email}!</h1>
        <p style={{ color: 'var(--app-text)' }}>You are logged in to the Django Core-App Demo Shell.</p>

        <div style={{ marginTop: '20px', marginBottom: '32px' }}>
          <Link
            to="/integration-status"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '16px'
            }}
          >
            🔬 View Integration Status Dashboard
          </Link>
        </div>

        {context.organisation && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: 'var(--app-surface-2)',
            border: '1px solid var(--app-border)',
            borderRadius: '4px',
            color: 'var(--app-text)'
          }}>
            <h3 style={{ marginTop: 0, color: 'var(--app-text)' }}>Current Context</h3>
            <p><strong>Organisation:</strong> {context.organisation.name}</p>
            {context.project && (
              <p><strong>Project:</strong> {context.project.name}</p>
            )}
          </div>
        )}

        {!context.organisation && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: 'var(--app-surface-2)',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            color: 'var(--app-text)'
          }}>
            <p style={{ margin: 0 }}>
              No organisation selected. <Link to="/organisations">Browse organisations</Link> to get started.
            </p>
          </div>
        )}

        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: 'var(--app-surface-2)', borderRadius: '4px', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}>
          <h2 style={{ color: 'var(--app-text)' }}>Your Profile</h2>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Name:</strong> {user?.first_name || 'Not set'}</p>
          <p><strong>User ID:</strong> {user?.id}</p>
        </div>

        <div style={{ marginTop: '30px' }}>
          <h2 style={{ color: 'var(--app-text)' }}>Quick Links</h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              to="/organisations"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              Browse Organisations
            </Link>
            {context.organisation && (
              <Link
                to={`/organisations/${context.organisation.slug}/projects`}
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                View Projects
              </Link>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
