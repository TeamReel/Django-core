/**
 * UserDetailActivityTabs — Hierarchy, Seasons, Competitions, Matches tab content.
 */
import { Alert, Input } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { periodPathKey } from '../../utils/periodPath';
import {
  actionButtonStyle,
  compactTableStyle,
  compactThStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactActionsStyle,
} from './detail/detailStyles';
import type { UserDetailDataReturn } from './useUserDetailData';

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
          <Input value={hierarchySearch} onChange={(e) => setHierarchySearch((e.target as any).value)} placeholder="Search…" />
        </div>
        <div className="mt-12">
          <Table style={compactTableStyle}>
            <thead>
              <tr>
                <th style={compactThStyle}>Club</th>
                <th style={compactThStyle}>Team</th>
                <th style={compactThStyle}>Season</th>
                <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hierarchyRows.map((r) => (
                <tr key={`${r.teamId}::${r.seasonId}`}>
                  <td style={compactTextTdStyle}>
                    {renderNavLink(r.clubName || '-', r.clubSlug ? `/organisations/${primaryOrgSlug}/projects/${r.clubSlug}` : '')}
                  </td>
                  <td style={compactTextTdStyle}>{renderNavLink(r.teamName || '-', r.teamPath)}</td>
                  <td style={compactTextTdStyle}>{renderNavLink(r.seasonName || r.seasonId, r.seasonPath)}</td>
                  <td style={compactTdStyle}>
                    <div style={compactActionsStyle}>
                      {r.teamPath ? (
                        <button type="button" className="app-action-button" onClick={() => navigate(r.teamPath)} style={actionButtonStyle('primary')}>View Team</button>
                      ) : (
                        <button type="button" className="app-action-button" disabled style={{ ...actionButtonStyle('primary'), opacity: 0.5, cursor: 'not-allowed' }}>View Team</button>
                      )}
                      {r.seasonPath ? (
                        <button type="button" className="app-action-button" onClick={() => navigate(r.seasonPath)} style={actionButtonStyle('primary')}>View Season</button>
                      ) : (
                        <button type="button" className="app-action-button" disabled style={{ ...actionButtonStyle('primary'), opacity: 0.5, cursor: 'not-allowed' }}>View Season</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!hierarchyRows.length && <tr><td style={compactTdStyle} colSpan={4}><em className="text-muted">No linked seasons found.</em></td></tr>}
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
          <h3 style={{ marginTop: 0 }}>Seasons</h3>
          <Table style={compactTableStyle}>
            <thead>
              <tr>
                <th style={compactThStyle}>Season</th>
                <th style={compactThStyle}>Team</th>
                <th style={compactThStyle}>Club</th>
                <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
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
                    <td style={compactTextTdStyle}>{renderNavLink(r.seasonName || r.seasonId, seasonPath)}</td>
                    <td style={compactTextTdStyle}>
                      {renderNavLink(r.teamName || r.teamId, primaryOrgSlug && clubSlug && teamSlugOrId ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}` : '')}
                    </td>
                    <td style={compactTextTdStyle}>
                      {renderNavLink(r.clubName || r.clubId, primaryOrgSlug && clubSlug ? `/${primaryOrgSlug}/${clubSlug}` : '')}
                    </td>
                    <td style={compactTdStyle}>
                      <div style={compactActionsStyle}>
                        <button type="button" className="app-action-button" onClick={() => seasonPath && navigate(seasonPath)} disabled={!seasonPath} style={actionButtonStyle('primary')}>View</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!teamSeasonPairs.length && <tr><td style={compactTdStyle} colSpan={4}><em className="text-muted">No season-linked team memberships.</em></td></tr>}
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
          <h3 style={{ marginTop: 0 }}>Competitions</h3>
          <Table style={compactTableStyle}>
            <thead>
              <tr>
                <th style={compactThStyle}>Name</th>
                <th style={compactThStyle}>Season</th>
                <th style={compactThStyle}>Team</th>
                <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {linkedCompetitions.map((c: any) => {
                const teamIdValue = String(c?.project_id ?? c?.project?.id ?? '').trim();
                const team = teamMemberships.find((t: any) => String(t?.id) === teamIdValue);
                const clubIdValue = String(team?.parent || '').trim();
                const clubSlug = clubSlugById.get(clubIdValue) || '';
                const teamSlugOrId = String(team?.slug || team?.id || '').trim();
                const parentSeasonId = String(c?.parent_period_id ?? c?.parent_period?.id ?? '').trim();
                const competitionPath = primaryOrgSlug && clubSlug && teamSlugOrId && parentSeasonId && c?.id
                  ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}/${parentSeasonId}/${c.id}` : '';
                return (
                  <tr key={String(c?.id)}>
                    <td style={compactTextTdStyle}>{renderNavLink(String(c?.name || ''), competitionPath)}</td>
                    <td style={compactTextTdStyle}>
                      {renderNavLink(String(c?.parent_period?.name || ''), parentSeasonId && primaryOrgSlug && clubSlug && teamSlugOrId
                        ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}/${parentSeasonId}` : '')}
                    </td>
                    <td style={compactTextTdStyle}>
                      {renderNavLink(String(team?.name || ''), primaryOrgSlug && clubSlug && teamSlugOrId ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}` : '')}
                    </td>
                    <td style={compactTdStyle}>
                      <div style={compactActionsStyle}>
                        <button type="button" className="app-action-button" onClick={() => competitionPath && navigate(competitionPath)} disabled={!competitionPath} style={actionButtonStyle('primary')}>View</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!linkedCompetitions.length && <tr><td style={compactTdStyle} colSpan={4}><em className="text-muted">No competitions found for linked seasons.</em></td></tr>}
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
          <h3 style={{ marginTop: 0 }}>Matches</h3>
          <Table style={compactTableStyle}>
            <thead>
              <tr>
                <th style={compactThStyle}>Title</th>
                <th style={compactThStyle}>Start</th>
                <th style={compactThStyle}>Team</th>
                <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {linkedMatches.slice(0, 200).map((m: any) => {
                const teamIdValue = String(m?.project?.id || m?.project_id || '').trim();
                const team = teamMemberships.find((t: any) => String(t?.id) === teamIdValue);
                const clubIdValue = String(team?.parent || '').trim();
                const clubKeyOrId = String(clubSlugById.get(clubIdValue) || clubIdValue || '').trim();
                const teamSlugOrId = String(team?.slug || team?.id || '').trim();
                const teamPath = primaryOrgSlug && clubKeyOrId && teamSlugOrId ? `/${primaryOrgSlug}/${clubKeyOrId}/${teamSlugOrId}` : '';
                const teamName = String(team?.name || m?.project?.name || m?.project_name || '').trim();

                const matchKeyOrId = String((m as any)?.slug || (m as any)?.id || '').trim();
                const competition = (m as any)?.period || null;
                const competitionKeyOrId = String(periodPathKey(competition) || competition?.slug || competition?.id || '').trim();
                const season = competition?.parent_period || null;
                const seasonKeyOrId = String(periodPathKey(season) || season?.slug || season?.id || competition?.parent_period_id || '').trim();

                const matchPath = (primaryOrgSlug && clubKeyOrId && teamSlugOrId && seasonKeyOrId && competitionKeyOrId && matchKeyOrId)
                  ? `/${primaryOrgSlug}/${clubKeyOrId}/${teamSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}/${matchKeyOrId}`
                  : (matchKeyOrId ? `/matches/${matchKeyOrId}` : '');
                return (
                  <tr key={String(m?.id)}>
                    <td style={compactTextTdStyle}>
                      {matchPath ? (
                        <a href={matchPath} className="text-blue-600 hover:underline fw-700 inline-block truncate" style={{ textDecoration: 'none', maxWidth: '100%' }} onClick={(e) => { e.preventDefault(); navigate(matchPath); }} title="Open match details">
                          {String(m?.title || '') || '—'}
                        </a>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td style={compactTextTdStyle}>{String(m?.start_time || '')}</td>
                    <td style={compactTextTdStyle}>{renderNavLink(teamName, teamPath)}</td>
                    <td style={compactTdStyle}>
                      <div style={compactActionsStyle}>
                        <button type="button" className="app-action-button" onClick={() => { if (matchPath) navigate(matchPath); }} disabled={!matchPath} style={actionButtonStyle('primary')}>View</button>
                        <button type="button" className="app-action-button" onClick={() => { setSelectedEditMatch(m); setIsMatchEditModalOpen(true); }} style={actionButtonStyle('warning')}>Edit</button>
                        <button type="button" className="app-action-button" style={actionButtonStyle('danger')} onClick={async () => {
                          if (!m?.id) return;
                          if (!window.confirm(`Delete match ${m.title || m.id}?`)) return;
                          try { await deleteMatch(m.id); } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
                        }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!linkedMatches.length && <tr><td style={compactTdStyle} colSpan={4}><em className="text-muted">No matches linked.</em></td></tr>}
            </tbody>
          </Table>
        </div>
      </div>
    );
  }

  return null;
}
