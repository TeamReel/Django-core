import React from 'react';
import { Card, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';

/**
 * Working ProfilePage with AppShell
 */
export const ProfilePage: React.FC = () => {
  return (
    <AppShell>
      <div>
        <PageHeader
          title="My Profile"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Identity' },
            { label: 'Profile' },
          ]}
        />

        <PageContent>
          <Card>
            <h2>Profile Information</h2>
            <p>Welcome to your profile page!</p>
          </Card>

          <Alert variant="info" className="mt-4">
            API endpoint /api/users/me/ returned 404. This is expected in demo mode.
          </Alert>
        </PageContent>
      </div>
    </AppShell>
  );
};

export default ProfilePage;
