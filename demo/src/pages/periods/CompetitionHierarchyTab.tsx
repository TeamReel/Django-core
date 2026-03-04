import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Input } from '@django-core/design-system';
import styles from './CompetitionHierarchyTab.module.css';

export interface CompetitionHierarchyTabProps {
  hierarchySearch: string;
  setHierarchySearch: (v: string) => void;
  matchesLoading: boolean;
  filteredMatches: any[];
  navigate: (path: string) => void;
  matchDetailPath: (id: string) => string;
  matchDisplayTitle: (m: any) => string;
  competition: any;
  season: any;
  seasonsBasePath: string;
  seasonKeyOrId: string;
  setIsMatchCreateModalOpen: (v: boolean) => void;
  setSelectedDetailMatch: (m: any) => void;
  setIsMatchDetailModalOpen: (v: boolean) => void;
  setSelectedEditMatch: (m: any) => void;
  setIsMatchEditModalOpen: (v: boolean) => void;
  setMatches: React.Dispatch<React.SetStateAction<any[]>>;
  apiBaseUrl: string;
  getCsrfToken: () => string;
}

export function CompetitionHierarchyTab({
  hierarchySearch,
  setHierarchySearch,
  matchesLoading,
  filteredMatches,
  navigate,
  matchDetailPath,
  matchDisplayTitle,
  competition,
  season,
  seasonsBasePath,
  seasonKeyOrId,
  setIsMatchCreateModalOpen,
  setSelectedDetailMatch,
  setIsMatchDetailModalOpen,
  setSelectedEditMatch,
  setIsMatchEditModalOpen,
  setMatches,
  apiBaseUrl,
  getCsrfToken,
}: CompetitionHierarchyTabProps) {
  return (
    <Card>
      <div className={styles.root}>
      <div className="flex-between gap-12">
        <div>
          <div className="fs-16 fw-700">Hierarchy</div>
          <div className="text-muted fs-13">
            Season → Competition → Matches
          </div>
        </div>
        <div className="flex-row gap-8 flex-wrap">
          <Input
            value={hierarchySearch}
            onChange={(e) => setHierarchySearch(e.target.value)}
            placeholder="Search matches…"
          />
          <Button variant="secondary" onClick={() => setIsMatchCreateModalOpen(true)}>
            Create Match
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="mt-12 flex-row gap-8 flex-wrap">
        <span className={`text-muted ${styles.breadcrumbPill}`}>Season</span>
        <Link
          to={`${seasonsBasePath}/${seasonKeyOrId}`}
          className={`hover:underline fw-600 fs-13 ${styles.seasonLink}`}
        >
          {season?.name || 'Season'}
        </Link>
        <span className="text-muted">→</span>
        <span className={`text-muted ${styles.breadcrumbPill}`}>Competition</span>
        <span className={`fw-600 fs-13 ${styles.competitionName}`}>{competition?.name || 'Competition'}</span>
      </div>

      {matchesLoading && filteredMatches.length === 0 ? (
        <div className={`text-sm text-gray-500 py-2 ${styles.statusMessage}`}>
          Loading matches...
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className={`text-sm text-gray-500 py-2 ${styles.statusMessage}`}>
          No matches found.
        </div>
      ) : (
        (() => {
          // Group by date
          const groups = new Map<string, { label: string; rows: any[] }>();
          for (const m of filteredMatches) {
            if (m?.start_time) {
              const dt = new Date(m.start_time);
              const isoKey = Number.isNaN(dt.getTime()) ? 'No date' : dt.toISOString().slice(0, 10);
              const label = Number.isNaN(dt.getTime()) ? 'No date' : dt.toLocaleDateString();
              const existing = groups.get(isoKey) || { label, rows: [] };
              existing.rows.push(m);
              groups.set(isoKey, existing);
            } else {
              const existing = groups.get('No date') || { label: 'No date', rows: [] };
              existing.rows.push(m);
              groups.set('No date', existing);
            }
          }

          const ordered = Array.from(groups.entries()).sort((a, b) => {
            if (a[0] === 'No date') return 1;
            if (b[0] === 'No date') return -1;
            return b[0].localeCompare(a[0]);
          });

          return (
            <div className={styles.matchesContainer}>
              {ordered.map(([key, group]) => (
                <div
                  key={key}
                  className={styles.dateGroup}
                >
                  <div className={styles.dateGroupHeader}>
                    <div className="fw-800 fs-14">{group.label}</div>
                    <div className="fs-12 text-muted">{group.rows.length} match{group.rows.length !== 1 ? 'es' : ''}</div>
                  </div>

                  <div className={styles.dateGroupBody}>
                    <div className={styles.matchesList}>
                      {group.rows.map((m: any) => (
                        <div
                          key={String(m.id)}
                          className={styles.matchRow}
                        >
                          <div className={styles.matchInfo}>
                            <button
                              type="button"
                              className={`app-unstyled-button hover:underline ${styles.matchButton}`}
                              onClick={() => navigate(matchDetailPath(String(m.id)))}
                            >
                              {matchDisplayTitle(m)}
                            </button>
                            <div className="fs-12 text-muted">
                              {m.start_time ? new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} • {m.location || '—'}
                            </div>
                          </div>

                          <div className={styles.actionsRow}>
                            <span className={styles.pill}>Participants: {m.participations_count ?? '—'}</span>
                            <button type="button" className="app-action-button action-btn action-btn-primary" onClick={() => { setSelectedDetailMatch(m); setIsMatchDetailModalOpen(true); }}>
                              View
                            </button>
                            <button type="button" className="app-action-button action-btn action-btn-warning" onClick={() => { setSelectedEditMatch(m); setIsMatchEditModalOpen(true); }}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="app-action-button action-btn action-btn-danger"
                              onClick={async () => {
                                if (!window.confirm(`Delete match ${matchDisplayTitle(m)}?`)) return;
                                try {
                                  const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(String(m.id))}/`, {
                                    method: 'DELETE',
                                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                                    credentials: 'include',
                                  });
                                  if (res.ok) {
                                    setMatches((prev) => prev.filter((x: any) => String(x.id) !== String(m.id)));
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
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      )}
      </div>
    </Card>
  );
}
