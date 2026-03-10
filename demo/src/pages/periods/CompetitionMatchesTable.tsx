/**
 * CompetitionMatchesTable — reusable match table used in both Overview and Matches tabs.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@django-core/design-system';
import { logger } from '@/utils/logger';
import { Table } from '../../shims/design-system';
import SmartEmptyState from '../../components/SmartEmptyState';
import { activitiesApi } from '../../api';
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
                  className="hover:underline"
                  style={{ textDecoration: 'none', color: 'var(--app-link)' }}
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
                      if (!window.confirm(`Delete match ${matchDisplayTitle(m)}?`)) return;
                      try {
                        await activitiesApi.delete(String(m.id));
                        setMatches((prev) => prev.filter((x) => String(x.id) !== String(m.id)));
                      } catch (e) { logger.error('Error deleting match', e); alert('Error deleting match'); }
                    }}
                  >
                    Delete
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
