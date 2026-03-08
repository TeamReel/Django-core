import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Input } from '@django-core/design-system';
import { ChevronRight } from 'lucide-react';

import { type Period } from './teamDetailTypes';
import h from './TeamHierarchyTab.module.css';

interface TeamHierarchyTabProps {
  hierarchySeasons: Period[];
  hierarchyCompetitionsBySeasonId: Record<string, Period[]>;
  hierarchyMatchesCountBySeasonId: Record<string, number>;
  hierarchyMatchesCountByCompetitionId: Record<string, number>;
  hierarchyLoading: boolean;
  hierarchyError: string | null;
  hierarchySearch: string;
  setHierarchySearch: (v: string) => void;
  teamMatchesByPeriodId: Record<string, any[]>;
  teamMatchesLoading: boolean;
  orgKeyForRoutes: string;
  clubKeyForRoutes: string;
  teamKeyForRoutes: string;
}

/** Format a match date */
const fmtDate = (m: any) => {
  const raw = m?.start_time || m?.date || m?.metadata?.date;
  if (!raw) return '—';
  const d = new Date(raw);
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
};

const fmtTime = (m: any) => {
  const raw = m?.start_time || m?.date || m?.metadata?.date;
  if (!raw) return '';
  const d = new Date(raw);
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
};

/** Build a display title for a match */
const matchDisplayTitle = (m: any): string => {
  const name = String(m?.name || '').trim();
  if (name) return name;
  const home = m?.metadata?.home_team || m?.metadata?.team_home || '';
  const away = m?.metadata?.away_team || m?.metadata?.team_away || '';
  if (home && away) return `${home} — ${away}`;
  return `Wedstrijd ${String(m?.id || '').slice(0, 8)}`;
};

export function TeamHierarchyTab({
  hierarchySeasons,
  hierarchyCompetitionsBySeasonId,
  hierarchyMatchesCountBySeasonId,
  hierarchyMatchesCountByCompetitionId,
  hierarchyLoading,
  hierarchyError,
  hierarchySearch,
  setHierarchySearch,
  teamMatchesByPeriodId,
  teamMatchesLoading,
  orgKeyForRoutes,
  clubKeyForRoutes,
  teamKeyForRoutes,
}: TeamHierarchyTabProps) {
  const navigate = useNavigate();

  // ── Expand/collapse state ──
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());
  const [expandedComps, setExpandedComps] = useState<Set<string>>(new Set());

  const toggleSeason = (id: string) =>
    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleComp = (id: string) =>
    setExpandedComps((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Search filter ──
  const q = String(hierarchySearch || '').trim().toLowerCase();
  const visibleSeasons = useMemo(() => {
    if (!q) return hierarchySeasons;
    return (hierarchySeasons || []).filter((s) => {
      const seasonName = String((s as any)?.name || '').toLowerCase();
      if (seasonName.includes(q)) return true;
      const comps = hierarchyCompetitionsBySeasonId[String((s as any)?.id)] || [];
      return comps.some((c) => String((c as any)?.name || '').toLowerCase().includes(q));
    });
  }, [hierarchySeasons, hierarchyCompetitionsBySeasonId, q]);

  // Auto-expand all seasons when searching
  const effectiveExpandedSeasons = q
    ? new Set(visibleSeasons.map((s) => String(s.id)))
    : expandedSeasons;

  return (
    <div className={h.root}>
      <div className={h.searchRow}>
        <Input
          value={hierarchySearch}
          onChange={(e) => setHierarchySearch((e.target as any).value)}
          placeholder="Zoek seizoen of competitie…"
        />
      </div>

      {hierarchyError && <Alert variant="error">{hierarchyError}</Alert>}

      {hierarchyLoading && hierarchySeasons.length === 0 ? (
        <div className={h.loading}>Laden…</div>
      ) : hierarchySeasons.length === 0 ? (
        <div className={h.empty}>Geen seizoenen gevonden.</div>
      ) : (
        visibleSeasons.map((season) => {
          const sid = String((season as any)?.id ?? '').trim();
          const seasonKey = String((season as any)?.slug || sid).trim();
          const seasonPath =
            orgKeyForRoutes && clubKeyForRoutes && teamKeyForRoutes && seasonKey
              ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKeyForRoutes)}/${encodeURIComponent(seasonKey)}`
              : '';

          const competitionsAll = hierarchyCompetitionsBySeasonId[sid] || [];
          const competitions = !q
            ? competitionsAll
            : competitionsAll.filter((c) => String((c as any)?.name || '').toLowerCase().includes(q));

          const seasonMatches = hierarchyMatchesCountBySeasonId[sid] ?? 0;
          const isSeasonOpen = effectiveExpandedSeasons.has(sid);

          return (
            <div key={sid} className={h.seasonCard}>
              {/* Season header (click to expand) */}
              <button
                type="button"
                className={h.seasonHeader}
                onClick={() => toggleSeason(sid)}
              >
                <div className={h.seasonLeft}>
                  <span className={h.seasonName}>{String((season as any)?.name || 'Seizoen')}</span>
                  {seasonPath && (
                    <span
                      className={h.seasonNavLink}
                      onClick={(e) => { e.stopPropagation(); navigate(seasonPath); }}
                    >
                      Bekijk seizoen →
                    </span>
                  )}
                </div>
                <div className={h.seasonRight}>
                  <span className={h.pill}>{competitionsAll.length} comp.</span>
                  <span className={h.pill}>{seasonMatches} wed.</span>
                  <span className={`${h.chevron} ${isSeasonOpen ? h.chevronOpen : ''}`}>
                    <ChevronRight size={16} />
                  </span>
                </div>
              </button>

              {/* Season body (competitions) */}
              {isSeasonOpen && (
                <div className={h.seasonBody}>
                  {competitions.length === 0 ? (
                    <div className={h.empty}>Geen competities.</div>
                  ) : (
                    competitions.map((comp) => {
                      const cid = String((comp as any)?.id ?? '').trim();
                      const compKey = String((comp as any)?.slug || cid).trim();
                      const compPath =
                        seasonPath && compKey
                          ? `${seasonPath}/${encodeURIComponent(compKey)}`
                          : '';
                      const compMatchCount = hierarchyMatchesCountByCompetitionId[cid] ?? (comp as any)?.activities_count ?? 0;
                      const isCompOpen = expandedComps.has(cid);
                      const compMatches = teamMatchesByPeriodId[cid] || [];

                      return (
                        <div key={cid} className={h.compRow}>
                          {/* Competition header */}
                          <button
                            type="button"
                            className={h.compHeader}
                            onClick={() => toggleComp(cid)}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', minWidth: 0 }}>
                              <span className={h.compName}>{String((comp as any)?.name || 'Competitie')}</span>
                              {compPath && (
                                <span
                                  className={h.seasonNavLink}
                                  onClick={(e) => { e.stopPropagation(); navigate(compPath); }}
                                >
                                  Bekijk competitie →
                                </span>
                              )}
                            </div>
                            <div className={h.seasonRight}>
                              <span className={h.pill}>{compMatchCount} wed.</span>
                              <span className={`${h.chevron} ${isCompOpen ? h.chevronOpen : ''}`}>
                                <ChevronRight size={14} />
                              </span>
                            </div>
                          </button>

                          {/* Matches body */}
                          {isCompOpen && (
                            <div className={h.matchesBody}>
                              {teamMatchesLoading && compMatches.length === 0 ? (
                                <div className={h.loading}>Laden…</div>
                              ) : compMatches.length === 0 ? (
                                <div className={h.empty}>Geen wedstrijden.</div>
                              ) : (
                                compMatches.map((m: any) => {
                                  const mid = String(m?.id || m?.slug || '').trim();
                                  const matchPath = compPath && mid
                                    ? `${compPath}/${encodeURIComponent(m.slug || mid)}`
                                    : '';

                                  return (
                                    <button
                                      key={mid}
                                      type="button"
                                      className={h.matchRow}
                                      onClick={() => matchPath && navigate(matchPath)}
                                    >
                                      <div className={h.matchDate}>
                                        <span className={h.matchDay}>{fmtDate(m)}</span>
                                        <span className={h.matchTime}>{fmtTime(m)}</span>
                                      </div>
                                      <span className={h.matchTitle}>{matchDisplayTitle(m)}</span>
                                      {matchPath && <span className={h.matchArrow}>›</span>}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
