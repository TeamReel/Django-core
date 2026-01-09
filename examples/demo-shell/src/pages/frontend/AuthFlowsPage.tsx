import { useState } from 'react';
import { Button, Card, Badge, Input, Alert } from '@django-core/design-system';
import AppShell from '../../components/AppShell';

export function AuthFlowsPage() {
  const [activeFlow, setActiveFlow] = useState<'login' | 'signup' | 'reset'>('login');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <AppShell>
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--app-bg)' }} data-testid="auth-flows-page">
      <div style={{ padding: '24px', borderBottom: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700 }}>Authentication Flows</h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--app-muted-text)' }}>F02 Auth Flows Demo</p>
      </div>
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <Card style={{ padding: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div style={{
            marginBottom: '24px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-start'
          }}>
            {(['login', 'signup', 'reset'] as const).map((flow) => (
              <button
                key={flow}
                onClick={() => setActiveFlow(flow)}
                data-testid={`flow-button-${flow}`}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: `1px solid ${activeFlow === flow ? '#007bff' : '#6c757d'}`,
                  backgroundColor: activeFlow === flow ? '#007bff' : 'var(--app-surface)',
                  color: activeFlow === flow ? '#ffffff' : '#6c757d',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (activeFlow !== flow) {
                    e.currentTarget.style.backgroundColor = 'var(--app-surface-2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeFlow !== flow) {
                    e.currentTarget.style.backgroundColor = 'var(--app-surface)';
                  }
                }}
              >
                {flow.charAt(0).toUpperCase() + flow.slice(1)}
              </button>
            ))}
          </div>
          {showSuccess && <Alert variant="success" style={{ marginBottom: '16px' }}>Success!</Alert>}
          <Card variant="filled" style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Email</label>
              <Input type="email" placeholder="user@example.com" required data-testid="input-email" />
            </div>
            {(activeFlow === 'login' || activeFlow === 'signup') && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>Password</label>
                <Input type="password" placeholder="••••••••" required data-testid="input-password" />
              </div>
            )}
            <Button variant="primary" type="submit">Submit</Button>
          </form>
          </Card>
        </Card>
      </div>
    </div>
    </AppShell>
  );
}
