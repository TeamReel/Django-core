/**
 * SeasonMatchesTab — premium expandable card layout for matches.
 *
 * Sorted newest-first with the active match pinned at top.
 * Each card: date badge + title + mini status indicators + chevron.
 * Expanded: lineup status, content breakdown (lazy-loaded), actions.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plus, CalendarDays,
} from 'lucide-react';
import { logger } from '@/utils/logger';
import { Card } from '@django-core/design-system';
import { api } from '@/api';
import type { MediaItem } from '@/types/api/media';
import type { ContentItem } from '@/types/api/content';
import { periodPathKey } from '../../utils/periodPath';
import { CONTENT_TYPES } from '../../components/matchWizardTypes';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import MatchCard from './MatchCard';
import styles from './SeasonMatchesTab.module.css';

/** Metadata nested on a match — lineup, score, etc. */
export interface MatchMetadata {
  lineup?: {
    goalkeeper?: (string | null)[];
    player?: (string | null)[];
    formation?: string;
    [key: string]: unknown;
  };
  formation?: string;
  score_home?: number | string;
  score_away?: number | string;
  status?: string;
  venue?: string;
  is_home?: boolean;
  date?: string;
  teamreel?: { match_context?: Record<string, unknown>; [key: string]: unknown };
  [key: string]: unknown;
}

/** Minimal shape for a match/activity record from the API. */
export interface MatchRecord {
  id: string;
  slug?: string;
  title?: string;
  start_time?: string;
  end_time?: string;
  date?: string;
  period_id?: string;
  period?: { id?: string; name?: string } | null;
  project?: { id?: string; name?: string; slug?: string; club_name?: string } | null;
  opponent_project?: { id?: string; name?: string; slug?: string; club_name?: string } | null;
  metadata?: MatchMetadata;
  [key: string]: unknown;
}

// ── Types ────────────────────────────────────────────────────────────────────────

export interface SeasonMatchesTabProps {
  matches: MatchRecord[];
  matchesLoading: boolean;
  isTeamRoute: boolean;
  seasonsBasePath: string;
  seasonPathKey: string;
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;
  apiBaseUrl: string;
  matchDisplayTitle: (m: MatchRecord) => string;
  setIsCreateMatchModalOpen: (v: boolean) => void;
  setSelectedDetailMatch: (m: MatchRecord) => void;
  setIsMatchDetailModalOpen: (v: boolean) => void;
  setSelectedEditMatch: (m: MatchRecord) => void;
  setIsMatchEditModalOpen: (v: boolean) => void;
  setMatches: React.Dispatch<React.SetStateAction<MatchRecord[]>>;
}

// Total content items defined in matchWizardTypes CONTENT_TYPES
const ALL_CONTENT_ITEMS = [...CONTENT_TYPES.pre, ...CONTENT_TYPES.during, ...CONTENT_TYPES.post];
const CONTENT_TOTAL = ALL_CONTENT_ITEMS.length;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build the link path for a match. */
function getMatchPath(
  match: MatchRecord, isTeamRoute: boolean, seasonsBasePath: string, seasonPathKey: string,
): string {
  const compId = String(match.period_id || match.period?.id || match.period || '').trim();
  const compKey = periodPathKey(match.period || null) || compId;
  const matchKey = match.slug || match.id;
  return isTeamRoute
    ? `${seasonsBasePath}/${seasonPathKey}/${compKey}/${String(matchKey)}`
    : `/matches/${String(matchKey)}`;
}

/** Extract lineup data from match metadata (available on list API). */
function getLineupInfo(match: MatchRecord) {
  const lineup = match.metadata?.lineup;
  if (!lineup) return { filled: false, count: 0, formation: '' };
  const gk = lineup.goalkeeper?.filter(Boolean) || [];
  const players = lineup.player?.filter(Boolean) || [];
  const count = gk.length + players.length;
  const formation = lineup.formation || match.metadata?.formation || '';
  return { filled: count > 0, count, formation };
}

/** Get score display from metadata. */
function getScoreDisplay(match: MatchRecord): string | null {
  const meta = match.metadata;
  if (!meta) return null;
  const home = meta.score_home ?? meta.teamreel?.match_context?.score_home;
  const away = meta.score_away ?? meta.teamreel?.match_context?.score_away;
  if (home != null && away != null) return `${home}-${away}`;
  return null;
}

/** Get match status label. */
function getMatchStatus(match: MatchRecord): 'upcoming' | 'live' | 'finished' {
  const status = String(match.metadata?.status || 'scheduled').toLowerCase();
  if (status === 'finished' || status === 'completed') return 'finished';
  if (status === 'live' || status === 'in_progress') return 'live';
  return 'upcoming';
}

/** Sort all matches newest-first by date. */
function sortMatchesByDate(matches: MatchRecord[]): MatchRecord[] {
  return [...matches].sort((a, b) => {
    const da = a.start_time ? new Date(a.start_time).getTime() : 0;
    const db = b.start_time ? new Date(b.start_time).getTime() : 0;
    return db - da;
  });
}

// ── Content detail cache (lazy-loaded) ───────────────────────────────────────

interface ContentDetail {
  mediaCount: number;
  generatingCount: number;
  totalChecked: number;
  /** Subtypes that have generated media. */
  mediaSubtypes: string[];
  /** Subtypes currently generating. */
  generatingSubtypes: string[];
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
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const fetchedRef = useRef<Set<string>>(new Set());

  // Fetch active match from backend on mount
  useEffect(() => {
    getActiveContext()
      .then((ctx) => {
        const mid = ctx?.match?.id;
        if (mid) setActiveMatchId(String(mid));
      })
      .catch(() => {/* ignore */});
  }, []);

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
      const [mediaData, contentData] = await Promise.all([
        api.get<{ results?: MediaItem[]; count?: number }>(`/media/items/?activity=${matchId}&page_size=100`),
        api.get<{ results?: ContentItem[]; count?: number }>(`/content-generation/items/?activity=${matchId}&page_size=100`),
      ]);

      let mediaCount = 0;
      let generatingCount = 0;
      const mediaSubtypes: string[] = [];
      const generatingSubtypes: string[] = [];

      {
        const mediaObj = mediaData as Record<string, unknown>;
        const items = mediaData?.results || (mediaObj?.data as Record<string, unknown>)?.results as MediaItem[] || [];
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
        mediaSubtypes.push(...subtypes);
      }

      {
        const contentObj = contentData as Record<string, unknown>;
        const innerData = contentObj?.data as Record<string, unknown> | undefined;
        const items = (innerData?.results as ContentItem[]) || contentData?.results || (innerData as unknown as ContentItem[]) || [];
        for (const item of (Array.isArray(items) ? items : [])) {
          if (['queued', 'generating'].includes(item.status)) {
            generatingCount++;
            const itemRec = item as unknown as Record<string, unknown>;
            const sub = (itemRec.template_subtype as string) || (itemRec.subtype as string) || '';
            if (sub && !generatingSubtypes.includes(sub)) generatingSubtypes.push(sub);
          }
        }
      }

      setContentCache((prev) => ({
        ...prev,
        [matchId]: { mediaCount, generatingCount, totalChecked: CONTENT_TOTAL, mediaSubtypes, generatingSubtypes },
      }));
    } catch (err) {
      logger.error('Error loading content status', err);
    } finally {
      setLoadingContent((prev) => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });
    }
  }, [apiBaseUrl]);

  // Sort matches: newest first, active match pinned at top
  const sorted = sortMatchesByDate(matches);
  const activeMatch = activeMatchId ? sorted.find((m) => String(m.id) === activeMatchId) : null;
  const restMatches = activeMatch ? sorted.filter((m) => String(m.id) !== activeMatchId) : sorted;

  /** Set a match as the active match (persisted to backend). */
  const handleSetActive = useCallback(async (matchId: string) => {
    const newId = activeMatchId === matchId ? null : matchId;
    setActiveMatchId(newId);
    try {
      if (newId) {
        await setActiveContext('match', newId);
      } else {
        await setActiveContext('clear');
      }
    } catch {
      // Revert on failure
      setActiveMatchId(activeMatchId);
    }
  }, [activeMatchId]);

  // ── Render ───────────────────────────────────────────────────────────

  if (matchesLoading) {
    return (
      <Card>
        <div className={styles.sectionPad}>
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
      <div className={styles.sectionPad}>
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
            {/* Active match pinned at top */}
            {activeMatch && (
              <>
                <div className={styles.sectionLabel}>
                  Actieve match
                </div>
                <MatchCard
                  key={`active-${activeMatch.id}`}
                  match={activeMatch}
                  expanded={expandedIds.has(String(activeMatch.id))}
                  onToggle={() => {
                    toggleExpanded(String(activeMatch.id));
                    fetchContentStatus(String(activeMatch.id));
                  }}
                  contentDetail={contentCache[String(activeMatch.id)]}
                  contentLoading={loadingContent.has(String(activeMatch.id))}
                  matchDisplayTitle={matchDisplayTitle}
                  matchPath={getMatchPath(activeMatch, isTeamRoute, seasonsBasePath, seasonPathKey)}
                  isActive={true}
                  onSetActive={() => handleSetActive(String(activeMatch.id))}
                />
              </>
            )}

            {/* All other matches — newest first */}
            {restMatches.length > 0 && (
              <>
                <div className={styles.sectionLabel}>
                  {activeMatch ? 'Overige matches' : 'Alle matches'} ({restMatches.length})
                </div>
                {restMatches.map((match) => (
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
                    isActive={false}
                    onSetActive={() => handleSetActive(String(match.id))}
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

export default SeasonMatchesTab;
