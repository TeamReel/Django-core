/**
 * CompetitionMatchesTable — reusable match table used in both Overview and Matches tabs.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import {
  actionButtonStyle,
  type ActionTone,
  compactActionsStyle,
  compactTableStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactThStyle,
} from '../identity/detail/detailStyles';
import { getCsrfToken } from '../../types/season';

export interface CompetitionMatchesTableProps {
  rows: any[];
  matchesLoading: boolean;
  matchDisplayTitle: (m: any, fallback?: string) => string;
  matchDetailPath: (matchId: string) => string;
  apiBaseUrl: string;
  setMatches: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedDetailMatch: (m: any) => void;
  setIsMatchDetailModalOpen: (v: boolean) => void;
  setSelectedEditMatch: (m: any) => void;
  setIsMatchEditModalOpen: (v: boolean) => void;
}

const taBtnStyle = (tone: ActionTone = 'neutral'): React.CSSProperties => actionButtonStyle(tone);

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
    return <div className="text-sm text-gray-500 py-4 text-center">No matches in this competition.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <Table style={compactTableStyle}>
        <thead>
          <tr>
            <th style={compactThStyle}>Match</th>
            <th style={compactThStyle}>Date</th>
            <th className="hide-mobile" style={compactThStyle}>Location</th>
            <th className="hide-mobile" style={compactThStyle}>Participants</th>
            <th className="hide-mobile text-right" style={compactThStyle}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m: any) => (
            <tr key={String(m.id)}>
              <td style={compactTextTdStyle}>
                <Link
                  to={matchDetailPath(String(m.id))}
                  className="hover:underline"
                  style={{ textDecoration: 'none', color: 'var(--app-link)' }}
                >
                  {matchDisplayTitle(m)}
                </Link>
              </td>
              <td style={compactTdStyle}>
                {m.start_time ? <Badge variant="default">{new Date(m.start_time).toLocaleString()}</Badge> : '—'}
              </td>
              <td className="hide-mobile" style={compactTdStyle}>
                {m.location ? <Badge variant="default">{m.location}</Badge> : '—'}
              </td>
              <td className="hide-mobile" style={compactTdStyle}>
                {m.participations_count !== undefined ? <Badge variant="default">{m.participations_count}</Badge> : '—'}
              </td>
              <td className="hide-mobile" style={compactTdStyle}>
                <div style={compactActionsStyle}>
                  <button
                    type="button"
                    className="app-action-button"
                    onClick={() => { setSelectedDetailMatch(m); setIsMatchDetailModalOpen(true); }}
                    style={taBtnStyle('primary')}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="app-action-button"
                    onClick={() => { setSelectedEditMatch(m); setIsMatchEditModalOpen(true); }}
                    style={taBtnStyle('warning')}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="app-action-button"
                    onClick={async () => {
                      if (!window.confirm(`Delete match ${matchDisplayTitle(m)}?`)) return;
                      try {
                        const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(String(m.id))}/`, {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                          credentials: 'include',
                        });
                        if (res.ok) setMatches((prev) => prev.filter((x: any) => String(x.id) !== String(m.id)));
                        else alert('Error deleting match');
                      } catch (e) { console.error(e); alert('Error deleting match'); }
                    }}
                    style={taBtnStyle('danger')}
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
