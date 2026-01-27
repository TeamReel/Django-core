import React from 'react';
import { Card, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';

export const BillingPage: React.FC = () => {
  return (
    <>
      <PageHeader
        title="Billing & Licensing"
        subtitle="Plans, invoices, and usage (coming soon)"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Preferences' },
          { label: 'Billing & Licensing' },
        ]}
      />

      <PageContent>
        <Alert variant="info" style={{ marginBottom: 16 }}>
          This area is a placeholder. We’ll use it later for invoices, subscription plans, and license seats.
        </Alert>

        <Card>
          <h3 className="text-lg font-semibold mb-2">Planned</h3>
          <div className="text-sm text-gray-600" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>• Current plan + renewal</div>
            <div>• Invoice history (PDF)</div>
            <div>• Payment method</div>
            <div>• Seats / licensing (per org)</div>
          </div>
        </Card>
      </PageContent>
    </>
  );
};

export default BillingPage;
