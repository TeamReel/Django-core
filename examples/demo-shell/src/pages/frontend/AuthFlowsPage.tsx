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
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }} data-testid="auth-flows-page">
      <div style={{ padding: '24px', borderBottom: '1px solid #e5e5e5', backgroundColor: '#fff' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700 }}>Authentication Flows</h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>F02 Auth Flows Demo</p>
      </div>
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
          {(['login', 'signup', 'reset'] as const).map((flow) => (
            <Button
              key={flow}
              variant={activeFlow === flow ? 'primary' : 'secondary'}
              onClick={() => setActiveFlow(flow)}
              data-testid={`flow-button-${flow}`}
            >
              {flow.charAt(0).toUpperCase() + flow.slice(1)}
            </Button>
          ))}
        </div>
        {showSuccess && <Alert variant="success" style={{ marginBottom: '16px' }}>Success!</Alert>}
        <Card style={{ padding: '24px' }}>
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
      </div>
    </div>
    </AppShell>
  );
}
