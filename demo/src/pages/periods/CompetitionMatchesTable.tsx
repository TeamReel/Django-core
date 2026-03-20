/**
 * CompetitionMatchesTable — reusable match table used in both Overview and Matches tabs.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@django-core/design-system';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { Table } from '../../shims/design-system';
import SmartEmptyState from '../../components/SmartEmptyState';
import ct from './CompetitionMatchesTable.module.css';
import { activitiesApi, trashApi } from '@/api';
import type { Activity } from '../../types/api/activity';
import type { MatchRef } from './useCompetitionMutations';

export interface CompetitionMatchesTableProps {
  rows: Activity[];
  matchesLoading: boolean;
  matchDisplayTitle: (m: Activity, fallback?: string) => string;
  matchDetailPath: (matchId: string) => string;
  apiBaseUrl?: string;
  setMatches: React.Dispatch<React.SetStateAction<Activity[]>>;
  setSelectedDetailMatch: (m: Activity | null) => void;
  setIsMatchDetailModalOpen: (v: boolean) => void;
  setSelectedEditMatch: (m: MatchRef | null) => void;
  setIsMatchEditModalOpen: (v: boolean) => void;
}

export const CompetitionMatchesTable: React.FC<CompetitionMatchesTableProps> = ({
  rows,
  matchesLoading,
  matchDisplayTitle,
  matchDetailPath,
  apiBaseUrl,
  setMatches,
  setSelectedDetailMatch,
  setIsMatchDetailModalOpen,
  setSelectedEditMatch,
  setIsMatchEditModalOpen,
}) => {
  const { pushToast } = useToast();
  if (matchesLoading && !rows.length) {
    return <div className="text-sm text-gray-500 py-4 text-center">Loading matches…</div>;
  }
  if (!rows.length) {
    return <SmartEmptyState type="matches" compact hideActions />;
  }

  return (
    <div className="overflow-x-auto">
      <Table className="detail-table">
        <thead>
          <tr>
            <th className="detail-th">Match</th>
            <th className="detail-th">Date</th>
            <th className="hide-mobile detail-th">Location</th>
            <th className="hide-mobile detail-th">Participants</th>
            <th className="hide-mobile text-right detail-th"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={String(m.id)}>
              <td className="detail-td-text">
                <Link
                  to={matchDetailPath(String(m.id))}
                  className={`hover:underline ${ct.matchLink}`}
                >
                  {matchDisplayTitle(m)}
                </Link>
              </td>
              <td className="detail-td">
                {m.start_time ? <Badge variant="default">{new Date(m.start_time).toLocaleString()}</Badge> : '—'}
              </td>
              <td className="hide-mobile detail-td">
                {m.location ? <Badge variant="default">{m.location}</Badge> : '—'}
              </td>
              <td className="hide-mobile detail-td">
                {m.participations_count !== undefined ? <Badge variant="default">{m.participations_count}</Badge> : '—'}
              </td>
              <td className="hide-mobile detail-td">
                <div className="detail-actions">
                  <button
                    type="button"
                    className="app-action-button action-btn action-btn-primary"
                    onClick={() => { setSelectedDetailMatch(m as Activity); setIsMatchDetailModalOpen(true); }}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="app-action-button action-btn action-btn-warning"
                    onClick={() => { setSelectedEditMatch(m as unknown as MatchRef); setIsMatchEditModalOpen(true); }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="app-action-button action-btn action-btn-danger"
                    onClick={async () => {
                      if (!window.confirm(`Wedstrijd ${matchDisplayTitle(m)} verwijderen?`)) return;
                      const matchId = String(m.id);
                      const matchTitle = matchDisplayTitle(m);
                      const deletedMatch = m;
                      try {
                        setMatches((prev) => prev.filter((x) => String(x.id) !== matchId));
                        await activitiesApi.delete(matchId);
                        pushToast({
                          message: `"${matchTitle}" verplaatst naar prullenbak`,
                          type: 'info',
                          actions: [{
                            label: 'Ongedaan maken',
                            onClick: async () => {
                              try {
                                const trashItem = await trashApi.findByObjectId(matchId);
                                if (trashItem) {
                                  await trashApi.restore(trashItem.id);
                                  setMatches((prev) => [...prev, deletedMatch]);
                                  pushToast({ message: `"${matchTitle}" hersteld`, type: 'success' });
                                }
                              } catch (err) {
                                logger.error('Failed to restore match', err);
                                pushToast({ message: 'Herstellen mislukt', type: 'error' });
                              }
                            },
                          }],
                        });
                      } catch (e) { logger.error('Error deleting match', e); pushToast({ message: 'Verwijderen mislukt', type: 'error' }); }
                    }}
                  >
                    Verwijderen
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};
