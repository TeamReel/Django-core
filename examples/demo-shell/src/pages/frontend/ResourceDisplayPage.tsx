import { Card } from '@django-core/design-system';
import AppShell from '../../components/AppShell';

export function ResourceDisplayPage() {
  return (
    <AppShell>
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--app-bg)' }} data-testid="resource-display-page">
        <div style={{ padding: '24px', borderBottom: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700 }}>Resource Display</h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--app-muted-text)' }}>F05 Resource Meters & Display</p>
        </div>
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Card style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Usage Metrics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {[
              { name: 'Storage', used: 725, total: 1024, unit: 'GB' },
              { name: 'API Calls', used: 850000, total: 1000000, unit: 'calls' },
            ].map((metric) => (
              <div key={metric.name}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>{metric.name}</p>
                <div style={{ backgroundColor: 'var(--app-border)', borderRadius: '4px', height: '8px', marginBottom: '4px' }}>
                  <div
                    style={{
                      backgroundColor: 'var(--app-link)',
                      height: '8px',
                      borderRadius: '4px',
                      width: `${(metric.used / metric.total) * 100}%`,
                    }}
                  />
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--app-muted-text)' }}>
                  {metric.used}/{metric.total} {metric.unit}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ padding: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Billing Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'This Month', value: '$2,450.00' },
              { label: 'Next Month', value: '$2,680.00' },
              { label: 'Year-to-Date', value: '$28,340.00' },
            ].map((item) => (
              <div key={item.label} style={{ padding: '12px', backgroundColor: 'var(--app-surface)', borderRadius: '4px' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--app-muted-text)' }}>{item.label}</p>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
        </div>
      </div>
    </AppShell>
  );
}
