import React from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Card } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { periodPathKey } from '../../utils/periodPath';
import { getCsrfToken } from '../../utils/csrf';
import { getMatchParticipantsCount } from './seasonDetailUtils';
import s from './ProjectSeasonDetailPage.module.css';

export interface SeasonMatchesTabProps {
  matches: any[];
  matchesLoading: boolean;
  isTeamRoute: boolean;
  seasonsBasePath: string;
  seasonPathKey: string;
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;
  apiBaseUrl: string;
  matchDisplayTitle: (m: any) => string;
  setIsCreateMatchModalOpen: (v: boolean) => void;
  setSelectedDetailMatch: (m: any) => void;
  setIsMatchDetailModalOpen: (v: boolean) => void;
  setSelectedEditMatch: (m: any) => void;
  setIsMatchEditModalOpen: (v: boolean) => void;
  setMatches: React.Dispatch<React.SetStateAction<any[]>>;
}

const SeasonMatchesTab: React.FC<SeasonMatchesTabProps> = ({
  matches,
  matchesLoading,
  isTeamRoute,
  seasonsBasePath,
  seasonPathKey,
  userCanEditProject,
  userCanDeleteProject,
  apiBaseUrl,
  matchDisplayTitle,
  setIsCreateMatchModalOpen,
  setSelectedDetailMatch,
  setIsMatchDetailModalOpen,
  setSelectedEditMatch,
  setIsMatchEditModalOpen,
  setMatches,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-3">
      <Card>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <h3 className={s.sectionTitle}>Matches</h3>
            {userCanEditProject ? (
              <button
                type="button"
                className="app-action-button cta-btn cta-btn-primary"
                onClick={() => setIsCreateMatchModalOpen(true)}
              >
                Add Match
              </button>
            ) : null}
          </div>
          {matchesLoading ? (
            <Alert variant="info">Loading matches…</Alert>
          ) : matches.length === 0 ? (
            <Alert variant="info">No matches found in this season.</Alert>
          ) : (
            <Table className="detail-table">
              <thead>
                <tr>
                  <th className="detail-th">Match</th>
                  <th className="detail-th">Competition</th>
                  <th className="detail-th">Date</th>
                  <th className="hide-mobile detail-th">Participants</th>
                  <th className="hide-mobile text-right detail-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <tr key={match.id}>
                    <td className="detail-td-text">
                      {(() => {
                        const compId = String(
                          (match as any).period_id || match.period?.id || (match as any).period || ''
                        ).trim();
                        const compKey = periodPathKey((match as any).period || null) || compId;
                        const matchKey = (match as any).slug || match.id;
                        const matchPath = isTeamRoute
                          ? `${seasonsBasePath}/${seasonPathKey}/${compKey}/${String(matchKey)}`
                          : `/matches/${String(matchKey)}`;
                        return (
                          <Link
                            to={matchPath}
                            className={`hover:underline ${s.appLink}`}
                          >
                            {matchDisplayTitle(match)}
                          </Link>
                        );
                      })()}
                    </td>
                    <td className="detail-td-text">
                      {match.period?.name || '\u2014'}
                    </td>
                    <td className="detail-td-text">
                      {match.start_time ? new Date(match.start_time).toLocaleString() : '\u2014'}
                    </td>
                    <td className="hide-mobile detail-td">
                      <Badge variant="default">{getMatchParticipantsCount(match)}</Badge>
                    </td>
                    <td className="hide-mobile detail-td">
                      <div className="detail-actions">
                        <button
                          type="button"
                          className="app-action-button action-btn action-btn-primary"
                          onClick={() => {
                            setSelectedDetailMatch(match);
                            setIsMatchDetailModalOpen(true);
                          }}
                        >
                          View
                        </button>
                        {userCanEditProject && (
                          <button
                            type="button"
                            className="app-action-button action-btn action-btn-warning"
                            onClick={() => {
                              setSelectedEditMatch(match);
                              setIsMatchEditModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                        )}
                        {userCanDeleteProject && (
                          <button
                            type="button"
                            className="app-action-button action-btn action-btn-danger"
                            onClick={async () => {
                              if (!window.confirm(`Are you sure you want to delete match ${match.title || match.name}?`)) return;
                              try {
                                const res = await fetch(
                                  `${apiBaseUrl}/api/v1/activities/${match.id}/`,
                                  {
                                    method: 'DELETE',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'X-CSRFToken': getCsrfToken(),
                                    },
                                    credentials: 'include',
                                  }
                                );

                                if (res.ok) {
                                  setMatches((prev) => prev.filter((m) => m.id !== match.id));
                                } else {
                                  alert('Error deleting match');
                                }
                              } catch (e) {
                                console.error(e);
                                alert('Error deleting match');
                              }
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  </div>
);

export default SeasonMatchesTab;
