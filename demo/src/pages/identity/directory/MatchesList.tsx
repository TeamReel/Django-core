import React, { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@django-core/design-system';
import { DirectoryFilterBar } from '@/components/DirectoryFilterBar';
import { DirectoryTableShell } from '@/components/DirectoryTableShell';
import { invalidateFetchAllPagesCache } from '@/utils/fetchAllPages';
import { activitiesApi } from '@/api';
import type { ActivityWritePayload } from '@/api/activities';
import MatchDetailModal from '../MatchDetailModal';
import MatchEditModal from '../MatchEditModal';
import MatchCreateModal from '../MatchCreateModal';
import { useDirectoryFilters } from '@/hooks/useDirectoryFilters';
import { useMatchesData } from '@/hooks/useMatchesData';
import { useCrudModals } from '@/hooks/useModalState';
import { MatchRow } from './MatchRow';
import type { DirectoryListProps, RowContextConfig, Activity } from '@/utils/directoryHelpers';
import styles from './MatchesList.module.css';

// ─── Main component ──────────────────────────────────────────────────

export const MatchesList: React.FC<DirectoryListProps> = (props) => {
  const { preselectedClubSlug, preselectedTeamSlug } = props;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useDirectoryFilters({
    ...props,
    showSeasonFilter: true,
    showCompetitionFilter: true,
    showVariantFilter: true,
  });

  const {
    orgLocked,
    clubLocked,
    teamLocked,
    organisations,
    clubs,
    teams,
    selectedOrgId,
    selectedClubId,
    selectedTeamId,
    lockedOrgSlug,
    seasons,
    competitions,
    isLoading,
    error,
    triggerRefresh,
  } = filters;

  const {
    setMatches,
    matchesLoading,
    matchesMaxItems, setMatchesMaxItems,
    sortedMatches,
  } = useMatchesData(filters);

  // ─── Modal state ─────────────────────────────────────────────────

  const modals = useCrudModals<Activity>();

  // Auto-open create modal from ?create=match URL param
  useEffect(() => {
    const create = String(searchParams.get('create') || '').trim().toLowerCase();
    if (create !== 'match') return;
    modals.create.open();
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const rowConfig = useMemo<RowContextConfig>(
    () => ({
      organisations, clubs, teams,
      lockedOrgSlug,
      preselectedClubSlug, preselectedTeamSlug,
      selectedOrgId, selectedClubId,
    }),
    [organisations, clubs, teams, lockedOrgSlug, preselectedClubSlug, preselectedTeamSlug, selectedOrgId, selectedClubId],
  );

  // ─── CRUD handlers ──────────────────────────────────────────────

  const handleSaveMatch = async (payload: Record<string, any>) => {
    if (!modals.edit.item) return;
    const res = await activitiesApi.update(String(modals.edit.item.id), payload);
    triggerRefresh();
  };

  const handleCreateMatch = async (payload: Record<string, any>) => {
    const teamId = String(payload.project_id || '');
    const competitionId = String(payload.period_id || '');
    if (!teamId) throw new Error('Select a team first');
    if (!competitionId) throw new Error('Select a competition first');

    const created = await activitiesApi.create({
      title: payload.title,
      activity_type: 'match',
      project_id: Number(teamId),
      opponent_project_id: payload.opponent_project_id ? Number(payload.opponent_project_id) : undefined,
      period_id: competitionId,
      start_time: payload.start_time,
      end_time: payload.end_time,
      location: payload.location,
      description: payload.description,
      metadata: {
        venue: payload.venue || 'Home',
        is_home: (payload.venue || 'Home') === 'Home',
        ...payload?.metadata,
      },
    } satisfies ActivityWritePayload);

    if (created && typeof created === 'object') {
      const createdId = String(created?.id || '').trim();
      if (createdId) {
        setMatches((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((m) => String(m?.id || '').trim() === createdId)) return list;
          return [created, ...list];
        });
      }
    }
    invalidateFetchAllPagesCache();
  };

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div>
      <DirectoryFilterBar
        filters={filters}
        createButtonLabel="Create Match"
        onCreateClick={() => modals.create.open()}
        showSeasonFilter
        showCompetitionFilter
        showVariantFilter
        extraActions={
          <div className="hide-mobile flex-row gap-8">
            <span className="fs-12 text-muted">
              Showing {matchesMaxItems ?? 'all'}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMatchesMaxItems((v) => (v == null ? null : Math.min(10_000, v + 500)))}
              disabled={matchesMaxItems == null}
            >
              Load more
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMatchesMaxItems(null)}
              disabled={matchesMaxItems == null}
            >
              Load all
            </Button>
          </div>
        }
      />

      <DirectoryTableShell
        isLoading={isLoading}
        error={error}
        domainLoading={matchesLoading}
        domainLoadingMessage="Loading matches..."
        emptyStateType="matches"
        emptyDescription="Pas je filters aan of voeg een wedstrijd toe."
        hideActions
        itemCount={sortedMatches.length}
      >
        <thead>
          <tr>
            {!orgLocked && <th className={`hide-mobile dir-th ${styles.thFederation}`}>Federation</th>}
            {!clubLocked && <th className={`hide-mobile dir-th ${styles.thClub}`}>Club</th>}
            {!teamLocked && <th className={`hide-mobile dir-th ${styles.thTeam}`}>Team</th>}
            <th className={`dir-th ${styles.thSeason}`}>Season</th>
            <th className={`dir-th ${styles.thCompetition}`}>Competition</th>
            <th className={`hide-mobile dir-th ${styles.thSport}`}>Sport</th>
            <th className={`hide-mobile dir-th ${styles.thVariant}`}>Sport Variant</th>
            <th className={`dir-th ${styles.thMatch}`}>Match</th>
            <th className={`hide-mobile dir-th ${styles.thSquad}`}>Squad</th>
            <th className={`dir-th ${styles.thStatus}`}>Status</th>
            <th className={`hide-mobile dir-th ${styles.thActions}`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedMatches.map((m) => (
            <MatchRow
              key={m.id}
              match={m}
              rowConfig={rowConfig}
              orgLocked={orgLocked}
              clubLocked={clubLocked}
              teamLocked={teamLocked}
              seasons={seasons}
              competitions={competitions}
              navigate={navigate}
              onView={(match) => modals.detail.open(match)}
              onEdit={(match) => modals.edit.open(match)}
            />
          ))}
        </tbody>
      </DirectoryTableShell>

      <MatchDetailModal
        opened={modals.detail.isOpen}
        onClose={modals.detail.close}
        match={modals.detail.item}
      />

      <MatchEditModal
        opened={modals.edit.isOpen}
        onClose={modals.edit.close}
        match={modals.edit.item}
        onSave={handleSaveMatch}
      />

      <MatchCreateModal
        opened={modals.create.isOpen}
        onClose={modals.create.close}
        selectOptions={{
          organisations: organisations,
          clubs: clubs,
          teams: teams,
        }}
        initialIds={{
          organisationId: selectedOrgId,
          clubId: selectedClubId,
          teamId: selectedTeamId,
        }}
        onCreate={handleCreateMatch}
      />
    </div>
  );
};
