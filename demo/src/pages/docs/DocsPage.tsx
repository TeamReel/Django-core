import { useState, useEffect } from 'react';
import { PageHeader } from '@django-core/page-templates';
import { PageContent } from '@django-core/page-templates';
import { Card, Badge, Spinner } from '@django-core/design-system';
import styles from './DocsPage.module.css';

const DOCS_URL = import.meta.env.VITE_DOCS_URL || (import.meta.env.DEV ? 'http://localhost:8001/docs' : '/docs');
const GITHUB_URL = import.meta.env.VITE_GITHUB_URL || 'https://github.com/TeamReel/Django-core';

interface ModuleStatus {
  id: string;
  name: string;
  status: string;
  docs: boolean;
}

export function DocsPage() {
  const [modules, setModules] = useState<ModuleStatus[]>([]);
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
      case 'complete': return <Badge variant="success">Voltooid</Badge>;
      case 'in-progress': return <Badge variant="warning">In behandeling</Badge>;
      case 'planned': return <Badge variant="info">Gepland</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <PageHeader title="Documentation Browser" subtitle="B21 Module Documentation & Status" />
      <PageContent>
        <div className="page-container" data-testid="docs-page">
          {loading ? (
            <div className={styles.loadingWrapper}><Spinner /></div>
          ) : (
            <>
              <Card className="p-24 mb-24 bg-surface border">
                <h3 className={`fs-18 fw-600 text-primary ${styles.sectionHeading}`}>Documentation Resources</h3>
                <div className={styles.linkButtonGroup}>
                  <button onClick={() => window.open(DOCS_URL, '_blank')} className={styles.linkButtonPrimary}>
                    MkDocs Site
                  </button>
                  <button onClick={() => window.location.href = '/api-docs'} className={styles.linkButton}>API Documentation</button>
                  <button onClick={() => window.open(GITHUB_URL, '_blank')} className={styles.linkButton}>GitHub Repository</button>
                </div>
              </Card>

              <Card className="p-24">
                <h3 className={styles.sectionHeading}>Module Status Matrix</h3>
                <div className="overflow-x-auto">
                  <table className={`w-full ${styles.table}`}>
                    <thead>
                      <tr className={styles.tableHeadRow}>
                        <th className="p-12 text-left fs-12 fw-600">Module ID</th>
                        <th className="p-12 text-left fs-12 fw-600">Name</th>
                        <th className="p-12 text-left fs-12 fw-600">Status</th>
                        <th className="p-12 text-left fs-12 fw-600">Docs Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map(module => (
                        <tr key={module.id} className={styles.tableRow}>
                          <td className="p-12 fw-600">{module.id}</td>
                          <td className="p-12">{module.name}</td>
                          <td className="p-12">{getStatusBadge(module.status)}</td>
                          <td className="p-12">{module.docs ? <span className={styles.checkMark}>OK</span> : <span className={styles.crossMark}>✗</span>}</td>
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
    </>
  );
}

export default DocsPage;
