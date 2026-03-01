import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { periodPathKey } from '../../../utils/periodPath';
import { Badge } from '@django-core/design-system';
import PeriodDetailModal from '../PeriodDetailModal';
import PeriodEditModal from '../PeriodEditModal';
import PeriodCreateModal from '../PeriodCreateModal';
import {
    compactThStyle,
    compactTdStyle,
    compactTextTdStyle,
    compactActionsStyle,
    actionButtonStyle
} from '../../../utils/directoryStyles';
import {
    resolveRowContext,
} from '../../../utils/directoryHelpers';
import type { DirectoryListProps, RowContextConfig } from '../../../utils/directoryHelpers';
import { useDirectoryFilters } from '../../../hooks/useDirectoryFilters';
import { useSeasonsData } from '../../../hooks/useSeasonsData';
import { DirectoryFilterBar } from '../../../components/DirectoryFilterBar';
import { DirectoryTableShell } from '../../../components/DirectoryTableShell';

import type { Period } from '../../../utils/directoryHelpers';

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
        emptyMessage="No seasons found. Use filters to narrow your search."
        itemCount={filteredSeasons.length}
      >
              <thead>
                <tr>
                    {!orgLocked && (
                      <th style={{ ...compactThStyle, width: '140px' }}>Federation</th>
                    )}
                    {!clubLocked && (
                      <th style={{ ...compactThStyle, width: '140px' }}>Club</th>
                    )}
                    {!teamLocked && <th style={{ ...compactThStyle, width: '140px' }}>Team</th>}
                    <th style={{ ...compactThStyle, width: '260px' }}>Season</th>
                  <th style={{ ...compactThStyle, width: '140px' }}>Sport</th>
                  <th style={{ ...compactThStyle, width: '90px' }}>Variant</th>
                  <th style={{ ...compactThStyle, width: '110px' }}>Competition</th>
                  <th style={{ ...compactThStyle, width: '100px' }}>Match</th>
                    <th style={{ ...compactThStyle, width: '90px' }}>Squad</th>
                    <th style={{ ...compactThStyle, width: '100px' }}>Status</th>
                    <th style={{ ...compactThStyle, width: '140px' }}>Actions</th>
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
                          <td style={compactTextTdStyle}>
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
                          <td style={compactTextTdStyle}>
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
                          <td style={compactTextTdStyle}>
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
                        <td style={compactTextTdStyle}>
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
                              className="bg-transparent border-none p-0 m-0 cursor-pointer"
                              style={{
                                color: 'var(--app-link, #2563eb)',
                                textDecoration: 'underline',
                                font: 'inherit',
                              }}
                            >
                              {season.name}
                            </button>
                          )}
                        </td>

                        <td style={compactTdStyle}>
                          {sportDisplay?.category_name ? (
                            <span className="fs-12">{sportDisplay.category_name}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>

                        <td style={compactTdStyle}>
                          {sportDisplay ? (
                            <span className="flex-row gap-4">
                              <span>{sportDisplay.sport_icon}</span>
                              <span className="fs-12">{sportDisplay.name}</span>
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td style={compactTdStyle}>
                            <Badge variant="default">
                                {season.children_count || 0}
                            </Badge>
                        </td>
                        <td style={compactTdStyle}>
                            <Badge variant="default">
                            {(season as any).matches_total_count ?? season.matches_count ?? 0}
                            </Badge>
                        </td>
                        <td style={compactTdStyle}>
                            <Badge variant="default">
                                {(season as any).members_count || 0}
                            </Badge>
                        </td>
                         <td style={compactTdStyle}>
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
                        <td style={compactTdStyle}>
                          <div style={compactActionsStyle}>
                            <button
                                onClick={() => {
                                    setDetailSeason(season);
                                    setIsDetailModalOpen(true);
                                }}
                                style={actionButtonStyle('primary')}
                            >
                                View
                            </button>
                            <button
                              onClick={() => {
                                setEditSeason(season);
                                setIsEditModalOpen(true);
                              }}
                              style={actionButtonStyle('warning')}
                            >
                              Edit
                            </button>
                            <button
                                onClick={() => handleDeleteSeason(String(row.orgId), season.id, season.name)}
                                style={actionButtonStyle('danger')}
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
