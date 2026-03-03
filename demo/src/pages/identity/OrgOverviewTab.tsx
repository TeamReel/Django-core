import React from 'react';
import { Button, Card } from '@django-core/design-system';
import { Organisation } from '../../types';
import { canEditOrganisation } from '../../utils/permissions';

export interface OrgOverviewTabProps {
  org: Organisation;
  clubs: any[];
  teams: any[];
  members: any[];
  clubsCount: number;
  clubsLoading: boolean;
  teamsCount: number | null;
  teamsLoading: boolean;
  membersLoading: boolean;
  matchesCount: number | null;
  scheduledMatches: any[];
  scheduledMatchesLoading: boolean;
  navigate: (path: string) => void;
  makeTabHref: (tabId: string) => string;
  getBestMatchDetailPath: (m: any) => string;
  currentOrgSlug: string | undefined;
  id: string | undefined;
  permissionContext: any;
  setIsOrgEditModalOpen: (v: boolean) => void;
}

export function OrgOverviewTab({
  org,
  clubs,
  teams,
  members,
  clubsCount,
  clubsLoading,
  teamsCount,
  teamsLoading,
  membersLoading,
  matchesCount,
  scheduledMatches,
  scheduledMatchesLoading,
  navigate,
  makeTabHref,
  getBestMatchDetailPath,
  currentOrgSlug,
  id,
  permissionContext,
  setIsOrgEditModalOpen,
}: OrgOverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-16">
          <div className="flex items-center justify-between mb-3 gap-12">
            <div className="text-sm font-semibold text-gray-900">
              Clubs <span className="text-gray-500 fw-600">({org.clubs_count || clubsCount || 0})</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('clubs'))}>
              View all
            </Button>
          </div>
          {clubsLoading && clubs.length === 0 ? (
            <div className="text-sm text-gray-500">Loading clubs…</div>
          ) : clubs.length === 0 ? (
            <div className="text-sm text-gray-500">No clubs found.</div>
          ) : (
            <div className="space-y-2">
              {clubs.slice(0, 6).map((c: any) => (
                <button
                  key={String(c?.id)}
                  type="button"
                  className="app-unstyled-button text-blue-600 hover:underline text-left fw-600"
                  onClick={() =>
                    navigate(
                      `/organisations/${encodeURIComponent(String(currentOrgSlug || id || ''))}/projects/${encodeURIComponent(String(c?.slug || c?.id || ''))}`
                    )
                  }
                >
                  {String(c?.name || 'Club')}
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-16">
          <div className="flex items-center justify-between mb-3 gap-12">
            <div className="text-sm font-semibold text-gray-900">
              Teams <span className="text-gray-500 fw-600">({org.teams_count || teamsCount || 0})</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('teams'))}>
              View all
            </Button>
          </div>
          {teamsLoading && teams.length === 0 ? (
            <div className="text-sm text-gray-500">Loading teams…</div>
          ) : teams.length === 0 ? (
            <div className="text-sm text-gray-500">No teams found.</div>
          ) : (
            <div className="space-y-2">
              {(teams as any[]).slice(0, 6).map((t: any) => (
                <button
                  key={String(t?.id)}
                  type="button"
                  className="app-unstyled-button text-blue-600 hover:underline text-left fw-600"
                  onClick={() =>
                    navigate(
                      `/organisations/${encodeURIComponent(String(currentOrgSlug || id || ''))}/projects/${encodeURIComponent(String(t?.slug || t?.id || ''))}`
                    )
                  }
                >
                  {String(t?.name || 'Team')}
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-16">
          <div className="flex items-center justify-between mb-3 gap-12">
            <div className="text-sm font-semibold text-gray-900">
              Members <span className="text-gray-500 fw-600">({org.member_count || members.length || 0})</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('users'))}>
              View all
            </Button>
          </div>
          {membersLoading && members.length === 0 ? (
            <div className="text-sm text-gray-500">Loading members…</div>
          ) : members.length === 0 ? (
            <div className="text-sm text-gray-500">No members found.</div>
          ) : (
            <div className="space-y-2">
              {(members as any[]).slice(0, 6).map((m: any) => {
                const u = m?.user || m;
                const label =
                  `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim() ||
                  String(u?.email || '').trim() ||
                  `User ${String(u?.id || m?.id)}`;
                const userId = String(u?.id || m?.id || '').trim();
                return (
                  <button
                    key={String(userId || label)}
                    type="button"
                    className="app-unstyled-button text-blue-600 hover:underline text-left fw-600"
                    onClick={() => (userId ? navigate(`/users/${encodeURIComponent(userId)}`) : void 0)}
                    disabled={!userId}
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
              Matches <span className="text-gray-500 fw-600">({matchesCount ?? '—'})</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('matches'))}>
              View all
            </Button>
          </div>
          {scheduledMatchesLoading && scheduledMatches.length === 0 ? (
            <div className="text-sm text-gray-500">Loading matches…</div>
          ) : scheduledMatches.length === 0 ? (
            <div className="text-sm text-gray-500">No upcoming matches scheduled.</div>
          ) : (
            <div className="space-y-2">
              {scheduledMatches.slice(0, 6).map((m: any) => (
                <button
                  key={String(m?.id)}
                  type="button"
                  className="app-unstyled-button text-blue-600 hover:underline text-left fw-600"
                  onClick={() => navigate(getBestMatchDetailPath(m))}
                >
                  {String(m?.title || m?.name || 'Match')}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Organisation Details Card */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Organisation Details</h3>
          {canEditOrganisation(permissionContext) && (
            <button type="button" className="action-btn action-btn-warning" onClick={() => setIsOrgEditModalOpen(true)}>
              Edit
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-gray-500">Name</div>
            <div className="text-base text-gray-900 mt-1">{org?.name || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Sport</div>
            <div className="text-base text-gray-900 mt-1 flex-row gap-8">
              {org?.sport ? (
                <>
                  <span>{org.sport.sport_icon}</span>
                  <span>{org.sport.name}</span>
                </>
              ) : (
                '—'
              )}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Type</div>
            <div className="text-base text-gray-900 mt-1">{org?.metadata?.type || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Country</div>
            <div className="text-base text-gray-900 mt-1">{org?.metadata?.country || '—'}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
