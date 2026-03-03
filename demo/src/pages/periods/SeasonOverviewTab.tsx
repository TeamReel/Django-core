import React from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { periodPathKey } from '../../utils/periodPath';
import { getCsrfToken } from '../../utils/csrf';
import type { Period } from '../../types/season';
import {
  actionButtonStyle,
  type ActionTone,
  compactTableStyle,
  compactThStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactActionsStyle,
} from '../identity/detail/detailStyles';
import s from './ProjectSeasonDetailPage.module.css';

export interface SeasonOverviewTabProps {
  season: Period | null;
  competitions: Period[];
  competitionsLoading: boolean;
  members: any[];
  seasonMatchesCount: number;
  navigateToTab: (tabId: string) => void;
  isTeamRoute: boolean;
  seasonsBasePath: string;
  seasonPathKey: string;
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;
  apiBaseUrl: string;
  getMatchCountForCompetition: (competition: any) => number;
  setSelectedDetailPeriod: (p: any) => void;
  setIsPeriodDetailModalOpen: (v: boolean) => void;
  setSelectedEditPeriod: (p: any) => void;
  setIsPeriodEditModalOpen: (v: boolean) => void;
  setCompetitions: React.Dispatch<React.SetStateAction<Period[]>>;
}

const tableActionButtonStyle = (tone: ActionTone = 'neutral'): React.CSSProperties => ({
  ...actionButtonStyle(tone),
});

const SeasonOverviewTab: React.FC<SeasonOverviewTabProps> = ({
  season,
  competitions,
  competitionsLoading,
  members,
  seasonMatchesCount,
  navigateToTab,
  isTeamRoute,
  seasonsBasePath,
  seasonPathKey,
  userCanEditProject,
  userCanDeleteProject,
  apiBaseUrl,
  getMatchCountForCompetition,
  setSelectedDetailPeriod,
  setIsPeriodDetailModalOpen,
  setSelectedEditPeriod,
  setIsPeriodEditModalOpen,
  setCompetitions,
}) => (
  <>
    {/* Top Stats Row */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card style={{ padding: '16px' }}>
        <div className="text-sm font-medium text-gray-500">Dates</div>
        <div className="text-sm font-semibold mt-1">
          {season?.start_date ? new Date(season.start_date).toLocaleDateString() : '\u2014'} \u2013{' '}
          {season?.end_date ? new Date(season.end_date).toLocaleDateString() : '\u2014'}
        </div>
      </Card>
      <Card style={{ padding: '16px' }}>
        <div className="text-sm font-medium text-gray-500">Competitions</div>
        <div className="text-2xl font-bold mt-1">{competitions.length}</div>
      </Card>
      <Card style={{ padding: '16px' }}>
        <div className="text-sm font-medium text-gray-500">Matches</div>
        <div className="text-2xl font-bold mt-1">{seasonMatchesCount}</div>
      </Card>
      <Card style={{ padding: '16px' }}>
        <div className="text-sm font-medium text-gray-500">Squad</div>
        <div className="text-2xl font-bold mt-1">{members.length}</div>
      </Card>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Overview content */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Competitions</h3>
            <Button variant="secondary" size="sm" onClick={() => navigateToTab('competitions')}>
              View All
            </Button>
          </div>
          {competitionsLoading ? (
            <div className="text-sm text-gray-500 py-4 text-center">Loading competitions…</div>
          ) : competitions.length === 0 ? (
            <div className="text-sm text-gray-500 py-4 text-center">No competitions in this season.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table style={compactTableStyle}>
                <thead>
                  <tr>
                    <th style={compactThStyle}>Competition</th>
                    <th style={compactThStyle}>Sport Variant</th>
                    <th style={compactThStyle}>Matches</th>
                    <th style={compactThStyle} className="text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {competitions.slice(0, 5).map((competition) => (
                    <tr key={competition.id}>
                      <td style={compactTextTdStyle}>
                        <Link
                          to={
                            isTeamRoute
                              ? `${seasonsBasePath}/${seasonPathKey}/${periodPathKey(competition) || competition.id}`
                              : `${seasonsBasePath}/${seasonPathKey}/competitions/${periodPathKey(competition) || competition.id}`
                          }
                          className="hover:underline"
                          style={{ textDecoration: 'none', backgroundColor: 'transparent', color: '#60a5fa' }}
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
                      <td style={compactTdStyle}>
                        <Badge variant="default">{getMatchCountForCompetition(competition)}</Badge>
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
                                  const res = await fetch(`${apiBaseUrl}/api/v1/periods/${competition.id}/`, {
                                    method: 'DELETE',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'X-CSRFToken': getCsrfToken(),
                                    },
                                    credentials: 'include',
                                  });

                                  if (res.ok) {
                                    setCompetitions((prev) => prev.filter((c) => String(c.id) !== String(competition.id)));
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
            </div>
          )}
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Hierarchy</h3>
            <Button variant="secondary" size="sm" onClick={() => navigateToTab('hierarchy')}>
              View Hierarchy
            </Button>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <div className="text-sm text-gray-600 mb-2">
              Browse competitions and matches grouped by competition.
            </div>
          </div>
        </Card>
      </div>

      {/* Right Column: Quick Actions */}
      <div className="space-y-6">
        <Card>
          <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>

          <div className="space-y-2">
            <Button
              variant="secondary"
              size="sm"
              className={s.quickActionBtn}
              onClick={() => navigateToTab('identity')}
            >
              Brand Identity Settings
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className={s.quickActionBtn}
              onClick={() => navigateToTab('competitions')}
            >
              Manage Competitions
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className={s.quickActionBtn}
              onClick={() => navigateToTab('matches')}
            >
              View Matches
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className={s.quickActionBtn}
              onClick={() => navigateToTab('squad')}
            >
              View Squad
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className={s.quickActionBtn}
              onClick={() => navigateToTab('media')}
            >
               Media Matrix
            </Button>
          </div>
        </Card>

        {userCanEditProject && (
          <Card>
            <h3 className="text-lg font-semibold mb-3">Season Setup (Beta)</h3>
            <div className="space-y-2">
               <div className="text-xs text-gray-500 mb-2">
                 Quickly populate this season from previous data.
               </div>
               <Button
                  variant="secondary"
                  size="sm"
                  className={s.quickActionBtn}
                  onClick={() => alert('Smart Import: Allows selecting a source season (e.g. 23/24) to copy players into this campaign.')}
                >
                  Import Squad from Previous Season
                </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  </>
);

export default SeasonOverviewTab;
