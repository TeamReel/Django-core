/**
 * NextMatchHero — Hero card for the next upcoming match with readiness ring,
 * content checklist, and quick-generate CTA.
 *
 * Designed for the dashboard — the single most important element to drive
 * content creation and fast navigation.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, ChevronRight, MapPin, Clock, CheckCircle2,
  Circle, Loader2, AlertCircle, Sparkles,
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/apiBase';
import { formatRelativeTime, getDateUrgency } from '../../utils/relativeTime';
import { CONTENT_TYPES } from '../../pages/identity/ContentGenerationModal';
import { SkeletonCard } from '../Skeleton';
import styles from './NextMatchHero.module.css';

/* ── Types ─────────────────────────────────────────────────────────── */

interface Match {
  id: string;
  title: string;
  slug?: string;
  start_time: string;
  project: { id: string; name: string };
  opponent_project?: { name: string };
  metadata: { venue?: string; lineup?: any; formation?: string };
}

interface MediaItem {
  id: string;
  extraction_metadata?: { asset_type?: string };
  created_at?: string;
}

/* ── Content subtypes for readiness score ───────────────────────────── */

const MATCH_CONTENT_ITEMS = [
  ...CONTENT_TYPES.pre_match.items,
  ...CONTENT_TYPES.during_match.items,
  ...CONTENT_TYPES.post_match.items,
];

/** Normalize media asset_type to our subtype keys */
function normalizeAssetType(raw: string): string {
  const map: Record<string, string> = {
    match_flyer: 'flyer',
    goal_celebration: 'goal',
    final_score: 'end_score',
    score: 'end_score',
    walkon_video: 'walkon',
    walk_on: 'walkon',
    anthem_video: 'anthem',
    lineup_video: 'lineup',
    highlight: 'highlights',
    highlights_reel: 'highlights',
  };
  const key = raw.toLowerCase().replace(/[\s-]/g, '_');
  return map[key] || key;
}

/* ── Readiness Ring (SVG) ──────────────────────────────────────────── */

const ReadinessRing: React.FC<{ percent: number; size?: number }> = ({
  percent,
  size = 72,
}) => {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const color =
    percent >= 70
      ? 'var(--color-success, #22c55e)'
      : percent >= 30
        ? 'var(--color-warning, #f59e0b)'
        : 'var(--color-error, #ef4444)';

  return (
    <div className={styles.ringWrap} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--app-border)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={styles.ringProgress}
        />
      </svg>
      <span className={styles.ringLabel}>{percent}%</span>
    </div>
  );
};

/* ── Content Checklist Row ─────────────────────────────────────────── */

const ChecklistItem: React.FC<{
  label: string;
  status: 'done' | 'generating' | 'missing';
}> = ({ label, status }) => {
  const icon =
    status === 'done' ? (
      <CheckCircle2 size={14} className={styles.checkDone} />
    ) : status === 'generating' ? (
      <Loader2 size={14} className={styles.checkGenerating} />
    ) : (
      <Circle size={14} className={styles.checkMissing} />
    );

  return (
    <span className={styles.checkItem} data-status={status}>
      {icon}
      <span>{label}</span>
    </span>
  );
};

/* ── Main Component ────────────────────────────────────────────────── */

export const NextMatchHero: React.FC = () => {
  const [match, setMatch] = useState<Match | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const apiBaseUrl = getApiBaseUrl();

  // Fetch next upcoming match
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const now = new Date().toISOString();
        const res = await fetch(
          `${apiBaseUrl}/api/v1/activities/?activity_type=match&start_time__gte=${encodeURIComponent(now)}&ordering=start_time&page_size=1`,
          { credentials: 'include', headers: { 'Content-Type': 'application/json' } },
        );
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        const items = data.data || data.results || [];
        const m = items[0] ?? null;
        if (!cancelled) setMatch(m);

        // If we have a match, fetch its media items to compute readiness
        if (m) {
          const mediaRes = await fetch(
            `${apiBaseUrl}/api/v1/media/items/?activity=${m.id}&page_size=100`,
            { credentials: 'include', headers: { 'Content-Type': 'application/json' } },
          );
          if (mediaRes.ok) {
            const mediaData = await mediaRes.json();
            if (!cancelled) setMediaItems(mediaData.data || mediaData.results || []);
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

  // Compute readiness
  const { percent, checklist } = useMemo(() => {
    const doneTypes = new Set<string>();
    for (const mi of mediaItems) {
      const raw = mi.extraction_metadata?.asset_type;
      if (raw) doneTypes.add(normalizeAssetType(raw));
    }

    const list = MATCH_CONTENT_ITEMS.map((item) => ({
      label: item.label,
      subtype: item.subtype,
      status: doneTypes.has(item.subtype)
        ? ('done' as const)
        : ('missing' as const),
    }));

    const done = list.filter((i) => i.status === 'done').length;
    const total = list.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    return { percent: pct, checklist: list };
  }, [mediaItems]);

  // Loading skeleton
  if (loading) {
    return (
      <div className={styles.heroSkeleton}>
        <SkeletonCard lines={3} />
      </div>
    );
  }

  // No upcoming match
  if (!match) {
    return (
      <div className={styles.emptyHero}>
        <AlertCircle size={28} className={styles.emptyIcon} />
        <div>
          <div className={styles.emptyTitle}>Geen komende wedstrijd</div>
          <div className={styles.emptyDesc}>
            Voeg een wedstrijd toe om content te genereren.
          </div>
        </div>
      </div>
    );
  }

  const date = new Date(match.start_time);
  const opponent = match.opponent_project?.name || match.title.replace(/^(vs |@ )/, '');
  const relativeTime = formatRelativeTime(date, 'nl');
  const urgency = getDateUrgency(date);
  const dateLabel = date.toLocaleDateString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeLabel = date.toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const venue = match.metadata?.venue;

  const matchUrl = `/matches/${match.slug || match.id}`;
  const contentUrl = `${matchUrl}?tab=content`;

  const doneCount = checklist.filter((c) => c.status === 'done').length;
  const totalCount = checklist.length;

  return (
    <div className={styles.hero}>
      {/* Top bar: urgency badge */}
      <div className={styles.heroTopBar}>
        <span className={styles.urgencyBadge} data-urgency={urgency}>
          <Clock size={12} />
          {relativeTime}
        </span>
        <span className={styles.dateLabel}>{dateLabel} · {timeLabel}</span>
      </div>

      {/* Main row: match info + readiness ring */}
      <div
        className={styles.heroMain}
        onClick={() => navigate(matchUrl)}
        role="button"
        tabIndex={0}
      >
        <div className={styles.heroInfo}>
          <div className={styles.opponentName}>vs {opponent}</div>
          <div className={styles.teamName}>{match.project.name}</div>
          {venue && (
            <div className={styles.venue}>
              <MapPin size={12} /> {venue}
            </div>
          )}
        </div>
        <ReadinessRing percent={percent} size={72} />
      </div>

      {/* Content readiness summary */}
      <div className={styles.readinessSummary}>
        <div className={styles.readinessLabel}>
          <Sparkles size={14} />
          Content: {doneCount}/{totalCount} klaar
        </div>
        <div className={styles.checklistGrid}>
          {checklist.map((item) => (
            <ChecklistItem
              key={item.subtype}
              label={item.label}
              status={item.status}
            />
          ))}
        </div>
      </div>

      {/* CTA buttons */}
      <div className={styles.heroCta}>
        <button
          className={styles.ctaPrimary}
          onClick={(e) => {
            e.stopPropagation();
            navigate(contentUrl);
          }}
        >
          <Zap size={16} />
          Content genereren
        </button>
        <button
          className={styles.ctaSecondary}
          onClick={(e) => {
            e.stopPropagation();
            navigate(matchUrl);
          }}
        >
          Wedstrijd bekijken
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
