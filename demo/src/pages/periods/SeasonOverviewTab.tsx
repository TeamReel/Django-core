import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { MEDIA_SLOTS } from '../../constants/mediaSlots';
import { getMediaProcessingState } from '../../utils/mediaHelpers';
import { periodPathKey } from '../../utils/periodPath';
import type { Period } from '../../types/season';
import ov from './SeasonOverviewTab.module.css';

export interface SeasonOverviewTabProps {
  season: Period | null;
  competitions: Period[];
  members: any[];
  matches: any[];
  matchesLoading: boolean;
  navigateToTab: (tabId: string) => void;
  isTeamRoute: boolean;
  seasonsBasePath: string;
  seasonPathKey: string;
  matchDisplayTitle: (m: any) => string;
}

/** Slots we track on the overview (the most important ones) */
const TRACKED_SLOTS = MEDIA_SLOTS.filter(
  (s) => ['profile', 'kit', 'closeup', 'intro', 'celebration'].includes(s.id)
);

const SeasonOverviewTab: React.FC<SeasonOverviewTabProps> = ({
  season,
  competitions,
  members,
  matches,
  matchesLoading,
  navigateToTab,
  isTeamRoute,
  seasonsBasePath,
  seasonPathKey,
  matchDisplayTitle,
}) => {
  const startDate = season?.start_date
    ? new Date(season.start_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const endDate = season?.end_date
    ? new Date(season.end_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  // ── Asset completion per slot ──
  const assetStats = useMemo(() => {
    const total = members.length;
    return TRACKED_SLOTS.map((slot) => {
      const done = members.filter((m) => {
        const state = getMediaProcessingState(m, slot.id);
        return state === 'processed' || state === 'raw';
      }).length;
      return { ...slot, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
    });
  }, [members]);

  // ── Upcoming matches (future or today, sorted soonest first) ──
  const upcomingMatches = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return matches
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
  }, [matches]);

  // ── Recent results (past, sorted most recent first) ──
  const recentMatches = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return matches
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
      .slice(0, 2);
  }, [matches]);

  /** Build a match URL */
  const matchUrl = (m: any) => {
    const compId = String(m.period_id || m.period?.id || m.period || '').trim();
    const compKey = periodPathKey(m.period || null) || compId;
    const matchKey = m.slug || m.id;
    return isTeamRoute
      ? `${seasonsBasePath}/${seasonPathKey}/${compKey}/${String(matchKey)}`
      : `/matches/${String(matchKey)}`;
  };

  /** Format a match date nicely */
  const fmtDate = (m: any) => {
    const raw = m.start_time || m.date || m.metadata?.date;
    if (!raw) return '—';
    const d = new Date(raw);
    return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const fmtTime = (m: any) => {
    const raw = m.start_time || m.date || m.metadata?.date;
    if (!raw) return '';
    const d = new Date(raw);
    return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={ov.overviewRoot}>
      {/* ── Hero card ── */}
      <div className={ov.heroCard}>
        <div className={ov.heroTitle}>{season?.name || 'Seizoen'}</div>
        <div className={ov.heroDates}>
          <Calendar size={14} />
          {startDate} — {endDate}
        </div>
        <div className={ov.heroStats}>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>{competitions.length}</span>
            <span className={ov.heroStatLabel}>Competities</span>
          </div>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>{matches.length}</span>
            <span className={ov.heroStatLabel}>Wedstrijden</span>
          </div>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>{members.length}</span>
            <span className={ov.heroStatLabel}>Selectie</span>
          </div>
        </div>
      </div>

      {/* ── Asset readiness ── */}
      {members.length > 0 && (
        <div className={ov.sectionCard}>
          <div className={ov.sectionHeader}>
            <h3 className={ov.sectionTitle}>Media assets</h3>
            <button className={ov.sectionLink} onClick={() => navigateToTab('media')}>
              Media matrix →
            </button>
          </div>
          <div className={ov.assetList}>
            {assetStats.map((slot) => (
              <div key={slot.id} className={ov.assetRow}>
                <div className={ov.assetInfo}>
                  <span className={ov.assetIcon}>{slot.icon}</span>
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
        </div>
      )}

      {/* ── Upcoming matches ── */}
      {(upcomingMatches.length > 0 || matchesLoading) && (
        <div className={ov.sectionCard}>
          <div className={ov.sectionHeader}>
            <h3 className={ov.sectionTitle}>Aankomend</h3>
            <button className={ov.sectionLink} onClick={() => navigateToTab('matches')}>
              Alle wedstrijden →
            </button>
          </div>
          {matchesLoading ? (
            <div className={ov.loadingRow}>Laden…</div>
          ) : (
            <div className={ov.matchList}>
              {upcomingMatches.map((m) => (
                <Link key={m.id} to={matchUrl(m)} className={ov.matchRow}>
                  <div className={ov.matchDate}>
                    <span className={ov.matchDay}>{fmtDate(m)}</span>
                    <span className={ov.matchTime}>{fmtTime(m)}</span>
                  </div>
                  <span className={ov.matchTitle}>{matchDisplayTitle(m)}</span>
                  <span className={ov.matchArrow}>›</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Recent results ── */}
      {recentMatches.length > 0 && (
        <div className={ov.sectionCard}>
          <div className={ov.sectionHeader}>
            <h3 className={ov.sectionTitle}>Recente resultaten</h3>
          </div>
          <div className={ov.matchList}>
            {recentMatches.map((m) => (
              <Link key={m.id} to={matchUrl(m)} className={ov.matchRow}>
                <div className={ov.matchDate}>
                  <span className={ov.matchDay}>{fmtDate(m)}</span>
                </div>
                <span className={ov.matchTitle}>{matchDisplayTitle(m)}</span>
                <span className={ov.matchArrow}>›</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Competitions preview ── */}
      {competitions.length > 0 && (
        <div className={ov.sectionCard}>
          <div className={ov.sectionHeader}>
            <h3 className={ov.sectionTitle}>Competities</h3>
            <button className={ov.sectionLink} onClick={() => navigateToTab('competitions')}>
              Bekijk alle →
            </button>
          </div>
          <div className={ov.compList}>
            {competitions.slice(0, 5).map((comp) => (
              <div key={comp.id} className={ov.compRow}>
                <div className={ov.compInfo}>
                  <span className={ov.compName}>{comp.name}</span>
                  {comp.sport && (
                    <span className={ov.compSport}>
                      {comp.sport.sport_icon} {comp.sport.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonOverviewTab;
