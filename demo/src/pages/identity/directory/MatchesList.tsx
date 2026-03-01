import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Badge } from '@django-core/design-system';
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
    actionButtonStyle
} from '../../../utils/directoryStyles';
import MobileFilterSheet from '../../../components/MobileFilterSheet';
import { useDirectoryFilters } from '../../../hooks/useDirectoryFilters';
import { useMatchesData } from '../../../hooks/useMatchesData';
import {
  getCsrfToken,
  getTeamParentId,
  filterSelectStyle,
  resolveRowContext,
} from '../../../utils/directoryHelpers';
import type { DirectoryListProps, SeasonOption, RowContextConfig, Activity } from '../../../utils/directoryHelpers';

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
    isSuperAdmin,
    orgLocked,
    clubLocked,
    teamLocked,
    organisations,
    clubs,
    teams,
    selectedOrgId,
    selectedClubId,
    selectedTeamId,
    statusFilter,
    sportFilter,
    variantFilter,
    selectedSeasonName,
    seasonOptions,
    selectedCompetitionId,
    competitions,
    seasons,
    isLoading,
    error,
    triggerRefresh,
    lockedOrgSlug,
    setSelectedOrgId,
    setSelectedClubId,
    setSelectedTeamId,
    setSelectedSeasonName,
    setSelectedCompetitionId,
    setStatusFilter,
    setSportFilter,
    setVariantFilter,
    clearAll,
    categories,
    variants,
    getVariantsForCategory,
  } = filters;

  const {
    matches, setMatches,
    matchesLoading,
    matchesMaxItems, setMatchesMaxItems,
    sortedMatches,
  } = useMatchesData(filters);

  // Modal state
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

    // Remove param once consumed so refresh/back doesn't keep reopening.
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // ─── Render ──────────────────────────────────────────────────────

  const activeFilterCount = [
    selectedOrgId !== '',
    !clubLocked && selectedClubId !== '',
    !teamLocked && selectedTeamId !== '',
    selectedSeasonName !== '',
    selectedCompetitionId !== '',
    statusFilter !== 'all',
    sportFilter !== 'all',
    variantFilter !== 'all',
  ].filter(Boolean).length;

  const rowConfig = useMemo<RowContextConfig>(
    () => ({
      organisations,
      clubs,
      teams,
      lockedOrgSlug,
      preselectedClubSlug,
      preselectedTeamSlug,
      selectedOrgId,
      selectedClubId,
    }),
    [organisations, clubs, teams, lockedOrgSlug, preselectedClubSlug, preselectedTeamSlug, selectedOrgId, selectedClubId],
  );

  return (
    <div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <MobileFilterSheet activeFilterCount={activeFilterCount}>
        {isSuperAdmin && !orgLocked && (
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            style={filterSelectStyle}
          >
            <option value="">Federation: All</option>
            {[...organisations].sort((a, b) => a.name.localeCompare(b.name)).map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        )}
        {!clubLocked && (
          <select
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            disabled={clubLocked}
            style={filterSelectStyle}
          >
            {!clubLocked && <option value="">Club: All</option>}
            {clubs
              .filter((c) => {
                if (!selectedOrgId) return true;
                const cOrg = typeof c.organisation === 'string' ? c.organisation : (c.organisation as any)?.id;
                return String(cOrg) === String(selectedOrgId);
              })
              .slice()
              .sort((a, b) => String(a.name).localeCompare(String(b.name)))
              .map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
          </select>
        )}
        {!teamLocked && (
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            disabled={teamLocked}
            style={filterSelectStyle}
          >
            {!teamLocked && <option value="">Team: All</option>}
            {teams
              .filter((t) => {
                if (!selectedClubId) return true;
                return getTeamParentId(t) === String(selectedClubId);
              })
              .slice()
              .sort((a, b) => String(a.name).localeCompare(String(b.name)))
              .map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
          </select>
        )}

        <select
          value={selectedSeasonName}
            onChange={(e) => setSelectedSeasonName(e.target.value)}
            style={{
                ...filterSelectStyle,
                maxWidth: '200px'
            }}
        >
            <option value="">Season: All</option>
            {seasonOptions.map((s: SeasonOption) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
        </select>

        <select
            value={selectedCompetitionId}
            onChange={(e) => setSelectedCompetitionId(e.target.value)}
            style={{
                ...filterSelectStyle,
                maxWidth: '200px'
            }}
        >
            <option value="">Competition: All</option>
            {[...new Map(competitions.map((c: any) => [String(c.id), c])).values()]
              .slice()
              .sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || '')))
              .map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            ...filterSelectStyle,
            maxWidth: '200px',
          }}
        >
          <option value="all">Status: All</option>
          <option value="active">Status: Active</option>
          <option value="inactive">Status: Inactive</option>
        </select>

        <select
          value={sportFilter}
          onChange={(e) => { setSportFilter(e.target.value); setVariantFilter('all'); }}
          style={filterSelectStyle}
        >
          <option value="all">Sport: All</option>
          {categories.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.sport_icon} {sport.name}
            </option>
          ))}
        </select>

        <select
          value={variantFilter}
          onChange={(e) => setVariantFilter(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="all">Variant: All</option>
          {(sportFilter !== 'all' ? getVariantsForCategory(sportFilter) : variants).map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.sport_icon} {sport.name}
            </option>
          ))}
        </select>
        </MobileFilterSheet>

        <div className="hide-mobile" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--app-muted-text)' }}>
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

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="md" onClick={clearAll}>
            Clear
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setIsCreateModalOpen(true);
            }}
          >
            Create Match
          </Button>
        </div>
      </div>

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
                    {!orgLocked && (
                      <th className="hide-mobile" style={{ ...compactThStyle, width: '15%' }}>Federation</th>
                    )}
                    {!clubLocked && (
                      <th className="hide-mobile" style={{ ...compactThStyle, width: '15%' }}>Club</th>
                    )}
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
                  {sortedMatches.map((m) => {
                    const row = resolveRowContext(m, rowConfig);

                    const competition = m.period;
                    const compName = competition?.name || '-';
                    const season = competition?.parent_period;
                    const seasonName = season?.name || '-';

                    const isActive = (() => {
                      if (!m.start_time) return false;
                      const start = new Date(m.start_time);
                      return start.getTime() >= Date.now();
                    })();

                    // Season/competition targets (match-specific; Period has no slug field)
                    const seasonId = season?.id;
                    const seasonFromList = seasonId ? seasons.find((s: any) => String(s.id) === String(seasonId)) : undefined;
                    const seasonTarget = periodPathKey(seasonFromList || season) || seasonId;
                    const compId = competition?.id;
                    const compFromList = compId ? competitions.find((c: any) => String(c.id) === String(compId)) : undefined;
                    const compTarget = periodPathKey(compFromList || competition) || compId;

                    return (
                        <tr key={m.id}>
                        {!orgLocked && (
                          <td className="hide-mobile" style={compactTextTdStyle}>
                            {row.orgId ? (
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
                            ) : row.orgName}
                          </td>
                        )}
                        {!clubLocked && (
                          <td className="hide-mobile" style={compactTextTdStyle}>
                            {row.clubId ? (
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
                            ) : row.clubName}
                          </td>
                        )}
                        {!teamLocked && (
                          <td className="hide-mobile" style={compactTextTdStyle}>
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
                        <td style={compactTextTdStyle}>
                             {season ? (
                                <a
                            href={`${row.teamBasePath}/${seasonTarget}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if(seasonTarget) {
                                navigate(`${row.teamBasePath}/${seasonTarget}`);
                                    }
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
                                  if(seasonTarget && compTarget) {
                              navigate(`${row.teamBasePath}/${seasonTarget}/${compTarget}`);
                                  }
                                }}
                                >
                                {compName}
                                </a>
                              ) : compName}
                            </td>
                        <td className="hide-mobile" style={compactTdStyle}>
                          {(m as any).period?.sport?.category_name ? (
                            <span style={{ fontSize: '11px' }}>{(m as any).period.sport.category_name}</span>
                          ) : (
                            <span style={{ color: 'var(--app-muted-text)' }}>—</span>
                          )}
                        </td>
                        <td className="hide-mobile" style={compactTdStyle}>
                          {(m as any).period?.sport ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>{(m as any).period.sport.sport_icon}</span>
                              <span style={{ fontSize: '11px' }}>{(m as any).period.sport.name}</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--app-muted-text)' }}>—</span>
                          )}
                        </td>
                        <td style={compactTextTdStyle}>
                            {(() => {
                              const matchKey = (m as any).slug || m.id;
                              const matchPath = (row.orgSlug && row.clubSlug && row.teamSlug && seasonTarget && compTarget)
                                ? `/${row.orgSlug}/${row.clubSlug}/${row.teamSlug}/${seasonTarget}/${compTarget}/${matchKey}`
                                : `/matches/${matchKey}`;
                              return (
                                <a
                                  href={matchPath}
                                  className="text-blue-600 hover:underline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(matchPath);
                                  }}
                                >
                                  {m.title}
                                </a>
                              );
                            })()}
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
                                onClick={(e) => {
                                    e.preventDefault();
                              setDetailMatch(m);
                              setIsDetailModalOpen(true);
                                }}
                                style={actionButtonStyle('primary')}
                            >
                                View
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                              setEditMatch(m);
                              setIsEditModalOpen(true);
                                }}
                                style={actionButtonStyle('warning')}
                            >
                                Edit
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    if(window.confirm('Are you sure you want to delete this match?')) {
                                        // TODO: Implement delete match
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
                  })}
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
          onSave={async (payload) => {
            if (!editMatch) return;

            const csrfToken = getCsrfToken();

            const apiBaseUrl = getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/v1/activities/${editMatch.id}/`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken || '',
              },
              credentials: 'include',
              body: JSON.stringify(payload),
            });

            if (!res.ok) {
              const detail = await res.text().catch(() => '');
              throw new Error(detail || 'Failed to update match');
            }

            triggerRefresh();
          }}
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
          onCreate={async (payload) => {
            const apiBaseUrl = getApiBaseUrl();
            const csrfToken = getCsrfToken();

            const teamId = String(payload.project_id || '');
            const competitionId = String(payload.period_id || '');
            if (!teamId) throw new Error('Select a team first');
            if (!competitionId) throw new Error('Select a competition first');

            const res = await fetch(`${apiBaseUrl}/api/v1/activities/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken || '',
              },
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
          }}
        />
    </div>
  );
};
