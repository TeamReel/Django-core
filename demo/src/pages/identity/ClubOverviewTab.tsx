import React from 'react';
import { Button, Card, Alert } from '@django-core/design-system';

type Period = {
  id: string;
  name: string;
  slug?: string;
  project_id?: string | number;
  project?: { id?: string | number };
  parent_period_id?: string | number | null;
  parent_period?: { id?: string | number } | null;
  type?: string;
  data?: any;
  metadata?: any;
};

type OverviewMember = {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

export interface ClubOverviewTabProps {
  club: any;
  org: any;
  overviewError: string | null;
  overviewLoading: boolean;
  overviewTeams: any[];
  overviewSeasons: Period[];
  overviewMembers: OverviewMember[];
  overviewCounts: { teams: number; seasons: number; members: number } | null;
  orgKeyForRoutes: string;
  clubKeyForRoutes: string;
  navigate: (path: string) => void;
  makeTabHref: (tabId: string) => string;
}

export function ClubOverviewTab({
  club,
  org,
  overviewError,
  overviewLoading,
  overviewTeams,
  overviewSeasons,
  overviewMembers,
  overviewCounts,
  orgKeyForRoutes,
  clubKeyForRoutes,
  navigate,
  makeTabHref,
}: ClubOverviewTabProps) {
  return (
    <div className="space-y-6">
      {overviewError && <Alert variant="error">{overviewError}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-16">
          <div className="flex items-center justify-between mb-3 gap-12">
            <div className="text-sm font-semibold text-gray-900">
              Teams{' '}
              <span className="text-gray-500 fw-600">
                ({overviewLoading ? '…' : overviewCounts ? overviewCounts.teams : '—'})
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('teams'))}>
              View all
            </Button>
          </div>
          {overviewLoading && overviewTeams.length === 0 ? (
            <div className="text-sm text-gray-500">Loading teams…</div>
          ) : overviewTeams.length === 0 ? (
            <div className="text-sm text-gray-500">No teams found.</div>
          ) : (
            <div className="space-y-2">
              {overviewTeams.map((t) => {
                const teamKey = String(t?.slug || t?.id || '').trim();
                const teamPath =
                  orgKeyForRoutes && clubKeyForRoutes && teamKey
                    ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKey)}`
                    : '';

                return (
                  <div key={String(t.id)} className="flex items-center justify-between" style={{ gap: 12 }}>
                    {teamPath ? (
                      <button
                        type="button"
                        className="app-unstyled-button text-blue-600 hover:underline text-left fw-600 min-w-0"
                        onClick={() => navigate(teamPath)}
                      >
                        {t.name}
                      </button>
                    ) : (
                      <div className="text-sm text-gray-900 fw-600">
                        {t.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-16">
          <div className="flex items-center justify-between mb-3 gap-12">
            <div className="text-sm font-semibold text-gray-900">
              Seasons{' '}
              <span className="text-gray-500 fw-600">
                ({overviewLoading ? '…' : overviewCounts ? overviewCounts.seasons : '—'})
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('seasons'))}>
              View all
            </Button>
          </div>
          {overviewLoading && overviewSeasons.length === 0 ? (
            <div className="text-sm text-gray-500">Loading seasons…</div>
          ) : overviewSeasons.length === 0 ? (
            <div className="text-sm text-gray-500">No seasons found.</div>
          ) : (
            <div className="space-y-2">
              {overviewSeasons.map((s) => (
                <div key={String((s as any)?.id)} className="text-sm text-gray-900 fw-600">
                  {String((s as any)?.name || 'Season')}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-16">
          <div className="flex items-center justify-between mb-3 gap-12">
            <div className="text-sm font-semibold text-gray-900">
              Members{' '}
              <span className="text-gray-500 fw-600">
                ({overviewLoading ? '…' : overviewCounts ? overviewCounts.members : '—'})
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('members'))}>
              View all
            </Button>
          </div>
          {overviewLoading && overviewMembers.length === 0 ? (
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
                    className="app-unstyled-button text-blue-600 hover:underline text-left fw-600"
                    onClick={() => navigate(`/users/${encodeURIComponent(String(m.id))}`)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-16">
          <div className="flex items-center justify-between mb-3 gap-12">
            <div className="text-sm font-semibold text-gray-900">
              Matches <span className="text-gray-500 fw-600">(—)</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('matches'))}>
              View all
            </Button>
          </div>
          <div className="text-sm text-gray-500">Open the Matches tab to view fixtures and results.</div>
        </Card>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Club Details</h3>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-gray-500">Name</div>
            <div className="text-base text-gray-900 mt-1">{club?.name || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Federation</div>
            <div className="text-base text-gray-900 mt-1">{org?.name || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Slug</div>
            <div className="text-base text-gray-900 mt-1">{String((club as any)?.slug || '—')}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
