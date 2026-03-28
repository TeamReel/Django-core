/**
 * ProjectCompetitionDetailPage — orchestrator.
 * Delegates state to useCompetitionDetailData, tabs to extracted components.
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import { looksLikeUuid } from '../../utils/periodPath';
import PeriodDetailModal from '../identity/PeriodDetailModal';
import PeriodEditModal from '../identity/PeriodEditModal';
import MatchCreateModal from '../identity/MatchCreateModal';
import MatchEditModal from '../identity/MatchEditModal';
import MatchDetailModal from '../identity/MatchDetailModal';
import AddMemberModal from '../identity/AddMemberModal';
import ProjectSeasonMemberDetailPage from './ProjectSeasonMemberDetailPage';
import MobileTabBar from '../../components/MobileTabBar';
import { CompetitionMembershipDetailModal as MembershipDetailModal } from './CompetitionMembershipDetailModal';
import { CompetitionMembershipEditModal as MembershipEditModal } from './CompetitionMembershipEditModal';
import { CompetitionHierarchyTab } from './CompetitionHierarchyTab';
import { CompetitionContentTab } from './CompetitionContentTab';
import { CompetitionOverviewTab } from './CompetitionOverviewTab';
import { CompetitionMatchesTable } from './CompetitionMatchesTable';
import { useCompetitionDetailData } from './useCompetitionDetailData';
import pc from './ProjectCompetitionDetailPage.module.css';

export const ProjectCompetitionDetailPage: React.FC = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const effectiveCompetitionId = String(competitionId || '').trim();

  const d = useCompetitionDetailData(effectiveCompetitionId);

  // UUID competitionId → member detail page
  if (!d.isOrgRoute && looksLikeUuid(effectiveCompetitionId)) {
    return <ProjectSeasonMemberDetailPage />;
  }

  const isActiveCtx = !!d.competition && String((d.activeContext as { competition?: { id?: string } } | null)?.competition?.id ?? '') === String(d.competition?.id ?? '');

  return (
    <div>
      <PageHeader
        title={d.competition ? d.competition.name : 'Competition'}
        actions={
          <div className="flex-row gap-8 flex-wrap">
            <Button
              variant={isActiveCtx ? 'primary' : 'secondary'}
              size="sm"
              onClick={d.activateCompetitionContext}
              disabled={d.activatingContext || isActiveCtx}
              title="Set this competition as your active context"
              style={{
                backgroundColor: isActiveCtx ? 'var(--color-green-50)' : undefined,
                color: isActiveCtx ? 'var(--color-green-800)' : undefined,
                border: isActiveCtx ? '1px solid var(--color-green-400)' : undefined,
                cursor: d.activatingContext || isActiveCtx ? 'not-allowed' : 'pointer',
                opacity: d.activatingContext || isActiveCtx ? 0.8 : 1,
                fontWeight: isActiveCtx ? 600 : undefined,
              }}
            >
              {isActiveCtx ? '✓ Active Context' : 'Make active'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => d.navigate(`${d.seasonsBasePath}/${d.seasonKeyOrId}`)}>
              Back to Season
            </Button>
            <Button variant="secondary" size="sm" onClick={() => d.setIsMatchCreateModalOpen(true)}>Create Match</Button>
            <Button variant="secondary" size="sm" onClick={() => { d.setSelectedDetailPeriod(d.competition); d.setIsPeriodDetailModalOpen(true); }}>Bekijken</Button>
            <Button variant="secondary" size="sm" onClick={() => { d.setSelectedEditPeriod(d.competition); d.setIsPeriodEditModalOpen(true); }}>Bewerken</Button>
            <Button variant="secondary" size="sm" onClick={d.deleteCompetition} className={pc.dangerText}>Verwijderen</Button>
          </div>
        }
      />

      <MobileTabBar
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'hierarchy', label: 'Hierarchy' },
          { id: 'matches', label: 'Matches' },
          { id: 'content', label: 'Content' },
        ]}
        activeTab={d.activeTab}
      />

      <PageContent>
        {d.error && <Alert variant="error">{d.error}</Alert>}

        {d.loading ? (
          <Card><div className="p-16">Loading…</div></Card>
        ) : (
          <>
            {d.activeTab === 'overview' && (
              <CompetitionOverviewTab
                competition={d.competition}
                competitionMatchesCount={d.competitionMatchesCount}
                membersCount={d.members.length}
                matches={d.matches}
                matchesLoading={d.matchesLoading}
                matchDisplayTitle={d.matchDisplayTitle}
                matchDetailPath={d.matchDetailPath}
                navigateToTab={d.navigateToTab}
                setMatches={d.setMatches}
                matchModals={{
                  setSelectedDetailMatch: d.setSelectedDetailMatch,
                  setIsMatchDetailModalOpen: d.setIsMatchDetailModalOpen,
                  setSelectedEditMatch: d.setSelectedEditMatch,
                  setIsMatchEditModalOpen: d.setIsMatchEditModalOpen,
                }}
                apiBaseUrl={d.apiBaseUrl}
                userCanEditProject={d.userCanEditProject}
                setCompetition={d.setCompetition}
              />
            )}

            {d.activeTab === 'hierarchy' && (
              <CompetitionHierarchyTab
                hierarchySearch={d.hierarchySearch}
                setHierarchySearch={d.setHierarchySearch}
                matchesLoading={d.matchesLoading}
                filteredMatches={d.filteredMatches}
                navigate={d.navigate}
                matchDetailPath={d.matchDetailPath}
                matchDisplayTitle={d.matchDisplayTitle}
                competition={d.competition}
                season={d.season}
                seasonsBasePath={d.seasonsBasePath}
                seasonKeyOrId={d.seasonKeyOrId}
                matchModals={{
                  setIsMatchCreateModalOpen: d.setIsMatchCreateModalOpen,
                  setSelectedDetailMatch: d.setSelectedDetailMatch,
                  setIsMatchDetailModalOpen: d.setIsMatchDetailModalOpen,
                  setSelectedEditMatch: d.setSelectedEditMatch,
                  setIsMatchEditModalOpen: d.setIsMatchEditModalOpen,
                }}
                setMatches={d.setMatches}
                apiBaseUrl={d.apiBaseUrl}
                getCsrfToken={d.getCsrfToken}
              />
            )}

            {d.activeTab === 'matches' && (
              <Card>
                <div className="p-16">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Matches</h3>
                    <Button onClick={() => d.setIsMatchCreateModalOpen(true)}>Create Match</Button>
                  </div>
                  <CompetitionMatchesTable
                    rows={d.matches}
                    matchesLoading={d.matchesLoading}
                    matchDisplayTitle={d.matchDisplayTitle}
                    matchDetailPath={d.matchDetailPath}
                    apiBaseUrl={d.apiBaseUrl}
                    setMatches={d.setMatches}
                    setSelectedDetailMatch={d.setSelectedDetailMatch}
                    setIsMatchDetailModalOpen={d.setIsMatchDetailModalOpen}
                    setSelectedEditMatch={d.setSelectedEditMatch}
                    setIsMatchEditModalOpen={d.setIsMatchEditModalOpen}
                  />
                </div>
              </Card>
            )}

            {d.activeTab === 'content' && (
              <CompetitionContentTab
                matches={d.matches}
                matchMediaMap={d.matchMediaMap}
                matchMediaLoading={d.matchMediaLoading}
                matchDisplayTitle={d.matchDisplayTitle as unknown as (m: Record<string, unknown>) => string}
                isTeamRoute={d.isTeamRoute}
                orgSlugOrId={d.orgSlugOrId}
                clubSlugOrId={d.clubSlugOrId}
                projectSlugOrId={d.projectSlugOrId}
                seasonKeyOrId={d.seasonKeyOrId}
              />
            )}

            {/* ── Modals ── */}
            <PeriodEditModal
              opened={d.isPeriodEditModalOpen}
              onClose={() => d.setIsPeriodEditModalOpen(false)}
              period={d.selectedEditPeriod as unknown as import('../identity/PeriodEditModal').PeriodLike | null}
              showDates={false}
              organisationSportId={d.org?.sport?.id ? String(d.org.sport.id) : null}
              onSave={async (patch) => { if (d.selectedEditPeriod) await d.savePeriodEdits(d.selectedEditPeriod, patch); }}
            />
            <PeriodDetailModal opened={d.isPeriodDetailModalOpen} onClose={() => d.setIsPeriodDetailModalOpen(false)} period={d.selectedDetailPeriod} />
            <MatchEditModal
              opened={d.isMatchEditModalOpen}
              onClose={() => d.setIsMatchEditModalOpen(false)}
              match={d.selectedEditMatch as unknown as Parameters<typeof MatchEditModal>[0]['match']}
              mode={d.isTeamRoute ? 'team-context' : 'default'}
              onSave={async (patch) => { if (d.selectedEditMatch) await d.saveMatchEdits(d.selectedEditMatch, patch); }}
            />
            <MatchDetailModal
              opened={d.isMatchDetailModalOpen}
              onClose={() => { d.setIsMatchDetailModalOpen(false); d.setSelectedDetailMatch(null); }}
              match={d.selectedDetailMatch as unknown as Parameters<typeof MatchDetailModal>[0]['match']}
            />
            <MatchCreateModal
              opened={d.isMatchCreateModalOpen}
              onClose={() => d.setIsMatchCreateModalOpen(false)}
              mode={d.isTeamRoute ? 'team-context' : 'default'}
              apiBaseUrl={d.apiBaseUrl}
              initialIds={{
                organisationId: String(d.org?.id || ''),
                clubId: String(d.club?.id || ''),
                teamId: String(d.project?.id || ''),
                seasonId: String(d.resolvedSeasonId || d.season?.id || ''),
                competitionId: String(d.resolvedCompetitionId || d.competition?.id || ''),
              }}
              onCreate={async (payload) => { await d.createMatchInCompetition(payload); }}
            />
            <MembershipDetailModal
              opened={d.isMembershipDetailModalOpen}
              onClose={() => { d.setIsMembershipDetailModalOpen(false); d.setSelectedMembershipDetail(null); }}
              membership={d.selectedMembershipDetail}
            />
            <MembershipEditModal
              opened={d.isMembershipEditModalOpen}
              onClose={() => { d.setIsMembershipEditModalOpen(false); d.setSelectedMembershipEdit(null); }}
              membership={d.selectedMembershipEdit}
              onSave={async ({ role, functional_roles }) => {
                if (!d.selectedMembershipEdit) return;
                await d.saveMembershipRole(d.selectedMembershipEdit, role);
                await d.updateFunctionalRoles(d.selectedMembershipEdit, functional_roles);
                const mid = String(d.selectedMembershipEdit?.id || '').trim();
                d.setMembers((prev) => prev.map((m) => String(m.id) === mid ? { ...m, functional_roles } : m));
              }}
            />
            <AddMemberModal
              isOpen={d.isAddMemberOpen}
              onClose={() => d.setIsAddMemberOpen(false)}
              onSuccess={() => { d.setIsAddMemberOpen(false); d.refreshMembers(); }}
              contextLevel={d.isTeamRoute ? 'team' : 'club'}
              orgSlug={d.orgSlugOrId}
              clubProjectId={d.isTeamRoute ? (d.club?.id || d.clubSlugOrId) : (d.project?.id || d.projectSlugOrId)}
              teamProjectId={d.isTeamRoute ? (d.project?.id || d.projectSlugOrId) : undefined}
            />
          </>
        )}
      </PageContent>
    </div>
  );
};

export default ProjectCompetitionDetailPage;
