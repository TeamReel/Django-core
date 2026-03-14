import { Link } from 'react-router-dom';
import SmartEmptyState from '../../components/SmartEmptyState';
import { organisationsApi } from '@/api';
import { useAsync } from '@/hooks/useAsync';
import type { Organisation } from '../../types';
import styles from './OrganisationListPage.module.css';

type OrganisationCard = Organisation & {
  slug: string;
  total_players_count?: number;
};

export default function OrganisationListPage() {
  const { data: organisations, loading: isLoading, error } = useAsync(
    () => organisationsApi.list().then(({ results }) => results as OrganisationCard[]),
    [],
  );

  // Context will be set automatically by OrganisationDetailPage after navigation

  return (
    <>
      <div>
        <h1>Organisations</h1>
        <p className={`mb-24 ${styles.subtitle}`}>Select an organisation to view its projects and resources.</p>

        {isLoading && <p>Loading organisations...</p>}

        {error && (
          <div className={`p-12 rounded-4 mb-16 ${styles.errorBanner}`}>
            {error}
          </div>
        )}

        {!isLoading && !error && (!organisations || organisations.length === 0) && (
          <SmartEmptyState
            type="generic"
            title="Geen organisaties gevonden"
            description="Je hebt nog geen toegang tot een organisatie. Neem contact op met je beheerder."
            hideActions
          />
        )}

        <div className={`grid gap-20 ${styles.grid}`}>
          {(organisations || []).map(org => (
            <div
              key={org.id}
              className={`border rounded-8 p-20 bg-surface ${styles.card}`}
            >
              <h3 className="text-primary mt-0">{org.name}</h3>
              {org.description && (
                <p className="text-muted fs-14">{org.description}</p>
              )}

              {/* Data Overview Stats */}
              <div className={`grid gap-12 p-12 rounded-6 fs-13 ${styles.statsGrid}`}>
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
                  className={`py-8 px-16 rounded-4 fs-14 text-white text-decoration-none ${styles.primaryButton}`}
                >
                  View Details
                </Link>
                <Link
                  to={`/organisations/${org.slug}/projects`}
                  className={`py-8 px-16 rounded-4 fs-14 text-white text-decoration-none ${styles.secondaryButton}`}
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
