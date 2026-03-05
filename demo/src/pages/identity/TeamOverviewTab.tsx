import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@django-core/design-system';

import { type Organisation, type Period, type Project, type OverviewMember } from './teamDetailTypes';
import ov from './TeamOverviewTab.module.css';

interface TeamOverviewTabProps {
  hierarchySeasons: Period[];
  hierarchyCompetitionsBySeasonId: Record<string, Period[]>;
  hierarchyMatchesCountBySeasonId: Record<string, number>;
  hierarchyLoading: boolean;
  hierarchyError: string | null;
  overviewMembers: OverviewMember[];
  overviewMembersCount: number | null;
  overviewMembersLoading: boolean;
  overviewMembersError: string | null;
  orgKeyForRoutes: string;
  clubKeyForRoutes: string;
  teamKeyForRoutes: string;
  team: Project;
  club: Project;
  org: Organisation;
  makeTabHref: (tab: string) => string;
}

export function TeamOverviewTab({
  hierarchySeasons,
  hierarchyCompetitionsBySeasonId,
  hierarchyMatchesCountBySeasonId,
  hierarchyLoading,
  hierarchyError,
  overviewMembers,
  overviewMembersCount,
  overviewMembersLoading,
  overviewMembersError,
  orgKeyForRoutes,
  clubKeyForRoutes,
  teamKeyForRoutes,
  team,
  club,
  org,
  makeTabHref,
}: TeamOverviewTabProps) {
  const navigate = useNavigate();

  const totalCompetitions = Object.values(hierarchyCompetitionsBySeasonId || {}).reduce(
    (sum, list) => sum + (list?.length || 0), 0,
  );

  const totalMatches = Object.values(hierarchyMatchesCountBySeasonId || {}).reduce(
    (sum, n) => sum + (typeof n === 'number' ? n : 0), 0,
  );

  const getInitials = (m: OverviewMember) => {
    const f = String(m?.first_name || '').trim();
    const l = String(m?.last_name || '').trim();
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    if (f) return f[0].toUpperCase();
    if (m?.email) return m.email[0].toUpperCase();
    return '?';
  };

  const getLabel = (m: OverviewMember) => {
    const name = `${String(m?.first_name || '').trim()} ${String(m?.last_name || '').trim()}`.trim();
    return name || String(m?.email || '').trim() || `User ${m.id}`;
  };

  // Flat list of competitions across seasons
  const allCompetitions: Array<{ season: Period; comp: Period }> = [];
  for (const season of hierarchySeasons || []) {
    const sid = String((season as any)?.id ?? '').trim();
    const comps = hierarchyCompetitionsBySeasonId[sid] || [];
    for (const c of comps || []) allCompetitions.push({ season, comp: c });
  }

  return (
    <div className={ov.overviewRoot}>
      {hierarchyError && <Alert variant="error">{hierarchyError}</Alert>}
      {overviewMembersError && <Alert variant="error">{overviewMembersError}</Alert>}

      {/* ── Hero card ── */}
      <div className={ov.heroCard}>
        <div className={ov.heroTitle}>{team?.name || 'Team'}</div>
        <div className={ov.heroSubtitle}>
          {club?.name || 'Club'} &middot; {org?.name || 'Federatie'}
        </div>
        <div className={ov.heroStats}>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>
              {overviewMembersLoading ? '…' : overviewMembersCount ?? '—'}
            </span>
            <span className={ov.heroStatLabel}>Leden</span>
          </div>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>
              {hierarchyLoading ? '…' : hierarchySeasons.length}
            </span>
            <span className={ov.heroStatLabel}>Seizoenen</span>
          </div>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>
              {hierarchyLoading ? '…' : totalMatches}
            </span>
            <span className={ov.heroStatLabel}>Wedstrijden</span>
          </div>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>
              {hierarchyLoading ? '…' : totalCompetitions}
            </span>
            <span className={ov.heroStatLabel}>Competities</span>
          </div>
        </div>
      </div>

      {/* ── Seasons ── */}
      <div className={ov.sectionCard}>
        <div className={ov.sectionHeader}>
          <h3 className={ov.sectionTitle}>Seizoenen</h3>
          <button className={ov.sectionLink} onClick={() => navigate(makeTabHref('seasons'))}>
            Alle seizoenen →
          </button>
        </div>
        {hierarchyLoading && hierarchySeasons.length === 0 ? (
          <div className={ov.loadingText}>Laden…</div>
        ) : hierarchySeasons.length === 0 ? (
          <div className={ov.emptyText}>Geen seizoenen gevonden.</div>
        ) : (
          <div className={ov.seasonList}>
            {hierarchySeasons.slice(0, 6).map((season) => {
              const seasonKey = String((season as any)?.slug || (season as any)?.id || '').trim();
              const matchCount = hierarchyMatchesCountBySeasonId[String((season as any)?.id)] || 0;
              const compCount = (hierarchyCompetitionsBySeasonId[String((season as any)?.id)] || []).length;
              const seasonPath =
                orgKeyForRoutes && clubKeyForRoutes && teamKeyForRoutes && seasonKey
                  ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKeyForRoutes)}/${encodeURIComponent(seasonKey)}`
                  : '';

              return (
                <button
                  key={String((season as any)?.id)}
                  type="button"
                  className={ov.seasonRow}
                  onClick={() => seasonPath && navigate(seasonPath)}
                  style={{ background: 'none', border: 'none', cursor: seasonPath ? 'pointer' : 'default', font: 'inherit', textAlign: 'left', width: '100%' }}
                >
                  <div className={ov.seasonInfo}>
                    <span className={ov.seasonName}>{String((season as any)?.name || 'Season')}</span>
                    <span className={ov.seasonMeta}>
                      {compCount} competitie{compCount !== 1 ? 's' : ''} · {matchCount} wedstrijd{matchCount !== 1 ? 'en' : ''}
                    </span>
                  </div>
                  {seasonPath && <span className={ov.seasonArrow}>›</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Competitions ── */}
      {allCompetitions.length > 0 && (
        <div className={ov.sectionCard}>
          <div className={ov.sectionHeader}>
            <h3 className={ov.sectionTitle}>Competities</h3>
            <button className={ov.sectionLink} onClick={() => navigate(makeTabHref('competitions'))}>
              Bekijk alle →
            </button>
          </div>
          <div className={ov.compList}>
            {allCompetitions.slice(0, 6).map(({ season, comp }) => {
              const compPath = (() => {
                const seasonKey = String((season as any)?.slug || (season as any)?.id || '').trim();
                const compKey = String((comp as any)?.slug || (comp as any)?.id || '').trim();
                return orgKeyForRoutes && clubKeyForRoutes && teamKeyForRoutes && seasonKey && compKey
                  ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKeyForRoutes)}/${encodeURIComponent(seasonKey)}/${encodeURIComponent(compKey)}`
                  : '';
              })();
              return (
                <button
                  key={String((comp as any)?.id)}
                  type="button"
                  className={ov.compRow}
                  onClick={() => compPath && navigate(compPath)}
                  style={{ background: 'none', border: 'none', cursor: compPath ? 'pointer' : 'default', font: 'inherit', textAlign: 'left', width: '100%' }}
                >
                  <div className={ov.compInfo}>
                    <span className={ov.compName}>{String((comp as any)?.name || 'Competition')}</span>
                    <span className={ov.compSport}>
                      {String((season as any)?.name || '')}
                    </span>
                  </div>
                  {compPath && <span className={ov.seasonArrow}>›</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Members ── */}
      <div className={ov.sectionCard}>
        <div className={ov.sectionHeader}>
          <h3 className={ov.sectionTitle}>Leden</h3>
          <button className={ov.sectionLink} onClick={() => navigate(makeTabHref('members'))}>
            Alle leden →
          </button>
        </div>
        {overviewMembersLoading && overviewMembers.length === 0 ? (
          <div className={ov.loadingText}>Laden…</div>
        ) : overviewMembers.length === 0 ? (
          <div className={ov.emptyText}>Geen leden gevonden.</div>
        ) : (
          <div className={ov.memberList}>
            {overviewMembers.slice(0, 8).map((m) => (
              <div key={String(m.id)} className={ov.memberRow}>
                <div className={ov.memberAvatar}>{getInitials(m)}</div>
                <span className={ov.memberName}>{getLabel(m)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Team details ── */}
      <div className={ov.sectionCard}>
        <div className={ov.sectionHeader}>
          <h3 className={ov.sectionTitle}>Team details</h3>
        </div>
        <div className={ov.detailList}>
          <div className={ov.detailRow}>
            <span className={ov.detailLabel}>Naam</span>
            <span className={ov.detailValue}>{team?.name || '—'}</span>
          </div>
          <div className={ov.detailRow}>
            <span className={ov.detailLabel}>Club</span>
            <span className={ov.detailValue}>{club?.name || '—'}</span>
          </div>
          <div className={ov.detailRow}>
            <span className={ov.detailLabel}>Federatie</span>
            <span className={ov.detailValue}>{org?.name || '—'}</span>
          </div>
          <div className={ov.detailRow}>
            <span className={ov.detailLabel}>Slug</span>
            <span className={ov.detailValue}>{String((team as any)?.slug || '—')}</span>
          </div>
          <div className={ov.detailRow}>
            <span className={ov.detailLabel}>Type</span>
            <span className={ov.detailValue}>
              {(team as any)?.team_type === 'legends' ? 'Legends' : 'Regulier'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
