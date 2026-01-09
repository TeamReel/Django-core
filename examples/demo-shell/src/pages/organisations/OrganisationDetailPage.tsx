import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import AppShell from '../../components/AppShell';

interface Organisation {
  id: string;
  slug: string;
  name: string;
  description?: string;
}

export default function OrganisationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { switchContext } = useContextSwitcher();

  useEffect(() => {
    if (!id) return;

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    fetch(`${apiBaseUrl}/api/v1/organisations/${id}/`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch organisation');
        return res.json();
      })
      .then(async data => {
        setOrganisation(data);
        // Update context without triggering navigation
        await switchContext(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [id]); // Remove switchContext from dependencies to prevent infinite loop

  if (isLoading) {
    return (
      <AppShell>
        <p>Loading organisation...</p>
      </AppShell>
    );
  }

  if (error || !organisation) {
    return (
      <AppShell>
        <div style={{
          padding: '12px',
          backgroundColor: 'var(--app-surface-2)',
          border: '1px solid #bd2130',
          borderRadius: '4px',
          color: '#dc3545'
        }}>
          {error || 'Organisation not found'}
        </div>
        <Link to="/organisations" style={{ display: 'inline-block', marginTop: '16px' }}>
          ← Back to Organisations
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div>
        <nav style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--app-muted-text)' }}>
          <Link to="/organisations">Organisations</Link> / {organisation.name}
        </nav>

        <h1 style={{ color: 'var(--app-text)' }}>{organisation.name}</h1>

        {organisation.description && (
          <p style={{ color: 'var(--app-muted-text)', fontSize: '16px', marginBottom: '32px' }}>
            {organisation.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          <Link
            to={`/organisations/${organisation.slug}/projects`}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 500,
              border: '1px solid #0056b3'
            }}
          >
            View Projects
          </Link>
        </div>

        <div style={{
          border: '1px solid var(--app-border)',
          borderRadius: '8px',
          padding: '24px',
          backgroundColor: 'var(--app-surface)'
        }}>
          <h2 style={{ marginTop: 0, color: 'var(--app-text)' }}>Organisation Details</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '12px' }}>
            <dt style={{ fontWeight: 600, color: 'var(--app-muted-text)' }}>Name:</dt>
            <dd style={{ margin: 0, color: 'var(--app-text)' }}>{organisation.name}</dd>

            <dt style={{ fontWeight: 600, color: 'var(--app-muted-text)' }}>Slug:</dt>
            <dd style={{ margin: 0, fontFamily: 'monospace', color: 'var(--app-text)' }}>{organisation.slug}</dd>

            <dt style={{ fontWeight: 600, color: 'var(--app-muted-text)' }}>ID:</dt>
            <dd style={{ margin: 0, fontFamily: 'monospace', color: 'var(--app-text)' }}>{organisation.id}</dd>
          </dl>
        </div>
      </div>
    </AppShell>
  );
}
