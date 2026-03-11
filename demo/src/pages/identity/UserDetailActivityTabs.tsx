/**
 * UserDetailActivityTabs — Hierarchy, Seasons, Competitions, Matches tab content.
 */
import { Alert, Input } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { periodPathKey } from '../../utils/periodPath';
import type { UserDetailDataReturn } from './useUserDetailData';
import type { Activity } from '../../types';

interface Props {
  data: UserDetailDataReturn;
}

export function UserDetailActivityTabs({ data }: Props) {
  const {
    activeTab, navigate,
    teamMemberships, clubSlugById, primaryOrgSlug,
    hierarchySearch, setHierarchySearch, hierarchyRows,
    teamSeasonPairs, linkedCompetitions, linkedMatches,
    loadingRelations, renderNavLink,
    setSelectedEditMatch, setIsMatchEditModalOpen, deleteMatch,
  } = data;

  if (activeTab === 'hierarchy') {
    return (
      <div className="card">
        <div className="flex-between gap-12">
          <h3 className="m-0">Hierarchy</h3>
          <Input value={hierarchySearch} onChange={(e) => setHierarchySearch((e.target as HTMLInputElement).value)} placeholder="Search…" />
        </div>
        <div className="mt-12">
          <Table className="detail-table">
            <thead>
              <tr>
                <th className="detail-th">Club</th>
                <th className="detail-th">Team</th>
                <th className="detail-th">Season</th>
                <th className="detail-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {hierarchyRows.map((r) => (
                <tr key={`${r.teamId}::${r.seasonId}`}>
                  <td className="detail-td-text">
                    {renderNavLink(r.clubName || '-', r.clubSlug ? `/organisations/${primaryOrgSlug}/projects/${r.clubSlug}` : '')}
                  </td>
                  <td className="detail-td-text">{renderNavLink(r.teamName || '-', r.teamPath)}</td>
                  <td className="detail-td-text">{renderNavLink(r.seasonName || r.seasonId, r.seasonPath)}</td>
                  <td className="detail-td">
                    <div className="detail-actions">
                      {r.teamPath ? (
                        <button type="button" className="app-action-button action-btn action-btn-primary" onClick={() => navigate(r.teamPath)}>View Team</button>
                      ) : (
                        <button type="button" className="app-action-button action-btn action-btn-primary" disabled>View Team</button>
                      )}
                      {r.seasonPath ? (
                        <button type="button" className="app-action-button action-btn action-btn-primary" onClick={() => navigate(r.seasonPath)}>View Season</button>
                      ) : (
                        <button type="button" className="app-action-button action-btn action-btn-primary" disabled>View Season</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!hierarchyRows.length && <tr><td className="detail-td" colSpan={4}><em className="text-muted">No linked seasons found.</em></td></tr>}
            </tbody>
          </Table>
        </div>
      </div>
    );
  }

  if (activeTab === 'seasons') {
    return (
      <div className="grid gap-12">
        {loadingRelations && <Alert variant="info">Loading seasons, competitions and matches…</Alert>}
        <div className="card">
          <h3 className="m-0">Seasons</h3>
          <Table className="detail-table">
            <thead>
              <tr>
                <th className="detail-th">Season</th>
                <th className="detail-th">Team</th>
                <th className="detail-th">Club</th>
                <th className="detail-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamSeasonPairs.map((r) => {
                const clubSlug = clubSlugById.get(r.clubId) || '';
                const teamSlugOrId = String(r.teamSlug || r.teamId).trim();
                const seasonPath = primaryOrgSlug && clubSlug && teamSlugOrId && r.seasonId
                  ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}/${r.seasonId}` : '';
                return (
                  <tr key={`${r.teamId}::${r.seasonId}`}>
                    <td className="detail-td-text">{renderNavLink(r.seasonName || r.seasonId, seasonPath)}</td>
                    <td className="detail-td-text">
                      {renderNavLink(r.teamName || r.teamId, primaryOrgSlug && clubSlug && teamSlugOrId ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}` : '')}
                    </td>
                    <td className="detail-td-text">
                      {renderNavLink(r.clubName || r.clubId, primaryOrgSlug && clubSlug ? `/${primaryOrgSlug}/${clubSlug}` : '')}
                    </td>
                    <td className="detail-td">
                      <div className="detail-actions">
                        <button type="button" className="app-action-button action-btn action-btn-primary" onClick={() => seasonPath && navigate(seasonPath)} disabled={!seasonPath}>View</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!teamSeasonPairs.length && <tr><td className="detail-td" colSpan={4}><em className="text-muted">No season-linked team memberships.</em></td></tr>}
            </tbody>
          </Table>
        </div>
      </div>
    );
  }

  if (activeTab === 'competitions') {
    return (
      <div className="grid gap-12">
        {loadingRelations && <Alert variant="info">Loading competitions…</Alert>}
        <div className="card">
          <h3 className="m-0">Competitions</h3>
          <Table className="detail-table">
            <thead>
              <tr>
                <th className="detail-th">Name</th>
                <th className="detail-th">Season</th>
                <th className="detail-th">Team</th>
                <th className="detail-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {linkedCompetitions.map((c) => {
                const teamIdValue = String(c?.project_id ?? c?.project?.id ?? '').trim();
                const team = teamMemberships.find((t) => String(t?.id) === teamIdValue);
                const clubIdValue = String(team?.parent || '').trim();
                const clubSlug = clubSlugById.get(clubIdValue) || '';
                const teamSlugOrId = String(team?.slug || team?.id || '').trim();
                const parentSeasonId = String(c?.parent_period_id ?? c?.parent_period?.id ?? '').trim();
                const competitionPath = primaryOrgSlug && clubSlug && teamSlugOrId && parentSeasonId && c?.id
                  ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}/${parentSeasonId}/${c.id}` : '';
                return (
                  <tr key={String(c?.id)}>
                    <td className="detail-td-text">{renderNavLink(String(c?.name || ''), competitionPath)}</td>
                    <td className="detail-td-text">
                      {renderNavLink(String(c?.parent_period?.name || ''), parentSeasonId && primaryOrgSlug && clubSlug && teamSlugOrId
                        ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}/${parentSeasonId}` : '')}
                    </td>
                    <td className="detail-td-text">
                      {renderNavLink(String(team?.name || ''), primaryOrgSlug && clubSlug && teamSlugOrId ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}` : '')}
                    </td>
                    <td className="detail-td">
                      <div className="detail-actions">
                        <button type="button" className="app-action-button action-btn action-btn-primary" onClick={() => competitionPath && navigate(competitionPath)} disabled={!competitionPath}>View</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!linkedCompetitions.length && <tr><td className="detail-td" colSpan={4}><em className="text-muted">No competitions found for linked seasons.</em></td></tr>}
            </tbody>
          </Table>
        </div>
      </div>
    );
  }

  if (activeTab === 'matches') {
    return (
      <div className="grid gap-12">
        {loadingRelations && <Alert variant="info">Loading matches…</Alert>}
        <div className="card">
          <h3 className="m-0">Matches</h3>
          <Table className="detail-table">
            <thead>
              <tr>
                <th className="detail-th">Title</th>
                <th className="detail-th">Start</th>
                <th className="detail-th">Team</th>
                <th className="detail-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {linkedMatches.slice(0, 200).map((m) => {
                const teamIdValue = String(m?.project?.id || m?.project_id || '').trim();
                const team = teamMemberships.find((t) => String(t?.id) === teamIdValue);
                const clubIdValue = String(team?.parent || '').trim();
                const clubKeyOrId = String(clubSlugById.get(clubIdValue) || clubIdValue || '').trim();
                const teamSlugOrId = String(team?.slug || team?.id || '').trim();
                const teamPath = primaryOrgSlug && clubKeyOrId && teamSlugOrId ? `/${primaryOrgSlug}/${clubKeyOrId}/${teamSlugOrId}` : '';
                const teamName = String(team?.name || m?.project?.name || m?.project_name || '').trim();

                const matchKeyOrId = String(m?.slug || m?.id || '').trim();
                const competition = m?.period || null;
                const competitionKeyOrId = String(periodPathKey(competition) || competition?.slug || competition?.id || '').trim();
                const season = competition?.parent_period || null;
                const seasonKeyOrId = String(periodPathKey(season) || season?.slug || season?.id || competition?.parent_period_id || '').trim();

                const matchPath = (primaryOrgSlug && clubKeyOrId && teamSlugOrId && seasonKeyOrId && competitionKeyOrId && matchKeyOrId)
                  ? `/${primaryOrgSlug}/${clubKeyOrId}/${teamSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}/${matchKeyOrId}`
                  : (matchKeyOrId ? `/matches/${matchKeyOrId}` : '');
                return (
                  <tr key={String(m?.id)}>
                    <td className="detail-td-text">
                      {matchPath ? (
                        <a href={matchPath} className="text-blue-600 hover:underline fw-700 inline-block truncate text-decoration-none" style={{ maxWidth: '100%' }} onClick={(e) => { e.preventDefault(); navigate(matchPath); }} title="Open match details">
                          {String(m?.title || '') || '—'}
                        </a>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="detail-td-text">{String(m?.start_time || '')}</td>
                    <td className="detail-td-text">{renderNavLink(teamName, teamPath)}</td>
                    <td className="detail-td">
                      <div className="detail-actions">
                        <button type="button" className="app-action-button action-btn action-btn-primary" onClick={() => { if (matchPath) navigate(matchPath); }} disabled={!matchPath}>View</button>
                        <button type="button" className="app-action-button action-btn action-btn-warning" onClick={() => { setSelectedEditMatch(m as Activity); setIsMatchEditModalOpen(true); }}>Edit</button>
                        <button type="button" className="app-action-button action-btn action-btn-danger" onClick={async () => {
                          if (!m?.id) return;
                          if (!window.confirm(`Delete match ${m.title || m.id}?`)) return;
                          try { await deleteMatch(m as Activity); } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
                        }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!linkedMatches.length && <tr><td className="detail-td" colSpan={4}><em className="text-muted">No matches linked.</em></td></tr>}
            </tbody>
          </Table>
        </div>
      </div>
    );
  }

  return null;
}
