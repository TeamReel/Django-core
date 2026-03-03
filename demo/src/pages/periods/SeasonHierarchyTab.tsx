import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input } from '@django-core/design-system';
import { periodPathKey } from '../../utils/periodPath';
import { getCsrfToken } from '../../utils/csrf';
import type { Period } from '../../types/season';
import {
  actionButtonStyle,
} from '../identity/detail/detailStyles';
import { getMatchParticipantsCount } from './seasonDetailUtils';
import s from './ProjectSeasonDetailPage.module.css';

export interface SeasonHierarchyTabProps {
  competitions: Period[];
  competitionsLoading: boolean;
  matches: any[];
  matchesLoading: boolean;
  isTeamRoute: boolean;
  seasonsBasePath: string;
  seasonPathKey: string;
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;
  apiBaseUrl: string;
  matchDisplayTitle: (m: any) => string;
  getMatchCountForCompetition: (competition: any) => number;
  getCompetitionParticipantsCount: (competition: any) => number;
  setIsCreateCompetitionModalOpen: (v: boolean) => void;
  setIsCreateMatchModalOpen: (v: boolean) => void;
  setSelectedDetailPeriod: (p: any) => void;
  setIsPeriodDetailModalOpen: (v: boolean) => void;
  setSelectedEditPeriod: (p: any) => void;
  setIsPeriodEditModalOpen: (v: boolean) => void;
  setSelectedDetailMatch: (m: any) => void;
  setIsMatchDetailModalOpen: (v: boolean) => void;
  setSelectedEditMatch: (m: any) => void;
  setIsMatchEditModalOpen: (v: boolean) => void;
  setCompetitions: React.Dispatch<React.SetStateAction<Period[]>>;
  setMatches: React.Dispatch<React.SetStateAction<any[]>>;
}

const SeasonHierarchyTab: React.FC<SeasonHierarchyTabProps> = ({
  competitions,
  competitionsLoading,
  matches,
  matchesLoading,
  isTeamRoute,
  seasonsBasePath,
  seasonPathKey,
  userCanEditProject,
  userCanDeleteProject,
  apiBaseUrl,
  matchDisplayTitle,
  getMatchCountForCompetition,
  getCompetitionParticipantsCount,
  setIsCreateCompetitionModalOpen,
  setIsCreateMatchModalOpen,
  setSelectedDetailPeriod,
  setIsPeriodDetailModalOpen,
  setSelectedEditPeriod,
  setIsPeriodEditModalOpen,
  setSelectedDetailMatch,
  setIsMatchDetailModalOpen,
  setSelectedEditMatch,
  setIsMatchEditModalOpen,
  setCompetitions,
  setMatches,
}) => {
  const navigate = useNavigate();
  // ── Tab-local state ──
  const [hierarchySearch, setHierarchySearch] = useState('');

  const getMatchesForCompetition = (competition: any) => {
    const competitionId = String((competition as any)?.id || '').trim();
    if (!competitionId) return [];
    return matches.filter((m: any) => {
      const periodId = String(m.period_id || m.period?.id || (m as any)?.period || '');
      return periodId === competitionId;
    });
  };

  return (
    <Card>
      <div className={s.hierarchyHeader}>
        <div>
          <div className={s.hierarchyTitle}>Hierarchy</div>
          <div className={s.mutedSubtitle}>
            Competitions \u2192 Matches
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            value={hierarchySearch}
            onChange={(e) => setHierarchySearch(e.target.value)}
            placeholder="Search competitions/matches\u2026"
          />
          {userCanEditProject && (
            <>
              <button
                type="button"
                className="app-action-button"
                onClick={() => setIsCreateCompetitionModalOpen(true)}
                style={actionButtonStyle('primary')}
              >
                Add Competition
              </button>
              <button
                type="button"
                className="app-action-button"
                onClick={() => setIsCreateMatchModalOpen(true)}
                style={actionButtonStyle('primary')}
              >
                Add Match
              </button>
            </>
          )}
        </div>
      </div>

      {competitionsLoading && competitions.length === 0 ? (
        <div className="text-sm text-gray-500 py-2" style={{ marginTop: 12 }}>
          Loading hierarchy...
        </div>
      ) : competitions.length === 0 ? (
        <div className="text-sm text-gray-500 py-2" style={{ marginTop: 12 }}>
          No competitions found.
        </div>
      ) : (
        (() => {
          const normalized = hierarchySearch.trim().toLowerCase();

          const filteredCompetitions = !normalized
            ? competitions
            : competitions.filter((c) => {
                const compName = String(c?.name || '').toLowerCase();
                if (compName.includes(normalized)) return true;
                const compMatches = getMatchesForCompetition(c);
                return compMatches.some((m: any) => {
                  const title = String(m?.title || m?.name || '').toLowerCase();
                  const startTime = String(m?.start_time || '').toLowerCase();
                  return title.includes(normalized) || startTime.includes(normalized);
                });
              });

          return (
            <div className={s.verticalList} style={{ marginTop: 12 }}>
              {filteredCompetitions.map((competition) => {
                const compId = String(competition.id);
                const competitionKey = periodPathKey(competition) || compId;
                const compMatches = getMatchesForCompetition(competition);
                const visibleMatches = !normalized
                  ? compMatches
                  : compMatches.filter((m: any) => {
                      const title = String(m?.title || m?.name || '').toLowerCase();
                      const startTime = String(m?.start_time || '').toLowerCase();
                      return title.includes(normalized) || startTime.includes(normalized);
                    });

                const competitionPath = isTeamRoute
                  ? `${seasonsBasePath}/${seasonPathKey}/${periodPathKey(competition) || competition.id}`
                  : `${seasonsBasePath}/${seasonPathKey}/competitions/${periodPathKey(competition) || competition.id}`;

                return (
                  <div
                    key={compId}
                    className={s.competitionCard}
                  >
                    <div className={s.competitionCardHeader}>
                      <div className={s.competitionCardInfo}>
                        <button
                          type="button"
                          className={`app-unstyled-button hover:underline ${s.competitionLink}`}
                          onClick={() => navigate(competitionPath)}
                        >
                          {competition.name || `Competition ${compId}`}
                        </button>
                        {competition.sport && (
                          <div className={s.sportInfo}>
                            <span>{competition.sport.sport_icon}</span>
                            <span>{competition.sport.name}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span className={s.pill}>Matches: {getMatchCountForCompetition(competition)}</span>
                        <span className={s.pill}>Participants: {getCompetitionParticipantsCount(competition)}</span>
                        <button type="button" className="app-action-button" onClick={() => { setSelectedDetailPeriod(competition); setIsPeriodDetailModalOpen(true); }} style={actionButtonStyle('primary')}>
                          View
                        </button>
                        {userCanEditProject && (
                          <button type="button" className="app-action-button" onClick={() => { setSelectedEditPeriod(competition); setIsPeriodEditModalOpen(true); }} style={actionButtonStyle('warning')}>
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
                                  headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
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
                            style={actionButtonStyle('danger')}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: '10px 12px' }}>
                      {matchesLoading ? (
                        <div className="text-sm text-gray-500 py-2">Loading matches…</div>
                      ) : visibleMatches.length === 0 ? (
                        <div className="text-sm text-gray-500 py-2">No matches.</div>
                      ) : (
                        <div className={s.verticalListTight}>
                          {visibleMatches.map((match: any) => {
                            const matchKey = (match as any).slug || match.id;
                            const matchPath = isTeamRoute
                              ? `${seasonsBasePath}/${seasonPathKey}/${competitionKey}/${String(matchKey)}`
                              : `/matches/${String(matchKey)}`;
                            return (
                              <div
                                key={match.id}
                                className={s.matchRow}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <button
                                    type="button"
                                    className={`app-unstyled-button hover:underline ${s.matchLink}`}
                                    onClick={() => navigate(matchPath)}
                                  >
                                    {matchDisplayTitle(match)}
                                  </button>
                                  <div className={s.matchDate}>
                                    {match.start_time ? new Date(match.start_time).toLocaleString() : '\u2014'}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  <span className={s.pill}>Participants: {getMatchParticipantsCount(match)}</span>
                                  <button type="button" className="app-action-button" onClick={() => { setSelectedDetailMatch(match); setIsMatchDetailModalOpen(true); }} style={actionButtonStyle('primary')}>
                                    View
                                  </button>
                                  {userCanEditProject && (
                                    <button type="button" className="app-action-button" onClick={() => { setSelectedEditMatch(match); setIsMatchEditModalOpen(true); }} style={actionButtonStyle('warning')}>
                                      Edit
                                    </button>
                                  )}
                                  {userCanDeleteProject && (
                                    <button
                                      type="button"
                                      className="app-action-button"
                                      onClick={async () => {
                                        if (!window.confirm(`Delete match ${match.title || match.name}?`)) return;
                                        try {
                                          const res = await fetch(`${apiBaseUrl}/api/v1/activities/${match.id}/`, {
                                            method: 'DELETE',
                                            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                                            credentials: 'include',
                                          });
                                          if (res.ok) {
                                            setMatches((prev) => prev.filter((m: any) => String(m.id) !== String(match.id)));
                                          } else {
                                            alert('Error deleting match');
                                          }
                                        } catch (e) {
                                          console.error(e);
                                          alert('Error deleting match');
                                        }
                                      }}
                                      style={actionButtonStyle('danger')}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()
      )}
    </Card>
  );
};

export default SeasonHierarchyTab;
