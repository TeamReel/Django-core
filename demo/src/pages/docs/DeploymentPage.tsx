import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import { PageHeader } from '@django-core/page-templates';
import { PageContent } from '@django-core/page-templates';
import { Button, Card, Badge, Alert, Spinner } from '@django-core/design-system';
import { logger } from '@/utils/logger';
import { apiFetch } from '../../utils/apiFetch';
import styles from './DeploymentPage.module.css';

interface ServiceStatus {
  name: string;
  status: string;
  version: string;
  type: string;
  detail?: string;
}

export function DeploymentPage() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/observability/demo-health/')
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
        logger.error('Deployment health check error', err);
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
            <div className={styles.loadingContainer}><Spinner /></div>
          ) : (
            <>
              <Alert variant="info" className="mb-24">
                <strong>Environment:</strong> Demo / Production<br />
                <strong>Deployment:</strong> Railway (Backend) + Vercel (Frontend)
              </Alert>

              <div className={`grid gap-16 ${styles.servicesGrid}`}>
                {services.map(service => (
                  <Card key={service.name} className="p-20">
                    <div className={styles.cardHeader}>
                      <div>
                        <h4 className="m-0">{service.name}</h4>
                        <div className={`fs-12 mt-4 ${styles.serviceType}`}>{service.type} • v{service.version}</div>
                      </div>
                      {getStatusBadge(service.status)}
                    </div>
                    <div className={styles.cardDivider}>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Status Detail:</span>
                        <span>{service.detail || 'Running'}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="p-16 mt-24">
                <h4 className={styles.quickLinksTitle}>Quick Links</h4>
                <div className={styles.quickLinksRow}>
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

export default DeploymentPage;
