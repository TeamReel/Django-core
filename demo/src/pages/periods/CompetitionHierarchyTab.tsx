import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Input } from '@django-core/design-system';
import SmartEmptyState from '../../components/SmartEmptyState';
import { activitiesApi, trashApi } from '@/api';
import type { Activity } from '../../types/api/activity';
import styles from './CompetitionHierarchyTab.module.css';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export interface CompetitionMatchModals {
  setIsMatchCreateModalOpen: (v: boolean) => void;
  setSelectedDetailMatch: (m: Activity | null) => void;
  setIsMatchDetailModalOpen: (v: boolean) => void;
  setSelectedEditMatch: (m: Record<string, unknown> | null) => void;
  setIsMatchEditModalOpen: (v: boolean) => void;
}

export interface CompetitionHierarchyTabProps {
  hierarchySearch: string;
  setHierarchySearch: (v: string) => void;
  matchesLoading: boolean;
  filteredMatches: Activity[];
  navigate: (path: string) => void;
  matchDetailPath: (id: string) => string;
  matchDisplayTitle: (m: Activity) => string;
  competition: { name?: string } | null;
  season: { name?: string } | null;
  seasonsBasePath: string;
  seasonKeyOrId: string;
  matchModals: CompetitionMatchModals;
  setMatches: React.Dispatch<React.SetStateAction<Activity[]>>;
  apiBaseUrl?: string;
  getCsrfToken?: () => string;
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
  matchModals: {
    setIsMatchCreateModalOpen,
    setSelectedDetailMatch,
    setIsMatchDetailModalOpen,
    setSelectedEditMatch,
    setIsMatchEditModalOpen,
  },
  setMatches,
  apiBaseUrl,
  getCsrfToken,
}: CompetitionHierarchyTabProps) {
  const { pushToast } = useToast();
  const confirm = useConfirm();
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
        <SmartEmptyState type="matches" compact hideActions />
      ) : (
        (() => {
          // Group by date
          const groups = new Map<string, { label: string; rows: Activity[] }>();
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
                      {group.rows.map((m) => (
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
                            <button type="button" className="app-action-button action-btn action-btn-warning" onClick={() => { setSelectedEditMatch({ ...m }); setIsMatchEditModalOpen(true); }}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="app-action-button action-btn action-btn-danger"
                              onClick={async () => {
                                const ok = await confirm({ title: 'Wedstrijd verwijderen', message: `"${matchDisplayTitle(m)}" verwijderen?`, confirmLabel: 'Verwijderen', variant: 'danger' });
                                if (!ok) return;
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
                                } catch (e) {
                                  logger.error('Error deleting match', e);
                                  pushToast({ message: 'Verwijderen mislukt', type: 'error' });
                                }
                              }}
                            >
                              Verwijderen
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
