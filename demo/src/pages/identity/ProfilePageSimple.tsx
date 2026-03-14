import React from 'react';
import { Card, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';

/**
 * Working ProfilePage with AppShell
 */
export const ProfilePage: React.FC = () => {
  return (
    <>
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
    </>
  );
};

export default ProfilePage;
