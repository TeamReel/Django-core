import React from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Card } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { periodPathKey } from '../../utils/periodPath';
import { getCsrfToken } from '../../utils/csrf';
import type { Period } from '../../types/season';
import {
  actionButtonStyle,
  ctaButtonStyle,
  type ActionTone,
  compactTableStyle,
  compactThStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactActionsStyle,
} from '../identity/detail/detailStyles';
import s from './ProjectSeasonDetailPage.module.css';

export interface SeasonCompetitionsTabProps {
  competitions: Period[];
  competitionsLoading: boolean;
  isTeamRoute: boolean;
  seasonsBasePath: string;
  seasonPathKey: string;
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

const tableActionButtonStyle = (tone: ActionTone = 'neutral'): React.CSSProperties => ({
  ...actionButtonStyle(tone),
});

const SeasonCompetitionsTab: React.FC<SeasonCompetitionsTabProps> = ({
  competitions,
  competitionsLoading,
  isTeamRoute,
  seasonsBasePath,
  seasonPathKey,
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
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <h3 className={s.sectionTitle}>Competitions</h3>
            {userCanEditProject ? (
              <button
                type="button"
                className="app-action-button"
                onClick={() => setIsCreateCompetitionModalOpen(true)}
                style={ctaButtonStyle('primary')}
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
            <Table style={compactTableStyle}>
              <thead>
                <tr>
                  <th style={compactThStyle}>Competition</th>
                  <th style={compactThStyle}>Sport Variant</th>
                  <th style={compactThStyle}>Dates</th>
                  <th style={compactThStyle}>Matches</th>
                  <th style={compactThStyle}>Participants</th>
                  <th style={compactThStyle} className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {competitions.map((competition) => (
                  <tr key={competition.id}>
                    <td style={compactTextTdStyle}>
                      <Link
                        to={
                          isTeamRoute
                            ? `${seasonsBasePath}/${seasonPathKey}/${periodPathKey(competition) || competition.id}`
                            : `${seasonsBasePath}/${seasonPathKey}/competitions/${periodPathKey(competition) || competition.id}`
                        }
                        className={`hover:underline ${s.appLink}`}
                      >
                        {competition.name}
                      </Link>
                    </td>
                    <td style={compactTdStyle}>
                      {competition.sport ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{competition.sport.sport_icon}</span>
                          <span style={{ fontSize: '12px' }}>{competition.sport.name}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--app-muted-text)' }}>\u2014</span>
                      )}
                    </td>
                    <td style={compactTextTdStyle}>
                      {new Date(competition.start_date || '').toLocaleDateString()} \u2013{' '}
                      {new Date(competition.end_date || '').toLocaleDateString()}
                    </td>
                    <td style={compactTdStyle}>
                      <Badge variant="default">{getMatchCountForCompetition(competition)}</Badge>
                    </td>
                    <td style={compactTdStyle}>
                      <Badge variant="default">{getCompetitionParticipantsCount(competition)}</Badge>
                    </td>
                    <td style={compactTdStyle}>
                      <div style={compactActionsStyle}>
                        <button
                          type="button"
                          className="app-action-button"
                          onClick={() => {
                            setSelectedDetailPeriod(competition);
                            setIsPeriodDetailModalOpen(true);
                          }}
                          style={tableActionButtonStyle('primary')}
                        >
                          View
                        </button>
                        {userCanEditProject && (
                          <button
                            type="button"
                            className="app-action-button"
                            onClick={() => {
                              setSelectedEditPeriod(competition);
                              setIsPeriodEditModalOpen(true);
                            }}
                            style={tableActionButtonStyle('warning')}
                          >
                            Edit
                          </button>
                        )}
                        {userCanDeleteProject && (
                          <button
                            type="button"
                            className="app-action-button"
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
                                alert('Error deleting competition');
                              }
                            }}
                            style={tableActionButtonStyle('danger')}
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
