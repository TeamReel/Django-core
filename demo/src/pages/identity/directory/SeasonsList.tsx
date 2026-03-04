import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { periodPathKey } from '../../../utils/periodPath';
import { Badge } from '@django-core/design-system';
import PeriodDetailModal from '../PeriodDetailModal';
import PeriodEditModal from '../PeriodEditModal';
import PeriodCreateModal from '../PeriodCreateModal';
import {
    resolveRowContext,
} from '../../../utils/directoryHelpers';
import type { DirectoryListProps, RowContextConfig } from '../../../utils/directoryHelpers';
import { useDirectoryFilters } from '../../../hooks/useDirectoryFilters';
import { useSeasonsData } from '../../../hooks/useSeasonsData';
import { DirectoryFilterBar } from '../../../components/DirectoryFilterBar';
import { DirectoryTableShell } from '../../../components/DirectoryTableShell';

import type { Period } from '../../../utils/directoryHelpers';
import styles from './SeasonsList.module.css';

export const SeasonsList: React.FC<DirectoryListProps> = (props) => {
  const { preselectedClubSlug, preselectedTeamSlug } = props;
  const navigate = useNavigate();
  const filters = useDirectoryFilters(props);
  const {
    orgLocked, clubLocked, teamLocked,
    organisations, clubs, teams,
    selectedOrgId, selectedClubId, selectedTeamId,
    isLoading, error,
    triggerRefresh,
    orgKeyForRoutes,
  } = filters;

  const {
    filteredSeasons,
    sortedSeasons,
    seasonsLoading,
    savePeriodEdits,
    createSeason,
    handleDeleteSeason,
  } = useSeasonsData(filters);

  // Modal state
  const [detailSeason, setDetailSeason] = useState<Period | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editSeason, setEditSeason] = useState<Period | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const rowConfig = useMemo<RowContextConfig>(() => ({
    organisations, clubs, teams,
    preselectedClubSlug, preselectedTeamSlug,
    selectedOrgId, selectedClubId,
    fallbackOrgSlug: orgKeyForRoutes,
  }), [organisations, clubs, teams, preselectedClubSlug, preselectedTeamSlug, selectedOrgId, selectedClubId, orgKeyForRoutes]);

  return (
    <div>
      <DirectoryFilterBar
        filters={filters}
        createButtonLabel="Create Season"
        onCreateClick={() => setIsCreateModalOpen(true)}
      />

      <DirectoryTableShell
        isLoading={isLoading}
        error={error}
        domainLoading={seasonsLoading}
        domainLoadingMessage="Loading seasons..."
        emptyStateType="seasons"
        emptyDescription="Pas je filters aan of maak een seizoen aan."
        hideActions
        itemCount={filteredSeasons.length}
      >
              <thead>
                <tr>
                    {!orgLocked && (
                      <th className={`dir-th ${styles.col140}`}>Federation</th>
                    )}
                    {!clubLocked && (
                      <th className={`dir-th ${styles.col140}`}>Club</th>
                    )}
                    {!teamLocked && <th className={`dir-th ${styles.col140}`}>Team</th>}
                    <th className={`dir-th ${styles.col260}`}>Season</th>
                  <th className={`dir-th ${styles.col140}`}>Sport</th>
                  <th className={`dir-th ${styles.col90}`}>Variant</th>
                  <th className={`dir-th ${styles.col110}`}>Competition</th>
                  <th className={`dir-th ${styles.col100}`}>Match</th>
                    <th className={`dir-th ${styles.col90}`}>Squad</th>
                    <th className={`dir-th ${styles.col100}`}>Status</th>
                    <th className={`dir-th ${styles.col140}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSeasons.map((season) => {
                    const row = resolveRowContext(season, rowConfig);

                    // Season shows its own sport VARIANT only (not org category as fallback)
                    const seasonSport = (season as any).sport;
                    const sportDisplay = seasonSport
                      ? { name: seasonSport.name, sport_icon: seasonSport.sport_icon, category_name: seasonSport.category_name }
                      : null;

                    const seasonSlugOrId = periodPathKey(season) || season.slug || season.id;

                    // Use canonical vanity path when club is available: /:org/:club/:team/:season
                    const seasonDetailPath = (row.orgSlug && row.teamSlug && seasonSlugOrId)
                      ? (row.clubSlug
                          ? `/${row.orgSlug}/${row.clubSlug}/${row.teamSlug}/${seasonSlugOrId}`
                          : `/organisations/${row.orgSlug}/projects/${row.teamSlug}/seasons/${seasonSlugOrId}`)
                      : null;

                    return (
                    <tr key={season.id}>
                        {!orgLocked && (
                          <td className="dir-td-text">
                            {row.orgSlug ? (
                              <a
                                href={`/organisations/${row.orgSlug}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/organisations/${row.orgSlug}`);
                                }}
                              >
                                {row.orgName}
                              </a>
                            ) : (
                              row.orgName
                            )}
                          </td>
                        )}
                        {!clubLocked && (
                          <td className="dir-td-text">
                            {row.clubSlug && row.orgSlug ? (
                              <a
                                href={`/${row.orgSlug}/${row.clubSlug}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/${row.orgSlug}/${row.clubSlug}`);
                                }}
                              >
                                {row.clubName}
                              </a>
                            ) : (
                              row.clubName
                            )}
                          </td>
                        )}
                        {!teamLocked && (
                          <td className="dir-td-text">
                            {row.teamSlug && row.orgSlug ? (
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
                            ) : (
                              row.teamName
                            )}
                          </td>
                        )}
                        <td className="dir-td-text">
                          {seasonDetailPath ? (
                            <a
                              href={seasonDetailPath}
                              className="text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(seasonDetailPath);
                              }}
                            >
                              {season.name}
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDetailSeason(season as any);
                                setIsDetailModalOpen(true);
                              }}
                              className={`bg-transparent border-none p-0 m-0 cursor-pointer ${styles.seasonNameBtn}`}
                            >
                              {season.name}
                            </button>
                          )}
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
                                {season.children_count || 0}
                            </Badge>
                        </td>
                        <td className="dir-td">
                            <Badge variant="default">
                            {(season as any).matches_total_count ?? season.matches_count ?? 0}
                            </Badge>
                        </td>
                        <td className="dir-td">
                            <Badge variant="default">
                                {(season as any).members_count || 0}
                            </Badge>
                        </td>
                         <td className="dir-td">
                           {(() => {
                             const today = new Date().toISOString().split('T')[0];
                             const start = season.start_date || '0000-00-00';
                             const end = season.end_date || '9999-99-99';
                             const isActive = today >= start && today <= end;
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
                                    setDetailSeason(season);
                                    setIsDetailModalOpen(true);
                                }}
                                className="action-btn action-btn-primary"
                            >
                                View
                            </button>
                            <button
                              onClick={() => {
                                setEditSeason(season);
                                setIsEditModalOpen(true);
                              }}
                              className="action-btn action-btn-warning"
                            >
                              Edit
                            </button>
                            <button
                                onClick={() => handleDeleteSeason(String(row.orgId), season.id, season.name)}
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
        title="Create Season"
        organisations={organisations}
        clubs={clubs}
        teams={teams}
        requireOrganisation
        requireClub
        requireTeam
        initialOrganisationId={selectedOrgId}
        initialClubId={selectedClubId}
        initialTeamId={selectedTeamId}
        onCreate={createSeason}
      />

      <PeriodDetailModal
        opened={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        period={detailSeason as any}
      />

      <PeriodEditModal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        period={editSeason as any}
        showSportVariant={false}
        onSave={async (payload) => {
          if (!editSeason) return;
          await savePeriodEdits(editSeason.id, payload);
          triggerRefresh();
        }}
      />
    </div>
  );
};
