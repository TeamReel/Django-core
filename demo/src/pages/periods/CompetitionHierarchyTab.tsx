import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Input } from '@django-core/design-system';

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
        <span className="text-muted" style={{ padding: '2px 8px', borderRadius: 999, border: '1px solid var(--app-border)', background: 'var(--app-surface-2)', fontSize: 12, fontWeight: 600 }}>Season</span>
        <Link
          to={`${seasonsBasePath}/${seasonKeyOrId}`}
          className="hover:underline fw-600 fs-13"
          style={{ textDecoration: 'none', color: '#60a5fa' }}
        >
          {season?.name || 'Season'}
        </Link>
        <span className="text-muted">→</span>
        <span className="text-muted" style={{ padding: '2px 8px', borderRadius: 999, border: '1px solid var(--app-border)', background: 'var(--app-surface-2)', fontSize: 12, fontWeight: 600 }}>Competition</span>
        <span className="fw-600 fs-13" style={{ color: 'var(--app-text)' }}>{competition?.name || 'Competition'}</span>
      </div>

      {matchesLoading && filteredMatches.length === 0 ? (
        <div className="text-sm text-gray-500 py-2" style={{ marginTop: 12 }}>
          Loading matches...
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-sm text-gray-500 py-2" style={{ marginTop: 12 }}>
          No matches found.
        </div>
      ) : (
        (() => {
          const pillStyle: React.CSSProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '2px 8px',
            borderRadius: 999,
            border: '1px solid var(--app-border)',
            background: 'var(--app-surface-2)',
            fontSize: 12,
            color: 'var(--app-muted-text)',
            fontWeight: 600,
          };

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
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ordered.map(([key, group]) => (
                <div
                  key={key}
                  style={{
                    border: '1px solid var(--app-border)',
                    borderRadius: 10,
                    background: 'var(--app-surface)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid var(--app-border)',
                      background: 'var(--app-surface-2)',
                    }}
                  >
                    <div className="fw-800 fs-14">{group.label}</div>
                    <div className="fs-12 text-muted">{group.rows.length} match{group.rows.length !== 1 ? 'es' : ''}</div>
                  </div>

                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {group.rows.map((m: any) => (
                        <div
                          key={String(m.id)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 12,
                            padding: '8px 10px',
                            border: '1px solid var(--app-border)',
                            borderRadius: 8,
                            background: 'var(--app-surface)',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <button
                              type="button"
                              className="app-unstyled-button hover:underline"
                              onClick={() => navigate(matchDetailPath(String(m.id)))}
                              style={{ textAlign: 'left', fontWeight: 700, fontSize: 13, color: '#60a5fa' }}
                            >
                              {matchDisplayTitle(m)}
                            </button>
                            <div className="fs-12 text-muted">
                              {m.start_time ? new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} • {m.location || '—'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <span style={pillStyle}>Participants: {m.participations_count ?? '—'}</span>
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
    </Card>
  );
}
