import { Card, Badge } from '@django-core/design-system';
import AppShell from '../../components/AppShell';
import cs from './ContextSwitcherPage.module.css';

export function ContextSwitcherPage() {
  return (
    <AppShell>
    <div className="bg-primary min-h-screen" data-testid="context-switcher-page">
      <div className="p-24 border-bottom bg-surface">
        <h1 className={`fw-700 ${cs.pageTitle}`}>Context Switcher</h1>
        <p className="m-0 fs-14 text-muted">F03 Multi-Tenancy Context Demo</p>
      </div>
      <div className="page-container">
        <Card className="p-24 mb-24 bg-surface border">
          <h3 className="m-0 mb-16">Current Context</h3>
          <div className="mb-12">
            <p className="m-0 mb-4 text-muted">Organization</p>
            <Badge variant="primary">ACME Corp</Badge>
          </div>
          <div>
            <p className="m-0 mb-4 text-muted">Project</p>
            <Badge variant="success">Platform Core</Badge>
          </div>
        </Card>
        <Card className="p-24 bg-surface border">
          <h3 className="m-0 mb-16">Available Organizations</h3>
          <div className={`grid gap-12 ${cs.orgGrid}`}>
            {['ACME Corp', 'TechStart Inc', 'Global Solutions'].map((org) => (
              <div key={org} className="border rounded-8 p-12">
                <p className="m-0 fw-600">{org}</p>
                <p className="m-0 mt-4 fs-12 text-muted">3 projects</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
    </AppShell>
  );
}

export default ContextSwitcherPage;
