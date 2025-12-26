import { Card } from '@django-core/design-system';
import AppShell from '../../components/AppShell';

export function TemplatesPage() {
  return (
    <AppShell>
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--app-bg)' }} data-testid="templates-page">
      <div style={{ padding: '24px', borderBottom: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700 }}>Page Templates</h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--app-muted-text)' }}>F06 Layout Templates & Patterns</p>
      </div>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {['List', 'Detail', 'Dashboard', 'Settings'].map((template) => (
          <Card key={template} style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>{template} Template</h3>
            <p style={{ margin: 0, color: 'var(--app-muted-text)', fontSize: '14px' }}>
              {template} pages provide a consistent layout pattern for displaying {template.toLowerCase()} content.
            </p>
            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--app-surface)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}>
              &lt;PageHeader title="{template}" /&gt;
              <br />
              &lt;PageContent&gt;...&lt;/PageContent&gt;
            </div>
          </Card>
        ))}
      </div>
    </div>
    </AppShell>
  );
}
