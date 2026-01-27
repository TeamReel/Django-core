import React from 'react';
import { Card, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import { useAuth } from '@django-core/auth-ui';

export const MembershipsPage: React.FC = () => {
  const { user } = useAuth();

  const organisations: any[] = Array.isArray((user as any)?.organisations) ? (user as any).organisations : [];
  const projects: any[] = Array.isArray((user as any)?.projects) ? (user as any).projects : [];

  return (
    <>
      <PageHeader
        title="Memberships"
        subtitle="Where you’re a member across federations/clubs/teams"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Preferences' },
          { label: 'Memberships' },
        ]}
      />

      <PageContent>
        {!user && (
          <Alert variant="error">Not signed in.</Alert>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card>
            <h3 className="text-lg font-semibold mb-2">Federations</h3>
            <div className="text-sm text-gray-600" style={{ marginBottom: 12 }}>
              Organisations you belong to.
            </div>
            {organisations.length === 0 ? (
              <div className="text-sm text-gray-600">No organisation memberships found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {organisations.map((o) => (
                  <div
                    key={String(o?.id ?? o?.slug ?? Math.random())}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      border: '1px solid var(--app-border)',
                      borderRadius: 8,
                      background: 'var(--app-surface)',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{String(o?.name || o?.title || o?.slug || o?.id || '—')}</div>
                    <div className="text-xs text-gray-500">{String(o?.role || o?.membership_role || '').trim()}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-2">Teams / Clubs</h3>
            <div className="text-sm text-gray-600" style={{ marginBottom: 12 }}>
              Projects (clubs/teams) you belong to.
            </div>
            {projects.length === 0 ? (
              <div className="text-sm text-gray-600">No project memberships found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {projects.map((p) => (
                  <div
                    key={String(p?.id ?? p?.slug ?? Math.random())}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      border: '1px solid var(--app-border)',
                      borderRadius: 8,
                      background: 'var(--app-surface)',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{String(p?.name || p?.title || p?.slug || p?.id || '—')}</div>
                    <div className="text-xs text-gray-500">{String(p?.role || p?.membership_role || '').trim()}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </PageContent>
    </>
  );
};

export default MembershipsPage;
