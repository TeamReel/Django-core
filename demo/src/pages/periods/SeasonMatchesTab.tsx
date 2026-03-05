/**
 * SeasonMatchesTab — premium expandable card layout for matches.
 *
 * Shows matches sorted by: upcoming first, then played (most recent).
 * Each card: date badge + title + mini status indicators + chevron.
 * Expanded: lineup status, content progress (lazy-loaded), actions.
 */
import React, { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight, Plus, Users, Clapperboard, CalendarDays,
  MapPin, CheckCircle2, Circle, Loader2, Zap, Eye,
} from 'lucide-react';
import { Card } from '@django-core/design-system';
import { periodPathKey } from '../../utils/periodPath';
import { CONTENT_TYPES } from '../../components/matchWizardTypes';
import styles from './SeasonMatchesTab.module.css';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SeasonMatchesTabProps {
  matches: any[];
  matchesLoading: boolean;
  isTeamRoute: boolean;
  seasonsBasePath: string;
  seasonPathKey: string;
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;
  apiBaseUrl: string;
  matchDisplayTitle: (m: any) => string;
  setIsCreateMatchModalOpen: (v: boolean) => void;
  setSelectedDetailMatch: (m: any) => void;
  setIsMatchDetailModalOpen: (v: boolean) => void;
  setSelectedEditMatch: (m: any) => void;
  setIsMatchEditModalOpen: (v: boolean) => void;
  setMatches: React.Dispatch<React.SetStateAction<any[]>>;
}

// Total content items defined in matchWizardTypes CONTENT_TYPES
const ALL_CONTENT_ITEMS = [...CONTENT_TYPES.pre, ...CONTENT_TYPES.during, ...CONTENT_TYPES.post];
const CONTENT_TOTAL = ALL_CONTENT_ITEMS.length;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build the link path for a match. */
function getMatchPath(
  match: any, isTeamRoute: boolean, seasonsBasePath: string, seasonPathKey: string,
): string {
  const compId = String(match.period_id || match.period?.id || match.period || '').trim();
  const compKey = periodPathKey(match.period || null) || compId;
  const matchKey = match.slug || match.id;
  return isTeamRoute
    ? `${seasonsBasePath}/${seasonPathKey}/${compKey}/${String(matchKey)}`
    : `/matches/${String(matchKey)}`;
}

/** Extract lineup data from match metadata (available on list API). */
function getLineupInfo(match: any) {
  const lineup = match.metadata?.lineup;
  if (!lineup) return { filled: false, count: 0, formation: '' };
  const gk = lineup.goalkeeper?.filter(Boolean) || [];
  const players = lineup.player?.filter(Boolean) || [];
  const count = gk.length + players.length;
  const formation = lineup.formation || match.metadata?.formation || '';
  return { filled: count > 0, count, formation };
}

/** Get score display from metadata. */
function getScoreDisplay(match: any): string | null {
  const meta = match.metadata;
  if (!meta) return null;
  const home = meta.score_home ?? meta.teamreel?.match_context?.score_home;
  const away = meta.score_away ?? meta.teamreel?.match_context?.score_away;
  if (home != null && away != null) return `${home}-${away}`;
  return null;
}

/** Get match status label. */
function getMatchStatus(match: any): 'upcoming' | 'live' | 'finished' {
  const status = String(match.metadata?.status || 'scheduled').toLowerCase();
  if (status === 'finished' || status === 'completed') return 'finished';
  if (status === 'live' || status === 'in_progress') return 'live';
  return 'upcoming';
}

/** Sort: upcoming first (ascending by date), then finished (descending by date). */
function sortMatches(matches: any[]): { upcoming: any[]; played: any[] } {
  const upcoming: any[] = [];
  const played: any[] = [];

  for (const m of matches) {
    const status = getMatchStatus(m);
    if (status === 'finished') {
      played.push(m);
    } else {
      upcoming.push(m);
    }
  }

  upcoming.sort((a, b) => {
    const da = a.start_time ? new Date(a.start_time).getTime() : Infinity;
    const db = b.start_time ? new Date(b.start_time).getTime() : Infinity;
    return da - db;
  });

  played.sort((a, b) => {
    const da = a.start_time ? new Date(a.start_time).getTime() : 0;
    const db = b.start_time ? new Date(b.start_time).getTime() : 0;
    return db - da;
  });

  return { upcoming, played };
}

// ── Content detail cache (lazy-loaded) ───────────────────────────────────────

interface ContentDetail {
  mediaCount: number;
  generatingCount: number;
  totalChecked: number;
}

// ── Component ────────────────────────────────────────────────────────────────

const SeasonMatchesTab: React.FC<SeasonMatchesTabProps> = ({
  matches,
  matchesLoading,
  isTeamRoute,
  seasonsBasePath,
  seasonPathKey,
  userCanEditProject,
  apiBaseUrl,
  matchDisplayTitle,
  setIsCreateMatchModalOpen,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [contentCache, setContentCache] = useState<Record<string, ContentDetail>>({});
  const [loadingContent, setLoadingContent] = useState<Set<string>>(new Set());
  const fetchedRef = useRef<Set<string>>(new Set());

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /** Lazy-load content/media status when a card is expanded. */
  const fetchContentStatus = useCallback(async (matchId: string) => {
    if (fetchedRef.current.has(matchId)) return;
    fetchedRef.current.add(matchId);
    setLoadingContent((prev) => new Set(prev).add(matchId));

    try {
      const [mediaRes, contentRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/media/items/?activity=${matchId}&page_size=100`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }),
        fetch(`${apiBaseUrl}/api/v1/content-generation/items/?activity=${matchId}&page_size=100`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }),
      ]);

      let mediaCount = 0;
      let generatingCount = 0;

      if (mediaRes.ok) {
        const data = await mediaRes.json();
        const items = data?.results || data?.data?.results || [];
        // Count unique subtypes that have media
        const subtypes = new Set<string>();
        for (const item of (Array.isArray(items) ? items : [])) {
          const sub = (item.extraction_metadata?.asset_type as string) || 'other';
          let normalized = sub.replace(/_[a-f0-9]{8}$/i, '');
          if (normalized === 'goal_celebration') normalized = 'goal';
          if (normalized === 'match_flyer') normalized = 'flyer';
          subtypes.add(normalized);
        }
        mediaCount = subtypes.size;
      }

      if (contentRes.ok) {
        const data = await contentRes.json();
        const items = data?.data?.results || data?.results || data?.data || [];
        for (const item of (Array.isArray(items) ? items : [])) {
          if (['queued', 'generating'].includes(item.status)) generatingCount++;
        }
      }

      setContentCache((prev) => ({
        ...prev,
        [matchId]: { mediaCount, generatingCount, totalChecked: CONTENT_TOTAL },
      }));
    } catch (err) {
      console.error('[MatchContent] Error loading content status:', err);
    } finally {
      setLoadingContent((prev) => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });
    }
  }, [apiBaseUrl]);

  // Sort matches
  const { upcoming, played } = sortMatches(matches);

  // ── Render ───────────────────────────────────────────────────────────

  if (matchesLoading) {
    return (
      <Card>
        <div style={{ padding: '12px' }}>
          <div className={styles.header}>
            <div className={styles.title}>Matches</div>
          </div>
          <div className={styles.loadingSkeleton}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skeletonRow} />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ padding: '12px' }}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <span className={styles.title}>Matches</span>
            {matches.length > 0 && (
              <span className={styles.matchCount}> ({matches.length})</span>
            )}
          </div>
          {userCanEditProject && (
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.addBtn}`}
              onClick={() => setIsCreateMatchModalOpen(true)}
            >
              <Plus size={14} /> Toevoegen
            </button>
          )}
        </div>

        {matches.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <CalendarDays size={32} />
            </div>
            <div className={styles.emptyTitle}>Geen matches gevonden</div>
            <div className={styles.emptySubtitle}>
              Voeg een match toe om te beginnen met content genereren.
            </div>
          </div>
        ) : (
          <>
            {/* Upcoming section */}
            {upcoming.length > 0 && (
              <>
                <div className={styles.sectionLabel}>
                  Aankomend ({upcoming.length})
                </div>
                {upcoming.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    expanded={expandedIds.has(String(match.id))}
                    onToggle={() => {
                      toggleExpanded(String(match.id));
                      fetchContentStatus(String(match.id));
                    }}
                    contentDetail={contentCache[String(match.id)]}
                    contentLoading={loadingContent.has(String(match.id))}
                    matchDisplayTitle={matchDisplayTitle}
                    matchPath={getMatchPath(match, isTeamRoute, seasonsBasePath, seasonPathKey)}
                  />
                ))}
              </>
            )}

            {/* Played section */}
            {played.length > 0 && (
              <>
                <div className={styles.sectionLabel}>
                  Gespeeld ({played.length})
                </div>
                {played.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    expanded={expandedIds.has(String(match.id))}
                    onToggle={() => {
                      toggleExpanded(String(match.id));
                      fetchContentStatus(String(match.id));
                    }}
                    contentDetail={contentCache[String(match.id)]}
                    contentLoading={loadingContent.has(String(match.id))}
                    matchDisplayTitle={matchDisplayTitle}
                    matchPath={getMatchPath(match, isTeamRoute, seasonsBasePath, seasonPathKey)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

// ── Match Card ───────────────────────────────────────────────────────────────

interface MatchCardProps {
  match: any;
  expanded: boolean;
  onToggle: () => void;
  contentDetail?: ContentDetail;
  contentLoading: boolean;
  matchDisplayTitle: (m: any) => string;
  matchPath: string;
}

const MatchCard: React.FC<MatchCardProps> = ({
  match, expanded, onToggle, contentDetail, contentLoading, matchDisplayTitle, matchPath,
}) => {
  const date = match.start_time ? new Date(match.start_time) : null;
  const lineup = getLineupInfo(match);
  const score = getScoreDisplay(match);
  const matchLocation = match.location || match.metadata?.venue || '';
  const competition = match.period?.name || '';

  const metaParts: string[] = [];
  if (date) {
    metaParts.push(date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }));
  }
  if (matchLocation) metaParts.push(matchLocation);
  if (competition) metaParts.push(competition);

  return (
    <div className={styles.card} data-expanded={expanded}>
      {/* Header row — always visible */}
      <div className={styles.cardHeader} onClick={onToggle}>
        {/* Date badge */}
        {date ? (
          <div className={styles.dateBadge}>
            <div className={styles.dateDay}>{date.getDate()}</div>
            <div className={styles.dateMonth}>
              {date.toLocaleDateString('nl-NL', { month: 'short' })}
            </div>
          </div>
        ) : (
          <div className={styles.dateBadge}>
            <div className={styles.dateDay}>—</div>
          </div>
        )}

        {/* Title + meta */}
        <div className={styles.cardInfo}>
          <div className={styles.matchTitle}>{matchDisplayTitle(match)}</div>
          <div className={styles.matchMeta}>{metaParts.join(' · ') || '—'}</div>
        </div>

        {/* Mini indicators */}
        <div className={styles.indicators}>
          {/* Lineup indicator */}
          <div className={styles.indicatorLineup} data-ready={lineup.filled} title={lineup.filled ? `Opstelling: ${lineup.count} spelers` : 'Geen opstelling'}>
            <Users size={12} />
          </div>

          {/* Score (if played) */}
          {score && <div className={styles.scoreBadge}>{score}</div>}
        </div>

        {/* Chevron */}
        <ChevronRight size={16} className={styles.chevron} data-expanded={expanded} />
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className={styles.cardBody}>
          {/* Lineup status */}
          <div className={styles.statusRow}>
            <div className={lineup.filled ? styles.statusIconGreen : styles.statusIconMuted}>
              {lineup.filled ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            </div>
            <div className={styles.statusInfo}>
              <div className={styles.statusLabel}>Opstelling</div>
              <div className={styles.statusDetail}>
                {lineup.filled
                  ? `${lineup.count} spelers${lineup.formation ? ` · ${lineup.formation}` : ''}`
                  : 'Nog niet ingevuld'}
              </div>
            </div>
          </div>

          {/* Content status (lazy loaded) */}
          <div className={styles.statusRow}>
            {contentLoading ? (
              <>
                <div className={styles.statusIconBlue}>
                  <Loader2 size={14} className={styles.spin} />
                </div>
                <div className={styles.statusInfo}>
                  <div className={styles.statusLabel}>Content</div>
                  <div className={styles.statusDetail}>Laden...</div>
                </div>
              </>
            ) : contentDetail ? (
              <>
                <div className={contentDetail.mediaCount > 0 ? styles.statusIconGreen : styles.statusIconMuted}>
                  <Clapperboard size={14} />
                </div>
                <div className={styles.statusInfo}>
                  <div className={styles.statusLabel}>Content</div>
                  <div className={styles.statusDetail}>
                    {contentDetail.mediaCount} / {contentDetail.totalChecked} gegenereerd
                    {contentDetail.generatingCount > 0 && ` · ${contentDetail.generatingCount} bezig`}
                  </div>
                  <div className={styles.contentProgressBar}>
                    <div
                      className={styles.contentProgressFill}
                      style={{ width: `${Math.round((contentDetail.mediaCount / contentDetail.totalChecked) * 100)}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className={styles.statusIconMuted}>
                  <Clapperboard size={14} />
                </div>
                <div className={styles.statusInfo}>
                  <div className={styles.statusLabel}>Content</div>
                  <div className={styles.statusDetail}>Tik om status te laden</div>
                </div>
              </>
            )}
          </div>

          {/* Match info */}
          {(matchLocation || competition) && (
            <div className={styles.statusRow}>
              <div className={styles.statusIconMuted}>
                <MapPin size={14} />
              </div>
              <div className={styles.statusInfo}>
                <div className={styles.statusLabel}>Details</div>
                <div className={styles.statusDetail}>
                  {[matchLocation, competition].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <Link to={matchPath} className={styles.actionBtn}>
              <Eye size={14} /> Bekijk
            </Link>
            <button
              type="button"
              className={styles.actionBtnPrimary}
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('teamreel:open-quick-create', {
                  detail: { matchId: String(match.id) },
                }));
              }}
            >
              <Zap size={14} /> Content
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonMatchesTab;
