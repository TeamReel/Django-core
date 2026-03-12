import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@django-core/design-system';
import { periodPathKey } from '../../../utils/periodPath';
import { routes } from '../../../routes';

import {
  isPeriodActive,
  resolveRowContext,
} from '../../../utils/directoryHelpers';
import type { DirectoryListProps, RowContextConfig, Period } from '../../../utils/directoryHelpers';
import { useDirectoryFilters } from '../../../hooks/useDirectoryFilters';
import { useCompetitionsData } from '../../../hooks/useCompetitionsData';
import { DirectoryFilterBar } from '../../../components/DirectoryFilterBar';
import { DirectoryTableShell } from '../../../components/DirectoryTableShell';
import PeriodDetailModal from '../PeriodDetailModal';
import PeriodEditModal from '../PeriodEditModal';
import PeriodCreateModal from '../PeriodCreateModal';
import styles from './CompetitionsList.module.css';

export const CompetitionsList: React.FC<DirectoryListProps> = (props) => {
  const { preselectedClubSlug, preselectedTeamSlug } = props;
  const navigate = useNavigate();
  const filters = useDirectoryFilters({
    ...props,
    showSeasonFilter: true,
    showVariantFilter: true,
  });
  const {
    orgLocked, clubLocked, teamLocked,
    organisations, clubs, teams,
    selectedOrgId, selectedClubId, selectedTeamId,
    seasons,
    statusFilter,
    isLoading, error,
    triggerRefresh,
    lockedOrgSlug, orgKeyForRoutes,
  } = filters;

  const {
    sortedCompetitions,
    competitionsLoading,
    savePeriodEdits,
    createCompetition,
    handleDeleteCompetition,
  } = useCompetitionsData(filters);

  // Modal state
  const [detailCompetition, setDetailCompetition] = useState<Period | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editCompetition, setEditCompetition] = useState<Period | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const rowConfig = useMemo<RowContextConfig>(() => ({
    organisations, clubs, teams,
    lockedOrgSlug,
    preselectedClubSlug, preselectedTeamSlug,
    selectedOrgId, selectedClubId,
    fallbackOrgSlug: orgKeyForRoutes,
  }), [organisations, clubs, teams, lockedOrgSlug, preselectedClubSlug, preselectedTeamSlug, selectedOrgId, selectedClubId, orgKeyForRoutes]);

  return (
    <div>
      <DirectoryFilterBar
        filters={filters}
        createButtonLabel="Create Competition"
        onCreateClick={() => setIsCreateModalOpen(true)}
        showSeasonFilter
        showVariantFilter
      />

      <DirectoryTableShell
        isLoading={isLoading}
        error={error}
        domainLoading={competitionsLoading}
        domainLoadingMessage="Loading competitions..."
        emptyStateType="competitions"
        emptyDescription="Pas je filters aan of voeg een competitie toe."
        hideActions
        itemCount={sortedCompetitions.length}
      >
              <thead>
                <tr>
                    {!orgLocked && (
                      <th className={`dir-th ${styles.thFederation}`}>Federation</th>
                    )}
                    {!clubLocked && (
                      <th className={`dir-th ${styles.thClub}`}>Club</th>
                    )}
                    {!teamLocked && <th className={`dir-th ${styles.thTeam}`}>Team</th>}
                    <th className={`dir-th ${styles.thSeason}`}>Season</th>
                    <th className={`dir-th ${styles.thCompetition}`}>Competition</th>
                  <th className={`dir-th ${styles.thSport}`}>Sport</th>
                  <th className={`dir-th ${styles.thVariant}`}>Sport Variant</th>
                  <th className={`dir-th ${styles.thMatch}`}>Match</th>
                  <th className={`dir-th ${styles.thSquad}`}>Squad</th>
                  <th className={`dir-th ${styles.thStatus}`}>Status</th>
                  <th className={`dir-th ${styles.thActions}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedCompetitions
                  // Defensive filter: ensures the UI always matches the dropdown,
                  // even if a memo/cache issue ever causes stale lists.
                  .filter((comp) => {
                    if (statusFilter === 'active') return isPeriodActive(comp);
                    if (statusFilter === 'inactive') return !isPeriodActive(comp);
                    return true;
                  })
                  .map((comp) => {
                    const row = resolveRowContext(comp, rowConfig);
                    const seasonId = comp.parent_period_id || comp.parent_period?.id;

                    // Use matches_count
                    const matchesCount = comp.matches_count || 0;

                    // Use periodPathKey to generate slug from name (Period model has no slug field)
                    const seasonFromList = seasonId ? seasons.find(s => String(s.id) === String(seasonId)) : undefined;
                    const seasonSlugOrId = periodPathKey(seasonFromList || comp.parent_period) || seasonId;
                    const compSlugOrId = periodPathKey(comp) || comp.id;

                    // Competition shows its own sport VARIANT only (not org category as fallback)
                    const compSport = comp.sport;
                    const sportDisplay = compSport || null;

                    return (
                        <tr key={comp.id}>
                        {!orgLocked && (
                          <td className="dir-td-text">
                            {row.orgId ? (
                              <a
                                href={routes.orgDetailLegacy({ orgId: row.orgSlug! })}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(routes.orgDetailLegacy({ orgId: row.orgSlug! }));
                                }}
                              >
                                {row.orgName}
                              </a>
                            ) : row.orgName}
                          </td>
                        )}
                        {!clubLocked && (
                          <td className="dir-td-text">
                            {row.clubId ? (
                              <a
                                href={routes.club({ orgId: row.orgSlug!, clubId: row.clubSlug! })}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(routes.club({ orgId: row.orgSlug!, clubId: row.clubSlug! }));
                                }}
                              >
                                {row.clubName}
                              </a>
                            ) : row.clubName}
                          </td>
                        )}
                        {!teamLocked && (
                          <td className="dir-td-text">
                            {row.teamId ? (
                              <a
                                href={row.teamBasePath}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(row.teamBasePath);
                                }}
                              >
                                {row.teamName}
                              </a>
                            ) : row.teamName}
                          </td>
                        )}
                        <td className="dir-td-text">
                            {seasonId ? (
                                <a
                            href={`${row.teamBasePath}/${seasonSlugOrId}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate(
                                `${row.teamBasePath}/${seasonSlugOrId}`
                                    );
                                }}
                                >
                                {comp.parent_period?.name || '-'}
                                </a>
                            ) : (
                                comp.parent_period?.name || '-'
                            )}
                        </td>
                        <td className="dir-td-text">
                            <a
                          href={`${row.teamBasePath}/${seasonSlugOrId}/${compSlugOrId}`}
                            className="text-blue-600 hover:underline"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate(
                            `${row.teamBasePath}/${seasonSlugOrId}/${compSlugOrId}`,
                                );
                            }}
                            >
                            {comp.name}
                            </a>
                        </td>
                        <td className="dir-td">
                          {sportDisplay?.category_name ? (
                            <span className="fs-12">{sportDisplay.category_name}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="dir-td">
                          {sportDisplay ? (
                            <span className="flex-row gap-4">
                              <span>{sportDisplay.sport_icon}</span>
                              <span className="fs-12">{sportDisplay.name}</span>
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="dir-td">
                            <Badge variant="default">
                                {matchesCount}
                            </Badge>
                        </td>
                        <td className="dir-td">-</td>
                         <td className="dir-td">
                           {(() => {
                             const isActive = isPeriodActive(comp);
                             return (
                               <Badge variant={isActive ? 'success' : 'warning'}>
                                 {isActive ? 'Active' : 'Inactive'}
                               </Badge>
                             );
                           })()}
                         </td>
                        <td className="dir-td">
                            <div className="dir-actions">
                                <button
                                    onClick={() => {
                                 setDetailCompetition(comp);
                                 setIsDetailModalOpen(true);
                                    }}
                                    className="action-btn action-btn-primary"
                                >
                                    View
                                </button>
                                <button
                              onClick={() => {
                                setEditCompetition(comp);
                                setIsEditModalOpen(true);
                              }}
                                    className="action-btn action-btn-warning"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDeleteCompetition(String(row.orgId), comp.id, comp.name)}
                                    className="action-btn action-btn-danger"
                                >
                                    Delete
                                </button>
                            </div>
                        </td>
                        </tr>
                    );
                })}
              </tbody>
      </DirectoryTableShell>

      <PeriodCreateModal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Competition"
        organisations={organisations}
        clubs={clubs}
        teams={teams}
        requirements={{
          requireOrganisation: true,
          requireClub: true,
          requireTeam: true,
          requireSeason: true,
          showSportVariant: true,
        }}
        initialOrganisationId={selectedOrgId}
        initialClubId={selectedClubId}
        initialTeamId={selectedTeamId}
        onCreate={createCompetition}
      />

      <PeriodDetailModal
        opened={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        period={detailCompetition as any}
      />

      <PeriodEditModal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        period={editCompetition as any}
        showSportVariant={true}
        organisationSportId={(() => {
          const selectedOrg = selectedOrgId
            ? organisations.find((o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId))
            : null;
          return selectedOrg?.sport?.id || null;
        })()}
        onSave={async (payload) => {
          if (!editCompetition) return;
          await savePeriodEdits(editCompetition.id, payload);
          triggerRefresh();
        }}
      />
    </div>
  );
};
