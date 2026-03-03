import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Badge } from '@django-core/design-system';
import { DirectoryFilterBar } from '../../../components/DirectoryFilterBar';
import { DirectoryTableShell } from '../../../components/DirectoryTableShell';
import { invalidateFetchAllPagesCache } from '../../../utils/fetchAllPages';
import { getApiBaseUrl } from '../../../utils/apiBase';
import { periodPathKey } from '../../../utils/periodPath';
import MatchDetailModal from '../MatchDetailModal';
import MatchEditModal from '../MatchEditModal';
import MatchCreateModal from '../MatchCreateModal';
import {
    compactThStyle,
    compactTdStyle,
    compactTextTdStyle,
    compactActionsStyle,
    actionButtonStyle,
} from '../../../utils/directoryStyles';
import { useDirectoryFilters } from '../../../hooks/useDirectoryFilters';
import { useMatchesData } from '../../../hooks/useMatchesData';
import { resolveRowContext } from '../../../utils/directoryHelpers';
import { getCsrfToken } from '../../../utils/csrf';
import type { DirectoryListProps, RowContextConfig, Activity } from '../../../utils/directoryHelpers';

// ─── MatchRow sub-component ──────────────────────────────────────────

interface MatchRowProps {
  match: Activity;
  rowConfig: RowContextConfig;
  orgLocked: boolean;
  clubLocked: boolean;
  teamLocked: boolean;
  seasons: any[];
  competitions: any[];
  navigate: ReturnType<typeof useNavigate>;
  onView: (m: Activity) => void;
  onEdit: (m: Activity) => void;
}

const MatchRow: React.FC<MatchRowProps> = ({
  match: m,
  rowConfig,
  orgLocked,
  clubLocked,
  teamLocked,
  seasons,
  competitions,
  navigate,
  onView,
  onEdit,
}) => {
  const row = resolveRowContext(m, rowConfig);
  const competition = m.period;
  const compName = competition?.name || '-';
  const season = competition?.parent_period;
  const seasonName = season?.name || '-';

  const isActive = (() => {
    if (!m.start_time) return false;
    return new Date(m.start_time).getTime() >= Date.now();
  })();

  const seasonId = season?.id;
  const seasonFromList = seasonId
    ? seasons.find((s: any) => String(s.id) === String(seasonId))
    : undefined;
  const seasonTarget = periodPathKey(seasonFromList || season) || seasonId;
  const compId = competition?.id;
  const compFromList = compId
    ? competitions.find((c: any) => String(c.id) === String(compId))
    : undefined;
  const compTarget = periodPathKey(compFromList || competition) || compId;

  const matchKey = (m as any).slug || m.id;
  const matchPath =
    row.orgSlug && row.clubSlug && row.teamSlug && seasonTarget && compTarget
      ? `/${row.orgSlug}/${row.clubSlug}/${row.teamSlug}/${seasonTarget}/${compTarget}/${matchKey}`
      : `/matches/${matchKey}`;

  return (
    <tr>
      {!orgLocked && (
        <td className="hide-mobile" style={compactTextTdStyle}>
          {row.orgId ? (
            <a
              href={`/organisations/${row.orgSlug}`}
              className="text-blue-600 hover:underline"
              onClick={(e) => { e.preventDefault(); navigate(`/organisations/${row.orgSlug}`); }}
            >
              {row.orgName}
            </a>
          ) : row.orgName}
        </td>
      )}
      {!clubLocked && (
        <td className="hide-mobile" style={compactTextTdStyle}>
          {row.clubId ? (
            <a
              href={`/${row.orgSlug}/${row.clubSlug}`}
              className="text-blue-600 hover:underline"
              onClick={(e) => { e.preventDefault(); navigate(`/${row.orgSlug}/${row.clubSlug}`); }}
            >
              {row.clubName}
            </a>
          ) : row.clubName}
        </td>
      )}
      {!teamLocked && (
        <td className="hide-mobile" style={compactTextTdStyle}>
          {row.teamId ? (
            <a
              href={row.teamBasePath}
              className="text-blue-600 hover:underline"
              onClick={(e) => { e.preventDefault(); navigate(row.teamBasePath); }}
            >
              {row.teamName}
            </a>
          ) : row.teamName}
        </td>
      )}
      <td style={compactTextTdStyle}>
        {season ? (
          <a
            href={`${row.teamBasePath}/${seasonTarget}`}
            className="text-blue-600 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              if (seasonTarget) navigate(`${row.teamBasePath}/${seasonTarget}`);
            }}
          >
            {seasonName}
          </a>
        ) : seasonName}
      </td>
      <td style={compactTextTdStyle}>
        {competition ? (
          <a
            href={`${row.teamBasePath}/${seasonTarget}/${compTarget}`}
            className="text-blue-600 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              if (seasonTarget && compTarget) navigate(`${row.teamBasePath}/${seasonTarget}/${compTarget}`);
            }}
          >
            {compName}
          </a>
        ) : compName}
      </td>
      <td className="hide-mobile" style={compactTdStyle}>
        {(m as any).period?.sport?.category_name ? (
          <span className="fs-11">{(m as any).period.sport.category_name}</span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="hide-mobile" style={compactTdStyle}>
        {(m as any).period?.sport ? (
          <span className="flex-row gap-4">
            <span>{(m as any).period.sport.sport_icon}</span>
            <span className="fs-11">{(m as any).period.sport.name}</span>
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td style={compactTextTdStyle}>
        <a
          href={matchPath}
          className="text-blue-600 hover:underline"
          onClick={(e) => { e.preventDefault(); navigate(matchPath); }}
        >
          {m.title}
        </a>
      </td>
      <td className="hide-mobile" style={compactTdStyle}>-</td>
      <td style={compactTdStyle}>
        <Badge variant={isActive ? 'success' : 'warning'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      </td>
      <td className="hide-mobile" style={compactTdStyle}>
        <div style={compactActionsStyle}>
          <button
            onClick={(e) => { e.preventDefault(); onView(m); }}
            style={actionButtonStyle('primary')}
          >
            View
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onEdit(m); }}
            style={actionButtonStyle('warning')}
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              if (window.confirm('Are you sure you want to delete this match?')) {
                alert('Delete functionality not yet implemented');
              }
            }}
            style={actionButtonStyle('danger')}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
};

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

  const [detailMatch, setDetailMatch] = useState<Activity | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editMatch, setEditMatch] = useState<Activity | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Auto-open create modal from ?create=match URL param
  useEffect(() => {
    const create = String(searchParams.get('create') || '').trim().toLowerCase();
    if (create !== 'match') return;
    setIsCreateModalOpen(true);
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
    if (!editMatch) return;
    const csrfToken = getCsrfToken();
    const apiBaseUrl = getApiBaseUrl();
    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${editMatch.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken || '' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to update match');
    }
    triggerRefresh();
  };

  const handleCreateMatch = async (payload: any) => {
    const apiBaseUrl = getApiBaseUrl();
    const csrfToken = getCsrfToken();
    const teamId = String(payload.project_id || '');
    const competitionId = String(payload.period_id || '');
    if (!teamId) throw new Error('Select a team first');
    if (!competitionId) throw new Error('Select a competition first');

    const res = await fetch(`${apiBaseUrl}/api/v1/activities/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken || '' },
      credentials: 'include',
      body: JSON.stringify({
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
          ...(payload as any)?.metadata,
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to create match');
    }

    const raw: any = await res.json().catch(() => null);
    const created: any = raw?.data?.data || raw?.data || raw;
    if (created && typeof created === 'object') {
      const createdId = String(created?.id || '').trim();
      if (createdId) {
        setMatches((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((m: any) => String(m?.id || '').trim() === createdId)) return list;
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
        onCreateClick={() => setIsCreateModalOpen(true)}
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
        emptyMessage="No matches found. Use filters to narrow your search."
        itemCount={sortedMatches.length}
      >
        <thead>
          <tr>
            {!orgLocked && <th className="hide-mobile" style={{ ...compactThStyle, width: '15%' }}>Federation</th>}
            {!clubLocked && <th className="hide-mobile" style={{ ...compactThStyle, width: '15%' }}>Club</th>}
            {!teamLocked && <th className="hide-mobile" style={{ ...compactThStyle, width: '15%' }}>Team</th>}
            <th style={{ ...compactThStyle, width: '15%' }}>Season</th>
            <th style={{ ...compactThStyle, width: '18%' }}>Competition</th>
            <th className="hide-mobile" style={{ ...compactThStyle, width: '10%' }}>Sport</th>
            <th className="hide-mobile" style={{ ...compactThStyle, width: '12%' }}>Sport Variant</th>
            <th style={{ ...compactThStyle, width: '15%' }}>Match</th>
            <th className="hide-mobile" style={{ ...compactThStyle, width: '8%' }}>Squad</th>
            <th style={{ ...compactThStyle, width: '10%' }}>Status</th>
            <th className="hide-mobile" style={{ ...compactThStyle, width: '12%' }}>Actions</th>
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
              onView={(match) => { setDetailMatch(match); setIsDetailModalOpen(true); }}
              onEdit={(match) => { setEditMatch(match); setIsEditModalOpen(true); }}
            />
          ))}
        </tbody>
      </DirectoryTableShell>

      <MatchDetailModal
        opened={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        match={detailMatch}
      />

      <MatchEditModal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        match={editMatch}
        onSave={handleSaveMatch}
      />

      <MatchCreateModal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        organisations={organisations}
        clubs={clubs}
        teams={teams}
        initialOrganisationId={selectedOrgId}
        initialClubId={selectedClubId}
        initialTeamId={selectedTeamId}
        onCreate={handleCreateMatch}
      />
    </div>
  );
};
