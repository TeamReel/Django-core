import { Card } from '@django-core/design-system';

export function ResourceDisplayPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }} data-testid="resource-display-page">
      <div style={{ padding: '24px', borderBottom: '1px solid #e5e5e5', backgroundColor: '#fff' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700 }}>Resource Display</h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>F05 Resource Meters & Display</p>
      </div>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Card style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Usage Metrics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {[
              { name: 'Storage', used: 725, total: 1024, unit: 'GB' },
              { name: 'API Calls', used: 850000, total: 1000000, unit: 'calls' },
            ].map((metric) => (
              <div key={metric.name}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>{metric.name}</p>
                <div style={{ backgroundColor: '#e5e5e5', borderRadius: '4px', height: '8px', marginBottom: '4px' }}>
                  <div
                    style={{
                      backgroundColor: '#3b82f6',
                      height: '8px',
                      borderRadius: '4px',
                      width: `${(metric.used / metric.total) * 100}%`,
                    }}
                  />
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                  {metric.used}/{metric.total} {metric.unit}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Billing Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'This Month', value: '$2,450.00' },
              { label: 'Next Month', value: '$2,680.00' },
              { label: 'Year-to-Date', value: '$28,340.00' },
            ].map((item) => (
              <div key={item.label} style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280' }}>{item.label}</p>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
