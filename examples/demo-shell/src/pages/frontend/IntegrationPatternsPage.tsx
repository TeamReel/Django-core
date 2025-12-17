import { Card, Alert } from '@django-core/design-system';

export function IntegrationPatternsPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }} data-testid="integration-patterns-page">
      <div style={{ padding: '24px', borderBottom: '1px solid #e5e5e5', backgroundColor: '#fff' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700 }}>Integration Patterns</h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>F09 Error Boundaries & API Client Patterns</p>
      </div>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Error Boundaries</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {[
              { title: 'Component Boundary', desc: 'Isolates component errors' },
              { title: 'Page Boundary', desc: 'Handles page-level errors' },
            ].map((item) => (
              <Card key={item.title} style={{ padding: '16px' }}>
                <h4 style={{ margin: '0 0 4px 0' }}>{item.title}</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Error Handling</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Alert variant="danger">Network Errors - Retry with exponential backoff</Alert>
            <Alert variant="warning">API Errors - Display contextual messages</Alert>
            <Alert variant="info">Permission Errors - Redirect or hide UI elements</Alert>
          </div>
        </div>
        <Card style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>API Client Patterns</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {[
              { name: 'Request Interceptor', desc: 'Add auth tokens & headers' },
              { name: 'Response Interceptor', desc: 'Handle errors & cache' },
              { name: 'Retry Logic', desc: 'Automatic retry with backoff' },
              { name: 'Caching', desc: 'Cache GET, invalidate mutations' },
            ].map((pattern) => (
              <div key={pattern.name}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 600 }}>{pattern.name}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{pattern.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
