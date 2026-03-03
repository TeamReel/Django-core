import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DefaultEmpty } from '@django-core/page-templates';
import { getApiBaseUrl } from '../../utils/apiBase';
import type { Organisation } from '../../types';

type OrganisationCard = Organisation & {
  slug: string;
  total_players_count?: number;
};

export default function OrganisationListPage() {
  const [organisations, setOrganisations] = useState<OrganisationCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiBaseUrl = getApiBaseUrl();

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
        let orgs: OrganisationCard[] = [];
        if (Array.isArray(data)) {
          orgs = data as OrganisationCard[];
        } else if (Array.isArray(data.data)) {
          orgs = data.data as OrganisationCard[];
        } else if (Array.isArray(data.results)) {
          orgs = data.results as OrganisationCard[];
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
    <>
      <div>
        <h1>Organisations</h1>
        <p className="mb-24" style={{ color: '#666' }}>Select an organisation to view its projects and resources.</p>

        {isLoading && <p>Loading organisations...</p>}

        {error && (
          <div className="p-12 rounded-4 mb-16" style={{
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            color: '#c00'
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

        <div className="grid gap-20" style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
        }}>
          {organisations.map(org => (
            <div
              key={org.id}
              className="border rounded-8 p-20 bg-surface"
              style={{
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <h3 className="text-primary mt-0">{org.name}</h3>
              {org.description && (
                <p className="text-muted fs-14">{org.description}</p>
              )}

              {/* Data Overview Stats */}
              <div className="grid gap-12 p-12 rounded-6 fs-13" style={{
                gridTemplateColumns: '1fr 1fr 1fr',
                margin: '16px 0',
                backgroundColor: 'var(--app-bg-subtle, rgba(0,0,0,0.03))'
              }}>
                 <div title="Root Projects (Clubs)">
                   <div className="text-muted fs-11 uppercase tracking-wide">Clubs</div>
                   <div className="fs-18 fw-600 text-primary">{org.clubs_count ?? '-'}</div>
                 </div>
                 <div title="Sub Projects (Teams)">
                   <div className="text-muted fs-11 uppercase tracking-wide">Teams</div>
                   <div className="fs-18 fw-600 text-primary">{org.teams_count ?? '-'}</div>
                 </div>
                 <div title="Active Player Memberships">
                   <div className="text-muted fs-11 uppercase tracking-wide">Players</div>
                   <div className="fs-18 fw-600 text-primary">{org.total_players_count ?? '-'}</div>
                 </div>
                 <div title="Total Matches">
                   <div className="text-muted fs-11 uppercase tracking-wide">Matches</div>
                   <div className="fs-18 fw-600 text-primary">{org.matches_count ?? '-'}</div>
                 </div>
                 <div title="Seasons">
                   <div className="text-muted fs-11 uppercase tracking-wide">Seasons</div>
                   <div className="fs-18 fw-600 text-primary">{org.seasons_count ?? '-'}</div>
                 </div>
                 <div title="Org Admins">
                    <div className="text-muted fs-11 uppercase tracking-wide">Admins</div>
                    <div className="fs-18 fw-600 text-primary">{org.member_count ?? '-'}</div>
                 </div>
              </div>

              <div className="flex-row gap-8 mt-16">
                <Link
                  to={`/organisations/${org.slug}`}
                  className="py-8 px-16 rounded-4 fs-14 text-white text-decoration-none"
                  style={{
                    backgroundColor: 'var(--app-primary)',
                  }}
                >
                  View Details
                </Link>
                <Link
                  to={`/organisations/${org.slug}/projects`}
                  className="py-8 px-16 rounded-4 fs-14 text-white text-decoration-none"
                  style={{
                    backgroundColor: '#6c757d',
                  }}
                >
                  View Projects
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
