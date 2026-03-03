import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import { PageHeader } from '@django-core/page-templates';
import { PageContent } from '@django-core/page-templates';
import { Card, Badge, Spinner } from '@django-core/design-system';

export function DocsPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setModules([
        { id: 'B01', name: 'Health Check', status: 'complete', docs: true },
        { id: 'B04', name: 'Internationalization', status: 'complete', docs: true },
        { id: 'B05', name: 'Authentication', status: 'complete', docs: true },
        { id: 'B06', name: 'Organizations', status: 'complete', docs: true },
        { id: 'B07', name: 'Projects', status: 'complete', docs: true },
        { id: 'B08', name: 'Authorization', status: 'complete', docs: true },
        { id: 'B09', name: 'Audit Logging', status: 'complete', docs: true },
        { id: 'B12', name: 'Preferences', status: 'complete', docs: true },
        { id: 'B13', name: 'API Foundation', status: 'complete', docs: true },
        { id: 'B15', name: 'Task Scheduling', status: 'complete', docs: true },
        { id: 'B16', name: 'Notifications Baseline', status: 'complete', docs: true },
        { id: 'B17', name: 'Notification Extensions', status: 'complete', docs: true },
        { id: 'B18', name: 'Observability', status: 'complete', docs: true },
        { id: 'B19', name: 'Deployment', status: 'complete', docs: true },
        { id: 'B20', name: 'Scaffolding CLI', status: 'complete', docs: true },
        { id: 'B21', name: 'Documentation', status: 'complete', docs: true },
        { id: 'F01', name: 'Design System', status: 'complete', docs: true },
        { id: 'F02', name: 'Auth UI', status: 'complete', docs: true },
        { id: 'F03', name: 'Context Switcher', status: 'complete', docs: true },
        { id: 'F07', name: 'Theme System', status: 'complete', docs: true },
        { id: 'F09', name: 'Integration Guides', status: 'complete', docs: true },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete': return <Badge variant="success">Complete</Badge>;
      case 'in-progress': return <Badge variant="warning">In Progress</Badge>;
      case 'planned': return <Badge variant="info">Planned</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const linkBtnStyle: React.CSSProperties = {
    padding: '8px 16px', borderRadius: '4px',
    border: '1px solid #6c757d', backgroundColor: 'var(--app-surface)',
    color: '#6c757d', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
  };

  return (
    <AppShell>
      <PageHeader title="Documentation Browser" subtitle="B21 Module Documentation & Status" />
      <PageContent>
        <div className="page-container" data-testid="docs-page">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spinner /></div>
          ) : (
            <>
              <Card className="p-24 mb-24 bg-surface border">
                <h3 className="fs-18 fw-600 text-primary" style={{ margin: '0 0 16px 0' }}>Documentation Resources</h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button onClick={() => window.open('http://localhost:8001/docs', '_blank')} style={{ ...linkBtnStyle, borderColor: '#007bff', color: '#007bff' }}>
                    📚 MkDocs Site
                  </button>
                  <button onClick={() => window.location.href = '/api-docs'} style={linkBtnStyle}>📖 API Documentation</button>
                  <button onClick={() => window.open('https://github.com', '_blank')} style={linkBtnStyle}>🔗 GitHub Repository</button>
                </div>
              </Card>

              <Card className="p-24">
                <h3 style={{ margin: '0 0 16px 0' }}>Module Status Matrix</h3>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e5e5' }}>
                        <th className="p-12 text-left fs-12 fw-600">Module ID</th>
                        <th className="p-12 text-left fs-12 fw-600">Name</th>
                        <th className="p-12 text-left fs-12 fw-600">Status</th>
                        <th className="p-12 text-left fs-12 fw-600">Docs Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map(module => (
                        <tr key={module.id} style={{ borderBottom: '1px solid #e5e5e5' }}>
                          <td className="p-12 fw-600">{module.id}</td>
                          <td className="p-12">{module.name}</td>
                          <td className="p-12">{getStatusBadge(module.status)}</td>
                          <td className="p-12">{module.docs ? <span style={{ color: '#10b981' }}>✓</span> : <span style={{ color: '#ef4444' }}>✗</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </PageContent>
    </AppShell>
  );
}
