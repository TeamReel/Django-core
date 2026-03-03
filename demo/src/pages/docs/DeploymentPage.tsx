import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import { PageHeader } from '@django-core/page-templates';
import { PageContent } from '@django-core/page-templates';
import { Button, Card, Badge, Alert, Spinner } from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';

export function DeploymentPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiBase = getApiBaseUrl();
    const baseUrl = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;

    fetch(`${baseUrl}/api/observability/demo-health/`)
      .then(r => r.json())
      .then(data => {
        setServices([
          {
            name: 'Backend API',
            status: (data.core_services?.auth?.status === 'active' || data.core_services?.auth?.status === 'healthy') ? 'healthy' : 'degraded',
            version: '1.0.0', type: 'Service',
            detail: data.core_services?.auth?.message,
          },
          { name: 'Frontend', status: 'healthy', version: '1.0.0', type: 'Client', detail: 'Active Session' },
          {
            name: 'PostgreSQL',
            status: data.core_services?.database?.status === 'healthy' ? 'healthy' : 'degraded',
            version: '16.0', type: 'Database',
            detail: data.core_services?.database?.latency_ms ? `${data.core_services.database.latency_ms}ms latency` : undefined,
          },
          {
            name: 'Redis',
            status: data.core_services?.cache?.status === 'healthy' ? 'healthy' : 'degraded',
            version: '7.2', type: 'Cache',
            detail: data.core_services?.cache?.latency_ms ? `${data.core_services.cache.latency_ms}ms latency` : undefined,
          },
        ]);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setServices([
          { name: 'Backend API', status: 'down', version: '1.0.0', type: 'Service' },
          { name: 'Frontend', status: 'healthy', version: '1.0.0', type: 'Client' },
        ]);
        setLoading(false);
      });
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy': case 'active': return <Badge variant="success">Healthy</Badge>;
      case 'degraded': return <Badge variant="warning">Degraded</Badge>;
      case 'down': case 'error': case 'unhealthy': return <Badge variant="error">Down</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <AppShell>
      <PageHeader title="Deployment Status" subtitle="B19 Container & Service Health" />
      <PageContent>
        <div className="page-container" data-testid="deployment-page">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spinner /></div>
          ) : (
            <>
              <Alert variant="info" className="mb-24">
                <strong>Environment:</strong> Demo / Production<br />
                <strong>Deployment:</strong> Railway (Backend) + Vercel (Frontend)
              </Alert>

              <div className="grid gap-16" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {services.map(service => (
                  <Card key={service.name} className="p-20">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h4 className="m-0">{service.name}</h4>
                        <div className="fs-12 mt-4" style={{ color: 'var(--app-muted-text)' }}>{service.type} • v{service.version}</div>
                      </div>
                      {getStatusBadge(service.status)}
                    </div>
                    <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '12px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--app-muted-text)' }}>Status Detail:</span>
                        <span>{service.detail || 'Running'}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="p-16 mt-24">
                <h4 style={{ margin: '0 0 12px 0' }}>Quick Links</h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Button variant="secondary" onClick={() => window.location.href = '/health'}>View Health Details</Button>
                  <Button variant="secondary" onClick={() => window.location.href = '/observability'}>Metrics Dashboard</Button>
                </div>
              </Card>
            </>
          )}
        </div>
      </PageContent>
    </AppShell>
  );
}
