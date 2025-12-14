import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
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
  const { switchContext } = useContextSwitcher();

  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    
    fetch(`${apiBaseUrl}/api/organisations/`, {
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
        setOrganisations(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  const handleSelectOrg = async (org: Organisation) => {
    await switchContext(org);
  };

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
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <h3 style={{ marginTop: 0 }}>{org.name}</h3>
              {org.description && (
                <p style={{ color: '#666', fontSize: '14px' }}>{org.description}</p>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <Link
                  to={`/organisations/${org.slug}`}
                  onClick={() => handleSelectOrg(org)}
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
                  onClick={() => handleSelectOrg(org)}
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
