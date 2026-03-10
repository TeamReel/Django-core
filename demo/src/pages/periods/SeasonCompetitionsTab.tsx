import React from 'react';
import { Alert, Badge, Card } from '@django-core/design-system';
import { logger } from '@/utils/logger';
import { Table } from '../../shims/design-system';
import { api } from '../../api';
import type { Period } from '../../types/season';
import s from './ProjectSeasonDetailPage.module.css';

export interface SeasonCompetitionsTabProps {
  competitions: Period[];
  competitionsLoading: boolean;
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;
  apiBaseUrl?: string;
  getMatchCountForCompetition: (competition: Period) => number;
  getCompetitionParticipantsCount: (competition: Period) => number;
  setIsCreateCompetitionModalOpen: (v: boolean) => void;
  setSelectedDetailPeriod: (p: Period | null) => void;
  setIsPeriodDetailModalOpen: (v: boolean) => void;
  setSelectedEditPeriod: (p: Period | null) => void;
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
        <div className={s.cardPadding}>
          <div className={s.competitionsHeader}>
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
                        <span className={s.sportVariantCell}>
                          <span>{competition.sport.sport_icon}</span>
                          <span className={s.sportVariantText}>{competition.sport.name}</span>
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
                                await api.delete(`/periods/${competition.id}/`);
                                setCompetitions((prev) => prev.filter((c) => c.id !== competition.id));
                              } catch (e) {
                                logger.error('Error deleting competition', e);
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
