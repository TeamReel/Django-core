/**
 * UserDetailOverviewTab — Summary cards for federations, clubs, teams, matches.
 */
import { Badge, Card } from '@django-core/design-system';
import uo from './UserDetailOverviewTab.module.css';
import type { UserDetailDataReturn } from './useUserDetailData';

interface Props {
  data: UserDetailDataReturn;
}

export function UserDetailOverviewTab({ data }: Props) {
  const {
    navigate, userOrgs, clubsForTab, teamMemberships, linkedMatches,
    primaryOrgSlug, clubSlugById, setTab,
  } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Federations card */}
        <Card className="p-16">
          <div className="flex items-center justify-between mb-3 gap-12">
            <div className="text-sm font-semibold text-gray-900">
              Federations <span className="text-gray-500 fw-600">({userOrgs.length})</span>
            </div>
            <button type="button" className="app-action-button action-btn" onClick={() => setTab('federations')}>Bekijk alles</button>
          </div>
          {userOrgs.length === 0 ? (
            <div className="text-sm text-gray-500">Geen federaties.</div>
          ) : (
            <div className="space-y-2">
              {userOrgs.slice(0, 6).map((o) => {
                const orgSlugOrId = String(o?.slug || o?.id || '').trim();
                const orgPath = orgSlugOrId ? `/organisations/${encodeURIComponent(orgSlugOrId)}` : '';
                return orgPath ? (
                  <button key={String(o?.id || o?.slug || orgSlugOrId)} type="button" className="app-unstyled-button text-blue-600 hover:underline text-left fw-600" onClick={() => navigate(orgPath)}>
                    {String(o?.name || orgSlugOrId)}
                  </button>
                ) : (
                  <div key={String(o?.id || o?.slug || orgSlugOrId)} className="text-sm text-gray-900 fw-600">{String(o?.name || 'Federation')}</div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Clubs card */}
        <Card className="p-16">
          <div className="flex items-center justify-between mb-3 gap-12">
            <div className="text-sm font-semibold text-gray-900">
              Clubs <span className="text-gray-500 fw-600">({clubsForTab.length})</span>
            </div>
            <button type="button" className="app-action-button action-btn" onClick={() => setTab('clubs')}>Bekijk alles</button>
          </div>
          {clubsForTab.length === 0 ? (
            <div className="text-sm text-gray-500">Geen clubs.</div>
          ) : (
            <div className="space-y-2">
              {clubsForTab.slice(0, 6).map((c) => {
                const orgKey = String(primaryOrgSlug || '').trim();
                const clubKeyOrId = String(c?.slug || c?.id || '').trim();
                const clubPath = orgKey && clubKeyOrId ? `/${encodeURIComponent(orgKey)}/${encodeURIComponent(clubKeyOrId)}` : '';
                return clubPath ? (
                  <button key={String(c?.id || clubKeyOrId)} type="button" className="app-unstyled-button text-blue-600 hover:underline text-left fw-600" onClick={() => navigate(clubPath)}>
                    {String(c?.name || 'Club')}
                  </button>
                ) : (
                  <div key={String(c?.id || clubKeyOrId)} className="text-sm text-gray-900 fw-600">{String(c?.name || 'Club')}</div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Teams card */}
        <Card className="p-16">
          <div className="flex items-center justify-between mb-3 gap-12">
            <div className="text-sm font-semibold text-gray-900">
              Teams <span className="text-gray-500 fw-600">({teamMemberships.length})</span>
            </div>
            <button type="button" className="app-action-button action-btn" onClick={() => setTab('teams')}>Bekijk alles</button>
          </div>
          {teamMemberships.length === 0 ? (
            <div className="text-sm text-gray-500">Geen teams.</div>
          ) : (
            <div className="space-y-2">
              {teamMemberships.slice(0, 6).map((t) => {
                const orgKey = String(primaryOrgSlug || '').trim();
                const clubIdValue = String(t?.parent || '').trim();
                const clubKeyOrId = String(clubSlugById.get(clubIdValue) || clubIdValue || '').trim();
                const teamKeyOrId = String(t?.slug || t?.id || '').trim();
                const teamPath = orgKey && clubKeyOrId && teamKeyOrId ? `/${encodeURIComponent(orgKey)}/${encodeURIComponent(clubKeyOrId)}/${encodeURIComponent(teamKeyOrId)}` : '';
                return teamPath ? (
                  <button key={String(t?.id || teamKeyOrId)} type="button" className="app-unstyled-button text-blue-600 hover:underline text-left fw-600" onClick={() => navigate(teamPath)}>
                    {String(t?.name || 'Team')}
                  </button>
                ) : (
                  <div key={String(t?.id || teamKeyOrId)} className="text-sm text-gray-900 fw-600">{String(t?.name || 'Team')}</div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Matches card */}
        <Card className="p-16">
          <div className="flex items-center justify-between mb-3 gap-12">
            <div className="text-sm font-semibold text-gray-900">
              Matches <span className="text-gray-500 fw-600">({linkedMatches.length})</span>
            </div>
            <button type="button" className="app-action-button action-btn" onClick={() => setTab('matches')}>Bekijk alles</button>
          </div>
          {linkedMatches.length === 0 ? (
            <div className="text-sm text-gray-500">Geen wedstrijden.</div>
          ) : (
            <div className="space-y-2">
              {linkedMatches.slice(0, 6).map((m) => {
                const matchKeyOrId = String(m?.slug || m?.id || '').trim();
                const matchPath = matchKeyOrId ? `/matches/${encodeURIComponent(matchKeyOrId)}` : '';
                return matchPath ? (
                  <button key={String(m?.id || matchKeyOrId)} type="button" className="app-unstyled-button text-blue-600 hover:underline text-left fw-600" onClick={() => navigate(matchPath)}>
                    {String(m?.title || m?.name || 'Match')}
                  </button>
                ) : (
                  <div key={String(m?.id || 'match')} className="text-sm text-gray-900 fw-600">{String(m?.title || m?.name || 'Match')}</div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* User info card */}
      <Card>
        <h3 className="mt-0">User</h3>
        {data.user && (
          <div className={`grid ${uo.userInfoGrid}`}>
            <div className="text-muted">Name</div>
            <div className="fw-600">{data.userDisplayName}</div>
            <div className="text-muted">Email</div>
            <div>{data.user.email as string}</div>
            <div className="text-muted">Role</div>
            <div>
              <Badge variant={String(data.user.role || '').toLowerCase() === 'superadmin' ? 'primary' : 'default'}>
                {data.user.role as string}
              </Badge>
            </div>
            <div className="text-muted">Status</div>
            <div>
              <Badge variant={data.user.is_active ? 'success' : 'error'}>
                {data.user.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
