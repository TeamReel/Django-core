import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DefaultEmpty } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';

interface Organisation {
  id: string;
  slug: string;
  name: string;
  description?: string;
}

export default function OrganisationListPage() {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    fetch(`${apiBaseUrl}/api/v1/organisations/`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch organisations');
        return res.json();
      })
      .then(data => {
        console.log('Organisations API response:', data);
        // Handle various API response formats:
        // 1. Array directly: [...]
        // 2. B13 envelope: { data: [...] }
        // 3. DRF pagination: { results: [...] }
        let orgs = [];
        if (Array.isArray(data)) {
          orgs = data;
        } else if (Array.isArray(data.data)) {
          orgs = data.data;
        } else if (Array.isArray(data.results)) {
          orgs = data.results;
        }

        setOrganisations(orgs);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  // Context will be set automatically by OrganisationDetailPage after navigation

  return (
    <AppShell>
      <div>
        <h1>Organisations</h1>
        <p style={{ color: '#666', marginBottom: '24px' }}>Select an organisation to view its projects and resources.</p>

        {isLoading && <p>Loading organisations...</p>}

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c00',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {!isLoading && !error && organisations.length === 0 && (
          <DefaultEmpty
            title="No organisations found"
            message="You don't have access to any organisations yet. Contact your administrator to get started."
          />
        )}

        <div style={{
          display: 'grid',
          gap: '20px',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
        }}>
          {organisations.map(org => (
            <div
              key={org.id}
              style={{
                border: '1px solid var(--app-border)',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: 'var(--app-surface)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <h3 style={{ marginTop: 0, color: 'var(--app-text)' }}>{org.name}</h3>
              {org.description && (
                <p style={{ color: 'var(--app-muted-text)', fontSize: '14px' }}>{org.description}</p>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <Link
                  to={`/organisations/${org.slug}`}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  View Details
                </Link>
                <Link
                  to={`/organisations/${org.slug}/projects`}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  View Projects
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
