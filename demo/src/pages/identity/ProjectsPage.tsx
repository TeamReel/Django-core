import React from 'react';
import { Button, Alert, Card } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import { SkeletonTablePage } from '../../components/Skeleton';
import SmartEmptyState from '../../components/SmartEmptyState';
import WorkFilterBar from '../work/WorkFilterBar';
import ProjectEditModal from './ProjectEditModal';
import ProjectDetailModal from './ProjectDetailModal';
import { useProjectsPageData } from './useProjectsPageData';
import { ProjectsTable, filterProjects } from './ProjectsTable';
import { routes } from '../../routes';
import styles from './ProjectsPage.module.css';

/**
 * T008 - Projects List Page
 *
 * Purpose: Display org-scoped projects with pagination and filters
 * - Uses X-Organisation-ID header from context
 * - Supports sort/filter via query params (shareable URLs)
 * - Shows project metadata and member counts
 */
export const ProjectsPage: React.FC = () => {
  const d = useProjectsPageData();
  const {
    orgId, navigate, organisations, resolvedOrg, currentOrgSlug, currentOrgId,
    displayOrgName, context, loading, error, successMessage,
    statusFilter, setStatusFilter, selectedOrgId, setSelectedOrgId,
    selectedClubId, setSelectedClubId, selectedTeamId, setSelectedTeamId,
    filterOrganisationOptions, clubs, teams, orgNavigationIndex,
    isSuperAdmin, userCanCreateProject,
    isEditModalOpen, setIsEditModalOpen, selectedProject,
    isDetailModalOpen, setIsDetailModalOpen, detailProject,
    isOrgSelectionModalOpen, setIsOrgSelectionModalOpen,
    handleSaveProject, breadcrumbItems, projects,
  } = d;

  // Guard: wait for context switcher to load org
  if (orgId && context.isLoading) {
    return <SkeletonTablePage rows={5} columns={4} />;
  }

  const filtered = filterProjects(d);

  return (
    <>
      <PageHeader
        title={displayOrgName ? `${displayOrgName} - Projects` : 'All Projects'}
        breadcrumbs={breadcrumbItems}
        actions={
          <div className="flex-row gap-10 flex-wrap">
            {currentOrgSlug && (
              <Button variant="secondary" onClick={() => navigate(routes.orgDetailLegacy({ orgId: String(resolvedOrg?.slug || currentOrgId || '') }))}>
                Back to Organisation
              </Button>
            )}

            <WorkFilterBar
              showOrganisation
              organisations={filterOrganisationOptions}
              clubs={clubs}
              teams={teams}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              selectedOrgId={selectedOrgId}
              onOrganisationChange={(value) => {
                setSelectedOrgId(value);
                setSelectedClubId('');
                setSelectedTeamId('');
                if (currentOrgSlug) {
                  if (!value) { navigate('/projects'); return; }
                  const match = orgNavigationIndex.find(o => String(o.id) === String(value));
                  if (match?.slug) navigate(routes.orgProjects({ orgId: match.slug }));
                }
              }}
              selectedClubId={selectedClubId}
              onClubChange={(v) => { setSelectedClubId(v); setSelectedTeamId(''); }}
              selectedTeamId={selectedTeamId}
              onTeamChange={setSelectedTeamId}
              onClear={() => {
                setStatusFilter('active');
                setSelectedClubId('');
                setSelectedTeamId('');
                if (isSuperAdmin && !currentOrgSlug) setSelectedOrgId('');
              }}
            />

            {(!currentOrgSlug || (currentOrgSlug && userCanCreateProject)) && (
              <Button variant="primary" size="md"
                onClick={() => {
                  if (currentOrgSlug) navigate(routes.orgProjectCreate({ orgId: String(resolvedOrg?.slug || currentOrgId || '') }));
                  else setIsOrgSelectionModalOpen(true);
                }}>
                Create Project
              </Button>
            )}
          </div>
        }
      />

      <PageContent>
        {successMessage && (
          <Alert variant="success" className="mb-4" data-testid="project-success-alert">{successMessage}</Alert>
        )}
        {error && (
          <Alert variant="error" className="mb-4" data-testid="project-error-alert">{error}</Alert>
        )}

        {!loading && projects.length === 0 && (
          <SmartEmptyState
            type="projects"
            description={currentOrgSlug ? 'Maak een nieuw project aan om te beginnen.' : 'Geen toegankelijke projecten.'}
            hideActions={!currentOrgSlug}
          />
        )}

        {!loading && projects.length > 0 && filtered.length === 0 && (
          <SmartEmptyState
            type="search"
            title="Geen projecten gevonden"
            description="Pas je filters aan om resultaten te zien."
            hideActions
          />
        )}

        {!loading && filtered.length > 0 && (
          <Card><ProjectsTable d={d} /></Card>
        )}

        {loading && <div className="text-center py-8 text-gray-500">Loading projects...</div>}
      </PageContent>

      {/* Detail Modal */}
      <ProjectDetailModal opened={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} project={detailProject} />

      {/* Org Selection Modal */}
      {isOrgSelectionModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsOrgSelectionModalOpen(false)}>
          <div className={styles.modalContent}
            onClick={e => e.stopPropagation()}>
            <h2 className={`mb-16 ${styles.modalTitle}`}>Select Organisation</h2>
            <p className="text-muted mb-24">Choose an organisation to create the project in:</p>
            <div className="flex-col gap-8">
              {organisations.map(org => (
                <button key={org.id}
                  onClick={() => { setIsOrgSelectionModalOpen(false); navigate(routes.orgProjectCreate({ orgId: org.slug })); }}
                  className={styles.orgSelectButton}>
                  <div className="fw-500">{org.name}</div>
                  {org.description && <div className={`fs-12 mt-4 ${styles.orgDescription}`}>{org.description}</div>}
                </button>
              ))}
            </div>
            <div className="mt-16 text-right">
              <Button variant="outline" size="md" onClick={() => setIsOrgSelectionModalOpen(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <ProjectEditModal opened={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} project={selectedProject} onSave={handleSaveProject as any} />
    </>
  );
};

export default ProjectsPage;
