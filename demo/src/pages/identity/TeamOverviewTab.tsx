import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@django-core/design-system';
import { CheckCircle2, Circle } from 'lucide-react';
import SlotIcon from '../../components/SlotIcon';

import { type Organisation, type Period, type Project, type OverviewMember } from './teamDetailTypes';
import ov from './TeamOverviewTab.module.css';

interface AssetStat {
  id: string;
  label: string;
  icon?: string;
  done: number;
  total: number;
  pct: number;
}

interface BrandAssetItem {
  label: string;
  present: boolean;
}

/** Match / activity record */
interface MatchRecord {
  id?: string | number;
  slug?: string;
  name?: string;
  date?: string;
  start_time?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface HierarchyData {
  seasons: Period[];
  competitionsBySeasonId: Record<string, Period[]>;
  matchesCountBySeasonId: Record<string, number>;
  loading: boolean;
  error: string | null;
}

export interface OverviewMembersData {
  members: OverviewMember[];
  count: number | null;
  loading: boolean;
  error: string | null;
}

export interface RouteKeys {
  orgKey: string;
  clubKey: string;
  teamKey: string;
}

export interface BrandContentData {
  brandAssets: BrandAssetItem[];
  assetStats: AssetStat[];
  fullMembersLoading: boolean;
  contentCount: number | null;
  contentCountLoading: boolean;
}

export interface TeamMatchData {
  matches: MatchRecord[];
  loading: boolean;
}

interface TeamOverviewTabProps {
  hierarchy: HierarchyData;
  overviewMembers: OverviewMembersData;
  routeKeys: RouteKeys;
  team: Project;
  club: Project;
  org: Organisation;
  makeTabHref: (tab: string) => string;
  brand: BrandContentData;
  matchData: TeamMatchData;
}

export function TeamOverviewTab({
  hierarchy,
  overviewMembers,
  routeKeys,
  team,
  club,
  org,
  makeTabHref,
  brand,
  matchData,
}: TeamOverviewTabProps) {
  const navigate = useNavigate();

  const { seasons: hierarchySeasons, competitionsBySeasonId: hierarchyCompetitionsBySeasonId, matchesCountBySeasonId: hierarchyMatchesCountBySeasonId, loading: hierarchyLoading, error: hierarchyError } = hierarchy;
  const { members: overviewMembersList, count: overviewMembersCount, loading: overviewMembersLoading, error: overviewMembersError } = overviewMembers;
  const { orgKey: orgKeyForRoutes, clubKey: clubKeyForRoutes, teamKey: teamKeyForRoutes } = routeKeys;
  const { brandAssets, assetStats, fullMembersLoading, contentCount, contentCountLoading } = brand;
  const { matches: teamMatches, loading: teamMatchesLoading } = matchData;

  const totalCompetitions = Object.values(hierarchyCompetitionsBySeasonId || {}).reduce(
    (sum, list) => sum + (list?.length || 0), 0,
  );

  // Compute overall assets % from tracked slots
  const overallAssetPct = (() => {
    if (!assetStats.length) return 0;
    const totalDone = assetStats.reduce((s, a) => s + a.done, 0);
    const totalAll = assetStats.reduce((s, a) => s + a.total, 0);
    return totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;
  })();

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

  // ── Recent matches (past, sorted most recent first) ──
  const recentMatches = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return teamMatches
      .filter((m) => {
        const d = m.start_time || m.date || m.metadata?.date;
        if (!d) return false;
        return new Date(d) < now;
      })
      .sort((a, b) => {
        const da = new Date(a.start_time || a.date || a.metadata?.date).getTime();
        const db = new Date(b.start_time || b.date || b.metadata?.date).getTime();
        return db - da;
      })
      .slice(0, 4);
  }, [teamMatches]);

  // ── Upcoming matches (future or today, sorted soonest first) ──
  const upcomingMatches = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return teamMatches
      .filter((m) => {
        const d = m.start_time || m.date || m.metadata?.date;
        if (!d) return false;
        return new Date(d) >= now;
      })
      .sort((a, b) => {
        const da = new Date(a.start_time || a.date || a.metadata?.date).getTime();
        const db = new Date(b.start_time || b.date || b.metadata?.date).getTime();
        return da - db;
      })
      .slice(0, 3);
  }, [teamMatches]);

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

  const matchDisplayTitle = (m: any): string => {
    const name = String(m?.name || '').trim();
    if (name) return name;
    const home = m?.metadata?.home_team || m?.metadata?.team_home || '';
    const away = m?.metadata?.away_team || m?.metadata?.team_away || '';
    if (home && away) return `${home} — ${away}`;
    return `Wedstrijd ${String(m?.id || '').slice(0, 8)}`;
  };

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
              {contentCountLoading ? '…' : contentCount ?? 0}
            </span>
            <span className={ov.heroStatLabel}>Content</span>
          </div>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>
              {fullMembersLoading ? '…' : `${overallAssetPct}%`}
            </span>
            <span className={ov.heroStatLabel}>Assets</span>
          </div>
        </div>
      </div>

      {/* ── Brand assets checklist ── */}
      {brandAssets.length > 0 && (
        <div className={ov.sectionCard}>
          <div className={ov.sectionHeader}>
            <h3 className={ov.sectionTitle}>Club assets</h3>
            <button className={ov.sectionLink} onClick={() => navigate(makeTabHref('identity'))}>
              Beheer →
            </button>
          </div>
          <div className={ov.brandGrid}>
            {brandAssets.map((a) => (
              <div key={a.label} className={ov.brandItem} data-present={a.present ? 'true' : 'false'}>
                <span className={`${ov.brandIcon} ${a.present ? 'status-success' : 'status-muted'}`}>
                  {a.present ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                </span>
                <span className={ov.brandLabel}>{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Media assets progress ── */}
      {assetStats.length > 0 && assetStats[0].total > 0 && (
        <div className={ov.sectionCard}>
          <div className={ov.sectionHeader}>
            <h3 className={ov.sectionTitle}>Media assets</h3>
            <button className={ov.sectionLink} onClick={() => navigate(makeTabHref('media'))}>
              Media matrix →
            </button>
          </div>
          {fullMembersLoading ? (
            <div className={ov.loadingText}>Laden…</div>
          ) : (
            <div className={ov.assetList}>
              {assetStats.map((slot) => (
                <div key={slot.id} className={ov.assetRow}>
                  <div className={ov.assetInfo}>
                    <span className={ov.assetIcon}><SlotIcon name={slot.icon || ''} size={14} /></span>
                    <span className={ov.assetLabel}>{slot.label}</span>
                  </div>
                  <div className={ov.assetRight}>
                    <span className={ov.assetCount}>{slot.done}/{slot.total}</span>
                  </div>
                  <div className={ov.progressTrack}>
                    <div
                      className={ov.progressFill}
                      style={{ width: `${slot.pct}%` }}
                      data-complete={slot.pct === 100 ? 'true' : 'false'}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Per-seizoen breakdown ── */}
      <div className={ov.sectionCard}>
        <div className={ov.sectionHeader}>
          <h3 className={ov.sectionTitle}>Seizoenen</h3>
          <button className={ov.sectionLink} onClick={() => navigate(makeTabHref('hierarchy'))}>
            Alle seizoenen →
          </button>
        </div>
        {hierarchyLoading && hierarchySeasons.length === 0 ? (
          <div className={ov.loadingText}>Laden…</div>
        ) : hierarchySeasons.length === 0 ? (
          <div className={ov.emptyText}>Geen seizoenen gevonden.</div>
        ) : (
          <div className={ov.breakdownTable}>
            <div className={ov.breakdownHeader}>
              <span className={ov.breakdownColName}>Seizoen</span>
              <span className={ov.breakdownCol}>Comp.</span>
              <span className={ov.breakdownCol}>Wedstr.</span>
            </div>
            {hierarchySeasons.slice(0, 8).map((season) => {
              const sid = String(season?.id ?? '').trim();
              const seasonKey = String(season?.slug || sid).trim();
              const matchCount = hierarchyMatchesCountBySeasonId[sid] || 0;
              const compCount = (hierarchyCompetitionsBySeasonId[sid] || []).length;
              const seasonPath =
                orgKeyForRoutes && clubKeyForRoutes && teamKeyForRoutes && seasonKey
                  ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKeyForRoutes)}/${encodeURIComponent(seasonKey)}`
                  : '';

              return (
                <button
                  key={sid}
                  type="button"
                  className={ov.breakdownRow}
                  onClick={() => seasonPath && navigate(seasonPath)}
                >
                  <span className={ov.breakdownColName}>{String(season?.name || 'Season')}</span>
                  <span className={ov.breakdownCol}>{compCount}</span>
                  <span className={ov.breakdownCol}>{matchCount}</span>
                  {seasonPath && <span className={ov.breakdownArrow}>›</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Upcoming matches ── */}
      {(upcomingMatches.length > 0 || teamMatchesLoading) && (
        <div className={ov.sectionCard}>
          <div className={ov.sectionHeader}>
            <h3 className={ov.sectionTitle}>Aankomend</h3>
            <button className={ov.sectionLink} onClick={() => navigate(makeTabHref('hierarchy'))}>
              Alle wedstrijden →
            </button>
          </div>
          {teamMatchesLoading ? (
            <div className={ov.loadingText}>Laden…</div>
          ) : (
            <div className={ov.matchList}>
              {upcomingMatches.map((m) => (
                <div key={m.id} className={ov.matchRow}>
                  <div className={ov.matchDate}>
                    <span className={ov.matchDay}>{fmtDate(m)}</span>
                    <span className={ov.matchTime}>{fmtTime(m)}</span>
                  </div>
                  <span className={ov.matchTitle}>{matchDisplayTitle(m)}</span>
                  <span className={ov.matchArrow}>›</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Recent results ── */}
      {recentMatches.length > 0 && (
        <div className={ov.sectionCard}>
          <div className={ov.sectionHeader}>
            <h3 className={ov.sectionTitle}>Recente wedstrijden</h3>
          </div>
          <div className={ov.matchList}>
            {recentMatches.map((m) => (
              <div key={m.id} className={ov.matchRow}>
                <div className={ov.matchDate}>
                  <span className={ov.matchDay}>{fmtDate(m)}</span>
                </div>
                <span className={ov.matchTitle}>{matchDisplayTitle(m)}</span>
                <span className={ov.matchArrow}>›</span>
              </div>
            ))}
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
        {overviewMembersLoading && overviewMembersList.length === 0 ? (
          <div className={ov.loadingText}>Laden…</div>
        ) : overviewMembersList.length === 0 ? (
          <div className={ov.emptyText}>Geen leden gevonden.</div>
        ) : (
          <div className={ov.memberList}>
            {overviewMembersList.slice(0, 8).map((m) => (
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
            <span className={ov.detailLabel}>Competities</span>
            <span className={ov.detailValue}>{hierarchyLoading ? '…' : totalCompetitions}</span>
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
