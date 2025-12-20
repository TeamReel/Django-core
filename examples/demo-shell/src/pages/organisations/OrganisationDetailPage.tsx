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
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c00'
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
        <nav style={{ marginBottom: '24px', fontSize: '14px', color: '#666' }}>
          <Link to="/organisations">Organisations</Link> / {organisation.name}
        </nav>

        <h1>{organisation.name}</h1>

        {organisation.description && (
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '32px' }}>
            {organisation.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          <Link
            to={`/organisations/${organisation.slug}/projects`}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 500
            }}
          >
            View Projects
          </Link>
        </div>

        <div style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '24px',
          backgroundColor: '#f8f9fa'
        }}>
          <h2 style={{ marginTop: 0 }}>Organisation Details</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '12px' }}>
            <dt style={{ fontWeight: 600 }}>Name:</dt>
            <dd style={{ margin: 0 }}>{organisation.name}</dd>

            <dt style={{ fontWeight: 600 }}>Slug:</dt>
            <dd style={{ margin: 0, fontFamily: 'monospace' }}>{organisation.slug}</dd>

            <dt style={{ fontWeight: 600 }}>ID:</dt>
            <dd style={{ margin: 0, fontFamily: 'monospace' }}>{organisation.id}</dd>
          </dl>
        </div>
      </div>
    </AppShell>
  );
}
