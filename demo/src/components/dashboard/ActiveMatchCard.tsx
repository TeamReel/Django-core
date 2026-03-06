/**
 * ActiveMatchCard — Shows the most relevant match (closest to now).
 *
 * Logic: fetch recent past + near future matches, pick the one whose
 * start_time is closest to Date.now(). This ensures match-day content
 * creation always has the right match in focus.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, ChevronRight, MapPin, Clock, CheckCircle2,
  Circle, Trophy, Sparkles, Calendar,
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/apiBase';
import { formatRelativeTime, getDateUrgency } from '../../utils/relativeTime';
import styles from './ActiveMatchCard.module.css';

/* ── Helpers ─────────────────────────────────────────────────────────── */

/** Safely extract array from any paginated API response */
function extractItems<T = any>(json: any): T[] {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.data)) return json.data;
  if (json && Array.isArray(json.results)) return json.results;
  return [];
}

/* ── Types ──────────────────────────────────────────────────────────── */

interface Match {
  id: string;
  title: string;
  slug?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  project: { id: string; name: string; slug?: string; club_name?: string };
  opponent_project?: { name: string; slug?: string; club_name?: string };
  metadata: Record<string, any>;
  period?: { id: string; name: string };
}

/* ── Component ─────────────────────────────────────────────────────── */

export const ActiveMatchCard: React.FC = () => {
  const [match, setMatch] = useState<Match | null>(null);
  const [contentCount, setContentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const now = new Date().toISOString();

        // Fetch both recent past and near future matches in parallel
        const [pastRes, futureRes] = await Promise.all([
          fetch(
            `${apiBaseUrl}/api/v1/activities/?activity_type=match&start_time__lte=${encodeURIComponent(now)}&ordering=-start_time&page_size=3`,
            { credentials: 'include', headers: { 'Content-Type': 'application/json' } },
          ),
          fetch(
            `${apiBaseUrl}/api/v1/activities/?activity_type=match&start_time__gte=${encodeURIComponent(now)}&ordering=start_time&page_size=3`,
            { credentials: 'include', headers: { 'Content-Type': 'application/json' } },
          ),
        ]);

        const pastMatches = pastRes.ok ? extractItems<Match>(await pastRes.json()) : [];
        const futureMatches = futureRes.ok ? extractItems<Match>(await futureRes.json()) : [];
        const all = [...pastMatches, ...futureMatches];

        if (all.length === 0) {
          if (!cancelled) setMatch(null);
          return;
        }

        // Pick match closest to now
        const nowMs = Date.now();
        const closest = all.reduce((best, m) => {
          const diff = Math.abs(new Date(m.start_time).getTime() - nowMs);
          const bestDiff = Math.abs(new Date(best.start_time).getTime() - nowMs);
          return diff < bestDiff ? m : best;
        });

        if (!cancelled) setMatch(closest);

        // Count content items for this match
        if (closest) {
          const mediaRes = await fetch(
            `${apiBaseUrl}/api/v1/media/items/?activity=${closest.id}&page_size=1`,
            { credentials: 'include', headers: { 'Content-Type': 'application/json' } },
          );
          if (mediaRes.ok) {
            const mediaData = await mediaRes.json();
            const count = mediaData?.meta?.pagination?.count ?? extractItems(mediaData).length;
            if (!cancelled) setContentCount(count);
          }
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [apiBaseUrl]);

  // Derived state
  const matchState = useMemo(() => {
    if (!match) return null;
    const now = Date.now();
    const start = new Date(match.start_time).getTime();
    const end = match.end_time ? new Date(match.end_time).getTime() : start + 2 * 60 * 60 * 1000;

    if (now >= start && now <= end) return 'live' as const;
    if (now < start) return 'upcoming' as const;
    return 'played' as const;
  }, [match]);

  // Prefer club name (parent_project) over team name
  const teamName = match?.project?.club_name || match?.project?.name || 'Team';
  const opponent = match?.opponent_project?.club_name || match?.opponent_project?.name || match?.title?.split(' vs ')?.[1] || 'Tegenstander';

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (!match) {
    return (
      <div className={styles.card}>
        <div className={styles.emptyState}>
          <Calendar size={24} />
          <span>Geen wedstrijden gevonden</span>
        </div>
      </div>
    );
  }

  const date = new Date(match.start_time);
  const relTime = formatRelativeTime(date, 'nl');
  const urgency = getDateUrgency(date);
  const score = match.metadata?.score || match.metadata?.final_score;
  const isHome = match.metadata?.is_home !== false;

  return (
    <div
      className={`${styles.card} ${styles[matchState || '']}`}
      onClick={() => navigate(`/matches/${match.slug || match.id}`, { state: { from: 'dashboard' } })}
      role="button"
      tabIndex={0}
    >
      {/* Status badge */}
      <div className={styles.topRow}>
        <span className={`${styles.badge} ${styles[`badge_${matchState}`]}`}>
          {matchState === 'live' ? <><Circle size={8} fill="currentColor" /> LIVE</> : matchState === 'upcoming' ? 'Aankomend' : 'Gespeeld'}
        </span>
        <span className={`${styles.timeLabel} ${styles[`time_${urgency}`]}`}>
          {relTime}
        </span>
      </div>

      {/* Match teams */}
      <div className={styles.matchRow}>
        <div className={styles.teamSide}>
          <span className={styles.teamName}>{isHome ? teamName : opponent}</span>
        </div>

        <div className={styles.scoreBox}>
          {score ? (
            <span className={styles.score}>{score}</span>
          ) : (
            <span className={styles.vsLabel}>vs</span>
          )}
        </div>

        <div className={`${styles.teamSide} ${styles.teamRight}`}>
          <span className={styles.teamName}>{isHome ? opponent : teamName}</span>
        </div>
      </div>

      {/* Meta row */}
      <div className={styles.metaRow}>
        {match.location && (
          <span className={styles.metaItem}>
            <MapPin size={12} /> {match.location}
          </span>
        )}
        {match.metadata?.venue && !match.location && (
          <span className={styles.metaItem}>
            <MapPin size={12} /> {match.metadata.venue}
          </span>
        )}
        <span className={styles.metaItem}>
          <Clock size={12} />
          {date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
          {' '}
          {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Action row */}
      <div className={styles.actionRow}>
        <span className={styles.contentBadge}>
          {contentCount > 0 ? (
            <><CheckCircle2 size={14} /> {contentCount} items</>
          ) : (
            <><Circle size={14} /> Nog geen content</>
          )}
        </span>

        <button
          className={styles.actionBtn}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/matches/${match.slug || match.id}`, { state: { from: 'dashboard' } });
          }}
        >
          {matchState === 'upcoming' ? (
            <><Sparkles size={14} /> Voorbereiden</>
          ) : (
            <><Zap size={14} /> Content maken</>
          )}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
