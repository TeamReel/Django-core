import { Card, Badge } from '@django-core/design-system';
import AppShell from '../../components/AppShell';

export function ContextSwitcherPage() {
  return (
    <AppShell>
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--app-bg)' }} data-testid="context-switcher-page">
      <div style={{ padding: '24px', borderBottom: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700 }}>Context Switcher</h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--app-muted-text)' }}>F03 Multi-Tenancy Context Demo</p>
      </div>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Card style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Current Context</h3>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ margin: '0 0 4px 0', color: 'var(--app-muted-text)' }}>Organization</p>
            <Badge variant="primary">ACME Corp</Badge>
          </div>
          <div>
            <p style={{ margin: '0 0 4px 0', color: 'var(--app-muted-text)' }}>Project</p>
            <Badge variant="success">Platform Core</Badge>
          </div>
        </Card>
        <Card style={{ padding: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Available Organizations</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {['ACME Corp', 'TechStart Inc', 'Global Solutions'].map((org) => (
              <div key={org} style={{ border: '1px solid var(--app-border)', borderRadius: '8px', padding: '12px' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{org}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--app-muted-text)' }}>3 projects</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
    </AppShell>
  );
}
