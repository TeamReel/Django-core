import React from 'react';
import { Alert, Badge, Card } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { getCsrfToken } from '../../utils/csrf';
import type { Period } from '../../types/season';
import s from './ProjectSeasonDetailPage.module.css';

export interface SeasonCompetitionsTabProps {
  competitions: Period[];
  competitionsLoading: boolean;
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;
  apiBaseUrl: string;
  getMatchCountForCompetition: (competition: any) => number;
  getCompetitionParticipantsCount: (competition: any) => number;
  setIsCreateCompetitionModalOpen: (v: boolean) => void;
  setSelectedDetailPeriod: (p: any) => void;
  setIsPeriodDetailModalOpen: (v: boolean) => void;
  setSelectedEditPeriod: (p: any) => void;
  setIsPeriodEditModalOpen: (v: boolean) => void;
  setCompetitions: React.Dispatch<React.SetStateAction<Period[]>>;
}

const SeasonCompetitionsTab: React.FC<SeasonCompetitionsTabProps> = ({
  competitions,
  competitionsLoading,
  userCanEditProject,
  userCanDeleteProject,
  apiBaseUrl,
  getMatchCountForCompetition,
  getCompetitionParticipantsCount,
  setIsCreateCompetitionModalOpen,
  setSelectedDetailPeriod,
  setIsPeriodDetailModalOpen,
  setSelectedEditPeriod,
  setIsPeriodEditModalOpen,
  setCompetitions,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-3">
      <Card>
        <div style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
            <h3 className={s.sectionTitle}>Competitions</h3>
            {userCanEditProject ? (
              <button
                type="button"
                className="app-action-button cta-btn cta-btn-primary"
                onClick={() => setIsCreateCompetitionModalOpen(true)}
              >
                Add Competition
              </button>
            ) : null}
          </div>
          {competitionsLoading ? (
            <Alert variant="info">Loading competitions…</Alert>
          ) : competitions.length === 0 ? (
            <Alert variant="info">No competitions found in this season.</Alert>
          ) : (
            <Table className="detail-table">
              <thead>
                <tr>
                  <th className="detail-th">Competition</th>
                  <th className="detail-th">Sport Variant</th>
                  <th className="detail-th">Dates</th>
                  <th className="detail-th">Matches</th>
                  <th className="detail-th">Participants</th>
                  <th className="detail-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {competitions.map((competition) => (
                  <tr key={competition.id}>
                    <td className="detail-td-text">
                      {competition.name}
                    </td>
                    <td className="detail-td">
                      {competition.sport ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                          <span>{competition.sport.sport_icon}</span>
                          <span style={{ fontSize: 'var(--text-xs)' }}>{competition.sport.name}</span>
                        </span>
                      ) : (
                        <span className="text-muted">\u2014</span>
                      )}
                    </td>
                    <td className="detail-td-text">
                      {new Date(competition.start_date || '').toLocaleDateString()} \u2013{' '}
                      {new Date(competition.end_date || '').toLocaleDateString()}
                    </td>
                    <td className="detail-td">
                      <Badge variant="default">{getMatchCountForCompetition(competition)}</Badge>
                    </td>
                    <td className="detail-td">
                      <Badge variant="default">{getCompetitionParticipantsCount(competition)}</Badge>
                    </td>
                    <td className="detail-td">
                      <div className="detail-actions">
                        <button
                          type="button"
                          className="app-action-button action-btn action-btn-primary"
                          onClick={() => {
                            setSelectedDetailPeriod(competition);
                            setIsPeriodDetailModalOpen(true);
                          }}
                        >
                          View
                        </button>
                        {userCanEditProject && (
                          <button
                            type="button"
                            className="app-action-button action-btn action-btn-warning"
                            onClick={() => {
                              setSelectedEditPeriod(competition);
                              setIsPeriodEditModalOpen(true);
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
                              if (!window.confirm(`Are you sure you want to delete competition ${competition.name}?`)) return;
                              try {
                                const res = await fetch(
                                  `${apiBaseUrl}/api/v1/periods/${competition.id}/`,
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
                                  setCompetitions((prev) => prev.filter((c) => c.id !== competition.id));
                                } else {
                                  alert('Error deleting competition');
                                }
                              } catch (e) {
                                console.error(e);
                                console.error(e);
                                alert('Error deleting competition');
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

export default SeasonCompetitionsTab;
