import { Card } from '@django-core/design-system';

export function TemplatesPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }} data-testid="templates-page">
      <div style={{ padding: '24px', borderBottom: '1px solid #e5e5e5', backgroundColor: '#fff' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700 }}>Page Templates</h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>F06 Layout Templates & Patterns</p>
      </div>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {['List', 'Detail', 'Dashboard', 'Settings'].map((template) => (
          <Card key={template} style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>{template} Template</h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              {template} pages provide a consistent layout pattern for displaying {template.toLowerCase()} content.
            </p>
            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}>
              &lt;PageHeader title="{template}" /&gt;
              <br />
              &lt;PageContent&gt;...&lt;/PageContent&gt;
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
