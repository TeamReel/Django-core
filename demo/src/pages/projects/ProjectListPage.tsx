import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
// import { useContextSwitcher } from '@django-core/context-switcher';
import SmartEmptyState from '../../components/SmartEmptyState';
import { organisationsApi } from '../../api';
import styles from './ProjectListPage.module.css';

interface Project {
  id: string;
  slug: string;
  name: string;
  description?: string;
  status?: string;
  // New API fields
  member_count?: number;
  seasons_count?: number;
  matches_count?: number;
  parent_id?: string | null;
  parent_name?: string | null;
}

export default function ProjectListPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const { context } = useContextSwitcher();
  const [orgName, setOrgName] = useState<string>('');

  // Fetch organisation name first
  useEffect(() => {
    if (!orgId) return;

    organisationsApi.get(orgId)
      .then((data: any) => setOrgName(data.name))
      .catch(() => setOrgName('Organisation'));
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;

    organisationsApi.listProjects(orgId)
      .then((data: any) => {
        // Handle both paginated (DRF) and non-paginated responses
        let projectsList = data;
        if (data.results && Array.isArray(data.results)) {
          projectsList = data.results;
        }
        setProjects(projectsList);
        setIsLoading(false);
      })
      .catch((err: any) => {
        setError(err.message || err.detail || 'Failed to fetch projects');
        setIsLoading(false);
      });
  }, [orgId]);

  return (
    <>
      <div>
        <nav className="mb-24 fs-14 text-muted">
          <Link to="/federations">Organisations</Link>
          {orgId && orgName && (
            <>
              {' '}/ <Link to={`/organisations/${orgId}`}>
                {orgName}
              </Link>
            </>
          )}
          {' '}/ Projects
        </nav>

        <h1>Projects</h1>
        <p className="mb-24 text-muted">
          Select a project to view its details and resources.
        </p>

        {isLoading && <p>Loading projects...</p>}

        {error && (
          <div className={`p-12 rounded-4 mb-16 ${styles.errorAlert}`}>
            {error}
          </div>
        )}

        {!isLoading && !error && projects.length === 0 && (
          <SmartEmptyState
            type="projects"
            description="Deze organisatie heeft nog geen projecten. Maak een project aan om te beginnen."
          />
        )}

        {/* Group projects by parent (Club -> Teams) */}
        {!isLoading && (
          <div className="flex-col gap-24">
            {/* Render Root Projects (Clubs) */}
            {projects.filter(p => !p.parent_id).map(club => {
              const teams = projects.filter(p => p.parent_id === club.id);

              return (
                <div
                  key={club.id}
                  className={`border rounded-8 p-24 bg-surface ${styles.clubCard}`}
                >
                  <div className={`mb-16 flex-between ${styles.clubHeader}`}>
                    <div>
                        <div className="flex-row gap-12">
                        <h3 className="m-0 text-primary fs-20">{club.name}</h3>
                        <span className={`fs-11 fw-600 rounded-4 uppercase ${styles.clubBadge}`}>CLUB</span>
                      </div>
                      {club.description && (
                        <p className={`text-muted fs-14 mt-8 ${styles.descriptionNoMargin}`}>{club.description}</p>
                      )}
                    </div>
                    <div>
                       <Link
                        to={`/organisations/${orgId}/projects/${club.slug || club.id}`}
                        className={`py-8 px-16 rounded-4 fs-14 fw-500 text-white text-decoration-none ${styles.manageClubLink}`}
                      >
                        Manage Club
                      </Link>
                    </div>
                  </div>

                  {/* Club Stats */}
                  <div className={`flex-row gap-24 fs-14 text-secondary ${styles.clubStats}`}>
                     <div><strong>{teams.length}</strong> Teams</div>
                     <div><strong>{club.member_count ?? 0}</strong> Direct Members</div>
                  </div>

                  {/* Teams Grid */}
                  {teams.length > 0 ? (
                    <div className="mt-16">
                      <h4 className="fs-13 uppercase tracking-wide text-muted mt-0 mb-12">Active Teams</h4>
                      <div className={`grid gap-12 ${styles.teamsGrid}`}>
                        {teams.map(team => (
                          <div
                            key={team.id}
                            className={`flex-between border rounded-6 py-12 px-16 ${styles.teamCard}`}
                          >
                            <div>
                               <Link
                                 to={`/organisations/${orgId}/projects/${team.slug || team.id}`}
                                 className="fw-600 text-primary block text-decoration-none"
                               >
                                 {team.name}
                               </Link>
                               <div className="fs-12 mt-4 text-muted">
                                 {team.seasons_count ?? 0} Seasons • {team.matches_count ?? 0} Matches
                               </div>
                            </div>
                            <div className="text-right">
                               <div className="fs-12 fw-600 text-primary">{team.member_count ?? 0}</div>
                               <div className={styles.playersLabel}>PLAYERS</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={`mt-16 fs-14 text-muted ${styles.noTeams}`}>
                      <SmartEmptyState type="teams" compact hideActions description="Er zijn nog geen teams aangemaakt voor deze club." />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
