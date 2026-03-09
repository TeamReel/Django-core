import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input } from '@django-core/design-system';
import { periodPathKey } from '../../utils/periodPath';
import { getCsrfToken } from '../../utils/csrf';
import type { Period } from '../../types/season';
import { getMatchParticipantsCount } from './seasonDetailUtils';
import s from './ProjectSeasonDetailPage.module.css';
import h from './SeasonHierarchyTab.module.css';

/** Match/activity record used in the hierarchy view */
interface MatchRecord {
  id: string;
  slug?: string;
  title?: string;
  name?: string;
  start_time?: string;
  period_id?: string;
  period?: { id?: string } | string;
  [key: string]: unknown;
}

export interface SeasonHierarchyTabProps {
  competitions: Period[];
  competitionsLoading: boolean;
  matches: MatchRecord[];
  matchesLoading: boolean;
  isTeamRoute: boolean;
  seasonsBasePath: string;
  seasonPathKey: string;
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;
  apiBaseUrl: string;
  matchDisplayTitle: (m: MatchRecord) => string;
  getMatchCountForCompetition: (competition: Period) => number;
  getCompetitionParticipantsCount: (competition: Period) => number;
  setIsCreateCompetitionModalOpen: (v: boolean) => void;
  setIsCreateMatchModalOpen: (v: boolean) => void;
  setSelectedDetailPeriod: (p: Period) => void;
  setIsPeriodDetailModalOpen: (v: boolean) => void;
  setSelectedEditPeriod: (p: Period) => void;
  setIsPeriodEditModalOpen: (v: boolean) => void;
  setSelectedDetailMatch: (m: MatchRecord) => void;
  setIsMatchDetailModalOpen: (v: boolean) => void;
  setSelectedEditMatch: (m: MatchRecord) => void;
  setIsMatchEditModalOpen: (v: boolean) => void;
  setCompetitions: React.Dispatch<React.SetStateAction<Period[]>>;
  setMatches: React.Dispatch<React.SetStateAction<MatchRecord[]>>;
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

  const getMatchesForCompetition = (competition: Period) => {
    const competitionId = String(competition?.id || '').trim();
    if (!competitionId) return [] as MatchRecord[];
    return matches.filter((m) => {
      const periodId = String(m.period_id || (typeof m.period === 'object' ? m.period?.id : m.period) || '');
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
        <div className={h.headerActions}>
          <Input
            value={hierarchySearch}
            onChange={(e) => setHierarchySearch(e.target.value)}
            placeholder="Search competitions/matches\u2026"
          />
          {userCanEditProject && (
            <>
              <button
                type="button"
                className="app-action-button action-btn action-btn-primary"
                onClick={() => setIsCreateCompetitionModalOpen(true)}
              >
                Add Competition
              </button>
              <button
                type="button"
                className="app-action-button action-btn action-btn-primary"
                onClick={() => setIsCreateMatchModalOpen(true)}
              >
                Add Match
              </button>
            </>
          )}
        </div>
      </div>

      {competitionsLoading && competitions.length === 0 ? (
        <div className={`text-sm text-gray-500 py-2 ${h.loadingMsg}`}>
          Loading hierarchy...
        </div>
      ) : competitions.length === 0 ? (
        <div className={`text-sm text-gray-500 py-2 ${h.loadingMsg}`}>
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
                return compMatches.some((m) => {
                  const title = String(m?.title || m?.name || '').toLowerCase();
                  const startTime = String(m?.start_time || '').toLowerCase();
                  return title.includes(normalized) || startTime.includes(normalized);
                });
              });

          return (
            <div className={`${s.verticalList} ${h.verticalListSpaced}`}>
              {filteredCompetitions.map((competition) => {
                const compId = String(competition.id);
                const competitionKey = periodPathKey(competition) || compId;
                const compMatches = getMatchesForCompetition(competition);
                const visibleMatches = !normalized
                  ? compMatches
                  : compMatches.filter((m) => {
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

                      <div className={h.actionRow}>
                        <span className={s.pill}>Matches: {getMatchCountForCompetition(competition)}</span>
                        <span className={s.pill}>Participants: {getCompetitionParticipantsCount(competition)}</span>
                        <button type="button" className="app-action-button action-btn action-btn-primary" onClick={() => { setSelectedDetailPeriod(competition); setIsPeriodDetailModalOpen(true); }}>
                          View
                        </button>
                        {userCanEditProject && (
                          <button type="button" className="app-action-button action-btn action-btn-warning" onClick={() => { setSelectedEditPeriod(competition); setIsPeriodEditModalOpen(true); }}>
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
                                console.error(e);
                                alert('Error deleting competition');
                              }
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={h.matchesContainer}>
                      {matchesLoading ? (
                        <div className="text-sm text-gray-500 py-2">Loading matches…</div>
                      ) : visibleMatches.length === 0 ? (
                        <div className="text-sm text-gray-500 py-2">No matches.</div>
                      ) : (
                        <div className={s.verticalListTight}>
                          {visibleMatches.map((match) => {
                            const matchKey = match.slug || match.id;
                            const matchPath = isTeamRoute
                              ? `${seasonsBasePath}/${seasonPathKey}/${competitionKey}/${String(matchKey)}`
                              : `/matches/${String(matchKey)}`;
                            return (
                              <div
                                key={match.id}
                                className={s.matchRow}
                              >
                                <div className={h.matchInfo}>
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

                                <div className={h.actionRow}>
                                  <span className={s.pill}>Participants: {getMatchParticipantsCount(match)}</span>
                                  <button type="button" className="app-action-button action-btn action-btn-primary" onClick={() => { setSelectedDetailMatch(match); setIsMatchDetailModalOpen(true); }}>
                                    View
                                  </button>
                                  {userCanEditProject && (
                                    <button type="button" className="app-action-button action-btn action-btn-warning" onClick={() => { setSelectedEditMatch(match); setIsMatchEditModalOpen(true); }}>
                                      Edit
                                    </button>
                                  )}
                                  {userCanDeleteProject && (
                                    <button
                                      type="button"
                                      className="app-action-button action-btn action-btn-danger"
                                      onClick={async () => {
                                        if (!window.confirm(`Delete match ${match.title || match.name}?`)) return;
                                        try {
                                          const res = await fetch(`${apiBaseUrl}/api/v1/activities/${match.id}/`, {
                                            method: 'DELETE',
                                            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                                            credentials: 'include',
                                          });
                                          if (res.ok) {
                                            setMatches((prev) => prev.filter((m) => String(m.id) !== String(match.id)));
                                          } else {
                                            alert('Error deleting match');
                                          }
                                        } catch (e) {
                                          console.error(e);
                                          console.error(e);
                                          alert('Error deleting match');
                                        }
                                      }}
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
