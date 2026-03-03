import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card } from '@django-core/design-system';

import { type Organisation, type Period, type Project, type OverviewMember } from './teamDetailTypes';

interface TeamOverviewTabProps {
  hierarchySeasons: Period[];
  hierarchyCompetitionsBySeasonId: Record<string, Period[]>;
  hierarchyMatchesCountBySeasonId: Record<string, number>;
  hierarchyLoading: boolean;
  hierarchyError: string | null;
  overviewMembers: OverviewMember[];
  overviewMembersCount: number | null;
  overviewMembersLoading: boolean;
  overviewMembersError: string | null;
  orgKeyForRoutes: string;
  clubKeyForRoutes: string;
  teamKeyForRoutes: string;
  team: Project;
  club: Project;
  org: Organisation;
  makeTabHref: (tab: string) => string;
}

export function TeamOverviewTab({
  hierarchySeasons,
  hierarchyCompetitionsBySeasonId,
  hierarchyMatchesCountBySeasonId,
  hierarchyLoading,
  hierarchyError,
  overviewMembers,
  overviewMembersCount,
  overviewMembersLoading,
  overviewMembersError,
  orgKeyForRoutes,
  clubKeyForRoutes,
  teamKeyForRoutes,
  team,
  club,
  org,
  makeTabHref,
}: TeamOverviewTabProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {hierarchyError && <Alert variant="error">{hierarchyError}</Alert>}
      {overviewMembersError && <Alert variant="error">{overviewMembersError}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Seasons card */}
        <Card className="p-16">
          <div className="flex items-center justify-between mb-3 gap-12">
            <div className="text-sm font-semibold text-gray-900">
              Seasons{' '}
              <span className="text-gray-500 fw-600">
                ({hierarchyLoading ? '…' : hierarchySeasons.length})
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('seasons'))}>
              View all
            </Button>
          </div>
          {hierarchyLoading && hierarchySeasons.length === 0 ? (
            <div className="text-sm text-gray-500">Loading seasons…</div>
          ) : hierarchySeasons.length === 0 ? (
            <div className="text-sm text-gray-500">No seasons found.</div>
          ) : (
            <div className="space-y-2">
              {hierarchySeasons.slice(0, 6).map((s) => {
                const seasonKey = String((s as any)?.slug || (s as any)?.id || '').trim();
                const seasonPath =
                  orgKeyForRoutes && clubKeyForRoutes && teamKeyForRoutes && seasonKey
                    ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKeyForRoutes)}/${encodeURIComponent(seasonKey)}`
                    : '';
                return seasonPath ? (
                  <button
                    key={String((s as any)?.id)}
                    type="button"
                    className="app-unstyled-button hover:underline text-left fw-600"
                    onClick={() => navigate(seasonPath)}
                    style={{ color: '#60a5fa' }}
                  >
                    {String((s as any)?.name || 'Season')}
                  </button>
                ) : (
                  <div key={String((s as any)?.id)} className="text-sm text-gray-900 fw-600">
                    {String((s as any)?.name || 'Season')}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Competitions card */}
        <Card className="p-16">
          <div className="flex items-center justify-between mb-3 gap-12">
            <div className="text-sm font-semibold text-gray-900">
              Competitions{' '}
              <span className="text-gray-500 fw-600">
                (
                {hierarchyLoading
                  ? '…'
                  : Object.values(hierarchyCompetitionsBySeasonId || {}).reduce((sum, list) => sum + (list?.length || 0), 0)}
                )
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('competitions'))}>
              View all
            </Button>
          </div>
          {hierarchyLoading && Object.keys(hierarchyCompetitionsBySeasonId || {}).length === 0 ? (
            <div className="text-sm text-gray-500">Loading competitions…</div>
          ) : (() => {
              const flat: Array<{ season: any; comp: any }> = [];
              for (const season of hierarchySeasons || []) {
                const sid = String((season as any)?.id ?? '').trim();
                const comps = hierarchyCompetitionsBySeasonId[sid] || [];
                for (const c of comps || []) flat.push({ season, comp: c });
              }

              if (flat.length === 0) return <div className="text-sm text-gray-500">No competitions found.</div>;

              return (
                <div className="space-y-2">
                  {flat.slice(0, 6).map(({ season, comp }) => {
                    const seasonKey = String((season as any)?.slug || (season as any)?.id || '').trim();
                    const compKey = String((comp as any)?.slug || (comp as any)?.id || '').trim();
                    const compPath =
                      orgKeyForRoutes && clubKeyForRoutes && teamKeyForRoutes && seasonKey && compKey
                        ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKeyForRoutes)}/${encodeURIComponent(seasonKey)}/${encodeURIComponent(compKey)}`
                        : '';
                    const label = String((comp as any)?.name || 'Competition');
                    return compPath ? (
                      <button
                        key={String((comp as any)?.id)}
                        type="button"
                        className="app-unstyled-button hover:underline text-left fw-600"
                        onClick={() => navigate(compPath)}
                        style={{ color: '#60a5fa' }}
                      >
                        {label}
                      </button>
                    ) : (
                      <div key={String((comp as any)?.id)} className="text-sm text-gray-900 fw-600">
                        {label}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
        </Card>

        {/* Members card */}
        <Card className="p-16">
          <div className="flex items-center justify-between mb-3 gap-12">
            <div className="text-sm font-semibold text-gray-900">
              Members{' '}
              <span className="text-gray-500 fw-600">
                ({overviewMembersLoading ? '…' : overviewMembersCount ?? '—'})
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('members'))}>
              View all
            </Button>
          </div>
          {overviewMembersLoading && overviewMembers.length === 0 ? (
            <div className="text-sm text-gray-500">Loading members…</div>
          ) : overviewMembers.length === 0 ? (
            <div className="text-sm text-gray-500">No members found.</div>
          ) : (
            <div className="space-y-2">
              {overviewMembers.map((m) => {
                const label =
                  `${String(m?.first_name || '').trim()} ${String(m?.last_name || '').trim()}`.trim() ||
                  String(m?.email || '').trim() ||
                  `User ${m.id}`;

                return (
                  <button
                    key={String(m.id)}
                    type="button"
                    className="app-unstyled-button hover:underline text-left fw-600"
                    onClick={() => navigate(`/users/${encodeURIComponent(String(m.id))}`)}
                    style={{ color: '#60a5fa' }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Matches card */}
        <Card className="p-16">
          <div className="flex items-center justify-between mb-3 gap-12">
            <div className="text-sm font-semibold text-gray-900">
              Matches{' '}
              <span className="text-gray-500 fw-600">
                (
                {hierarchyLoading
                  ? '…'
                  : Object.values(hierarchyMatchesCountBySeasonId || {}).reduce((sum, n) => sum + (typeof n === 'number' ? n : 0), 0)}
                )
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('matches'))}>
              View all
            </Button>
          </div>
          <div className="text-sm text-gray-500">Open the Matches tab to view fixtures and results.</div>
        </Card>
      </div>

      {/* Team details */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Team Details</h3>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-gray-500">Name</div>
            <div className="text-base text-gray-900 mt-1">{team?.name || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Club</div>
            <div className="text-base text-gray-900 mt-1">{club?.name || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Federation</div>
            <div className="text-base text-gray-900 mt-1">{org?.name || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Slug</div>
            <div className="text-base text-gray-900 mt-1">{String((team as any)?.slug || '—')}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
